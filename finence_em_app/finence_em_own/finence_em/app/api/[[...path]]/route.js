import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import dns from 'node:dns'
import { v4 as uuidv4 } from 'uuid'
import jwt from 'jsonwebtoken'
import { getMongoConnectionUrl } from '../../../lib/mongo-url.js'
import { aiCategorize, generateAiInsights, chatFinance, checkAffordability, simulateLifeScenario, parseReceipt, parseStatement, detectSubscriptions } from '../../../lib/gemini.js'
import { getAuthenticatedUserId } from '../../../lib/session.js'
import { filename, filterTransactions, makeReport, reportCsv, reportPdf, reportXlsx } from '../../../lib/reports.js'
import { generateNotifications } from '../../../lib/notifications.js'


const JWT_SECRET = process.env.JWT_SECRET || 'finwise-secret-key-12345'

const mongoDnsServers = (process.env.MONGO_DNS_SERVERS || '1.1.1.1,8.8.8.8')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean)

try {
  dns.setServers(mongoDnsServers)
} catch (error) {
  console.error('[DNS] Invalid MONGO_DNS_SERVERS configuration:', error.message)
}

// Allow larger file uploads (PDFs/images) - Next.js default is ~1MB
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb',
    },
  },
}

// -------------- DB --------------
let cachedClient = null
async function getDb() {
  if (!cachedClient) {
    const client = new MongoClient(await getMongoConnectionUrl())
    try {
      await client.connect()
      cachedClient = client
    } catch (error) {
      try {
        await client.close()
      } catch (closeError) {
        console.error('[Database] Failed to close MongoDB client after connection error:', closeError.message)
      }
      throw error
    }
  }
  const dbName = process.env.DB_NAME && process.env.DB_NAME !== 'your_database_name'
    ? process.env.DB_NAME
    : 'finwise'
  return cachedClient.db(dbName)
}

function getUserId(request) {
  try {
    const tokenObj = request.cookies.get('token')
    if (tokenObj?.value) {
      const decoded = jwt.verify(tokenObj.value, JWT_SECRET)
      if (decoded?.userId) {
        return decoded.userId
      }
    }
  } catch (err) {
    // JWT verification failed, fallback to header or demo user
  }

  const uid = request.headers.get('x-user-id')
  return uid || 'demo-user'
}

function json(data, status = 200) {
  return NextResponse.json(data, { status })
}

// -------------- Helpers --------------
function ymd(d) {
  const dt = new Date(d)
  return dt.toISOString().slice(0, 10)
}
function ym(d) {
  const dt = new Date(d)
  return dt.toISOString().slice(0, 7)
}
function daysBetween(a, b) {
  return Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000) + 1)
}
function sum(arr) { return arr.reduce((s, x) => s + x, 0) }
function mean(arr) { return arr.length ? sum(arr) / arr.length : 0 }
function stddev(arr) {
  if (arr.length < 2) return 0
  const m = mean(arr)
  return Math.sqrt(mean(arr.map(x => (x - m) ** 2)))
}
function round(n, d = 2) { return Math.round(n * 10 ** d) / 10 ** d }

// -------------- Financial Analysis Engine --------------
function analyzeFinance(transactions, budgetMap) {
  transactions = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date))

  const incomes = transactions.filter(t => t.type === 'income')
  const expenses = transactions.filter(t => t.type === 'expense')

  const totalIncome = round(sum(incomes.map(t => t.amount)))
  const totalExpense = round(sum(expenses.map(t => t.amount)))
  const currentBalance = round(totalIncome - totalExpense)
  const savings = round(totalIncome - totalExpense)
  const savingsRate = totalIncome > 0 ? round((savings / totalIncome) * 100, 1) : 0

  // Category breakdown (expenses)
  const catMap = {}
  for (const t of expenses) {
    catMap[t.category] = (catMap[t.category] || 0) + t.amount
  }
  const catEntries = Object.entries(catMap).map(([category, amount]) => ({ category, amount: round(amount) }))
  catEntries.sort((a, b) => b.amount - a.amount)
  const highestCategory = catEntries[0] || null
  const lowestCategory = catEntries[catEntries.length - 1] || null

  // Time range
  const firstDate = transactions.length ? transactions[0].date : new Date().toISOString()
  const lastDate = transactions.length ? transactions[transactions.length - 1].date : new Date().toISOString()
  const spanDays = daysBetween(firstDate, lastDate)
  const dailyAvg = round(totalExpense / spanDays)
  const weeklyAvg = round(dailyAvg * 7)

  // Monthly trend
  const monthMap = {}
  for (const t of transactions) {
    const m = ym(t.date)
    if (!monthMap[m]) monthMap[m] = { month: m, income: 0, expense: 0 }
    if (t.type === 'income') monthMap[m].income += t.amount
    else monthMap[m].expense += t.amount
  }
  const monthlyTrend = Object.values(monthMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(m => ({
      month: m.month,
      income: round(m.income),
      expense: round(m.expense),
      savings: round(m.income - m.expense),
    }))

  // Daily series (last 30 days)
  const dailyMap = {}
  for (const t of expenses) {
    const k = ymd(t.date)
    dailyMap[k] = (dailyMap[k] || 0) + t.amount
  }
  const dailySeries = Object.entries(dailyMap)
    .map(([date, amount]) => ({ date, amount: round(amount) }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Detection
  const expenseAmts = expenses.map(t => t.amount)
  const expMean = mean(expenseAmts)
  const expStd = stddev(expenseAmts)

  const largeTransactions = expenses
    .filter(t => t.amount > Math.max(expMean * 2.5, expMean + 2 * expStd))
    .map(t => ({ id: t.id, category: t.category, amount: round(t.amount), date: ymd(t.date), description: t.description }))

  // Duplicates: same amount + category + within 2 days
  const duplicates = []
  for (let i = 0; i < expenses.length; i++) {
    for (let j = i + 1; j < expenses.length; j++) {
      const a = expenses[i], b = expenses[j]
      if (a.amount === b.amount && a.category === b.category) {
        const diff = Math.abs(new Date(a.date) - new Date(b.date)) / 86400000
        if (diff <= 2) {
          duplicates.push({
            amount: round(a.amount), category: a.category,
            dates: [ymd(a.date), ymd(b.date)],
            description: a.description,
          })
        }
      }
    }
  }

  // Recurring subscriptions: same description+amount appearing in 2+ different months
  const recurringMap = {}
  for (const t of expenses) {
    const key = `${(t.description || '').toLowerCase().trim()}|${t.amount}`
    if (!key.startsWith('|')) {
      if (!recurringMap[key]) recurringMap[key] = { months: new Set(), category: t.category, amount: t.amount, description: t.description }
      recurringMap[key].months.add(ym(t.date))
    }
  }
  const recurringSubscriptions = Object.values(recurringMap)
    .filter(r => r.months.size >= 2)
    .map(r => ({
      description: r.description,
      category: r.category,
      amount: round(r.amount),
      months: [...r.months].sort(),
      occurrences: r.months.size,
    }))

  // Unusual spending: amount > mean + 3*std
  const unusualSpending = expenses
    .filter(t => expStd > 0 && t.amount > expMean + 3 * expStd)
    .map(t => ({ id: t.id, amount: round(t.amount), category: t.category, date: ymd(t.date), description: t.description }))

  // Sudden spending spike: last 7 days vs previous 7 days
  const now = new Date()
  const last7 = sum(expenses.filter(t => (now - new Date(t.date)) / 86400000 <= 7).map(t => t.amount))
  const prev7 = sum(expenses.filter(t => {
    const d = (now - new Date(t.date)) / 86400000
    return d > 7 && d <= 14
  }).map(t => t.amount))
  const spikePct = prev7 > 0 ? round(((last7 - prev7) / prev7) * 100, 1) : 0
  const spendingSpike = {
    last7Days: round(last7),
    previous7Days: round(prev7),
    changePercent: spikePct,
    detected: spikePct > 30,
  }

  // Budget analysis
  const budgetAnalysis = []
  for (const [category, limit] of Object.entries(budgetMap || {})) {
    const spent = round(catMap[category] || 0)
    const usage = limit > 0 ? round((spent / limit) * 100, 1) : 0
    budgetAnalysis.push({
      category,
      budget: round(limit),
      spent,
      remaining: round(limit - spent),
      usagePercent: usage,
      status: usage >= 100 ? 'over' : usage >= 80 ? 'warning' : 'ok',
    })
  }
  budgetAnalysis.sort((a, b) => b.usagePercent - a.usagePercent)

  // -------------- Financial Health Score --------------
  // Income stability (0-20): based on CV of monthly income (lower = better)
  let incomeStabilityScore = 10
  const incomeSeries = monthlyTrend.map(m => m.income).filter(x => x > 0)
  if (incomeSeries.length >= 2) {
    const cv = stddev(incomeSeries) / (mean(incomeSeries) || 1)
    incomeStabilityScore = Math.max(0, Math.min(20, Math.round(20 * (1 - Math.min(cv, 1)))))
  } else if (incomeSeries.length === 1) {
    incomeStabilityScore = 14
  } else {
    incomeStabilityScore = 0
  }

  // Savings rate (0-20)
  let savingsRateScore = 0
  if (savingsRate >= 30) savingsRateScore = 20
  else if (savingsRate >= 20) savingsRateScore = 17
  else if (savingsRate >= 10) savingsRateScore = 12
  else if (savingsRate >= 0) savingsRateScore = 6
  else savingsRateScore = 0

  // Expense control (0-15)
  let expenseControlScore = 0
  const expRatio = totalIncome > 0 ? totalExpense / totalIncome : 1
  if (expRatio <= 0.5) expenseControlScore = 15
  else if (expRatio <= 0.7) expenseControlScore = 12
  else if (expRatio <= 0.85) expenseControlScore = 8
  else if (expRatio <= 1) expenseControlScore = 4
  else expenseControlScore = 0

  // Budget adherence (0-15)
  let budgetAdherenceScore = 8
  if (budgetAnalysis.length) {
    const withinCount = budgetAnalysis.filter(b => b.status !== 'over').length
    budgetAdherenceScore = Math.round((withinCount / budgetAnalysis.length) * 15)
  }

  // Emergency fund (0-15): balance vs avg monthly expense
  let emergencyFundScore = 0
  const avgMonthlyExpense = monthlyTrend.length ? mean(monthlyTrend.map(m => m.expense)) : (totalExpense / Math.max(1, spanDays / 30))
  const monthsCovered = avgMonthlyExpense > 0 ? currentBalance / avgMonthlyExpense : 0
  if (monthsCovered >= 6) emergencyFundScore = 15
  else if (monthsCovered >= 3) emergencyFundScore = 11
  else if (monthsCovered >= 1) emergencyFundScore = 6
  else if (monthsCovered > 0) emergencyFundScore = 3
  else emergencyFundScore = 0

  // Debt ratio (0-15): treat 'Loan/EMI' category as debt
  const debtPayments = round(catMap['Loan/EMI'] || catMap['EMI'] || catMap['Debt'] || 0)
  const debtRatio = totalIncome > 0 ? debtPayments / totalIncome : 0
  let debtRatioScore = 0
  if (debtRatio === 0) debtRatioScore = 15
  else if (debtRatio <= 0.1) debtRatioScore = 13
  else if (debtRatio <= 0.2) debtRatioScore = 10
  else if (debtRatio <= 0.35) debtRatioScore = 6
  else if (debtRatio <= 0.5) debtRatioScore = 3
  else debtRatioScore = 0

  const healthScore = incomeStabilityScore + savingsRateScore + expenseControlScore +
                      budgetAdherenceScore + emergencyFundScore + debtRatioScore
  const healthGrade =
    healthScore >= 85 ? 'Excellent' :
    healthScore >= 70 ? 'Good' :
    healthScore >= 55 ? 'Fair' :
    healthScore >= 40 ? 'Weak' : 'Critical'

  // -------------- Predictions --------------
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const dayOfMonth = today.getDate()
  const currentMonthKey = ym(today.toISOString())
  const cm = monthMap[currentMonthKey] || { income: 0, expense: 0 }
  const dailyPace = dayOfMonth > 0 ? cm.expense / dayOfMonth : 0
  const expectedMonthlyExpense = round(dailyPace * daysInMonth)
  const expectedMonthlyIncome = round(cm.income * (daysInMonth / Math.max(1, dayOfMonth)))
  const expectedSavings = round(expectedMonthlyIncome - expectedMonthlyExpense)
  const endOfMonthBalance = round(currentBalance + (expectedMonthlyIncome - cm.income) - (expectedMonthlyExpense - cm.expense))

  // -------------- Risks --------------
  const risks = []
  if (expRatio > 1) risks.push({ type: 'Overspending', severity: 'high', message: 'You are spending more than you earn.' })
  else if (expRatio > 0.9) risks.push({ type: 'Overspending', severity: 'medium', message: 'Expenses are consuming over 90% of income.' })

  if (currentBalance < avgMonthlyExpense * 0.5 && avgMonthlyExpense > 0)
    risks.push({ type: 'Low Balance', severity: 'high', message: 'Balance is less than half of monthly expenses.' })

  if (spendingSpike.detected)
    risks.push({ type: 'Sudden Spending Spike', severity: 'medium', message: `Spending up ${spikePct}% vs last week.` })

  const shoppingSpend = catMap['Shopping'] || 0
  if (totalExpense > 0 && shoppingSpend / totalExpense > 0.25)
    risks.push({ type: 'Heavy Shopping', severity: 'medium', message: `Shopping is ${round((shoppingSpend / totalExpense) * 100, 1)}% of total spend.` })

  const atmCount = expenses.filter(t => /atm|withdraw/i.test(`${t.category} ${t.description || ''}`)).length
  if (atmCount >= 4) risks.push({ type: 'Frequent ATM Withdrawals', severity: 'low', message: `${atmCount} ATM/cash withdrawals detected.` })

  if (monthlyTrend.length >= 2) {
    const lastM = monthlyTrend[monthlyTrend.length - 1]
    if (lastM.savings < 0) risks.push({ type: 'Cash Flow Issue', severity: 'high', message: `Negative cash flow in ${lastM.month}.` })
  }

  // -------------- Recommendations --------------
  const recommendations = []
  if (savingsRate < 20) recommendations.push({ title: 'Boost your savings rate', detail: `Aim for at least 20% savings. Current: ${savingsRate}%.` })
  if (highestCategory && totalExpense > 0 && highestCategory.amount / totalExpense > 0.3)
    recommendations.push({ title: `Reduce spending on ${highestCategory.category}`, detail: `This category alone is ${round((highestCategory.amount / totalExpense) * 100, 1)}% of your expenses.` })
  if (monthsCovered < 3)
    recommendations.push({ title: 'Build an emergency fund', detail: `You have ~${round(monthsCovered, 1)} months of expenses covered. Target 3-6 months.` })
  if (recurringSubscriptions.length >= 3)
    recommendations.push({ title: 'Audit your subscriptions', detail: `${recurringSubscriptions.length} recurring charges detected. Cancel unused ones.` })
  if (budgetAnalysis.some(b => b.status === 'over'))
    recommendations.push({ title: 'Review over-budget categories', detail: `You exceeded budget in ${budgetAnalysis.filter(b => b.status === 'over').map(b => b.category).join(', ')}.` })
  if (currentBalance > avgMonthlyExpense * 6 && avgMonthlyExpense > 0)
    recommendations.push({ title: 'Invest idle money', detail: 'You have more than 6 months of expenses in cash. Consider low-risk investments.' })
  if (debtRatio > 0.35)
    recommendations.push({ title: 'High debt burden', detail: `Debt payments are ${round(debtRatio * 100, 1)}% of income. Prioritize repayment.` })
  if (recommendations.length === 0)
    recommendations.push({ title: 'You are on track!', detail: 'Keep tracking expenses and reviewing your budget monthly.' })

  // -------------- Dashboard Insights --------------
  const dashboardInsights = []
  if (monthlyTrend.length >= 2) {
    const a = monthlyTrend[monthlyTrend.length - 2]
    const b = monthlyTrend[monthlyTrend.length - 1]
    if (a.expense > 0) {
      const chg = round(((b.expense - a.expense) / a.expense) * 100, 1)
      dashboardInsights.push({
        icon: chg > 0 ? 'trending-up' : 'trending-down',
        tone: chg > 15 ? 'warning' : chg < -5 ? 'success' : 'neutral',
        text: `Spending ${chg >= 0 ? 'increased' : 'decreased'} by ${Math.abs(chg)}% vs last month.`,
      })
    }
  }
  if (savings > 0)
    dashboardInsights.push({ icon: 'piggy-bank', tone: 'success', text: `You saved ₹${savings.toLocaleString('en-IN')} overall.` })
  const overCats = budgetAnalysis.filter(b => b.status === 'over')
  if (overCats.length)
    dashboardInsights.push({ icon: 'alert-triangle', tone: 'warning', text: `${overCats[0].category} exceeded your budget.` })
  if (totalIncome >= totalExpense && totalIncome > 0)
    dashboardInsights.push({ icon: 'shield-check', tone: 'success', text: 'Your income comfortably covers expenses.' })
  if (highestCategory)
    dashboardInsights.push({ icon: 'pie-chart', tone: 'neutral', text: `Top spend: ${highestCategory.category} (₹${highestCategory.amount.toLocaleString('en-IN')}).` })

  return {
    summary: {
      totalIncome, totalExpense, currentBalance, savings, savingsRate,
    },
    spending: {
      highestCategory, lowestCategory,
      dailyAverage: dailyAvg, weeklyAverage: weeklyAvg,
      monthlyTrend, dailySeries,
      categoryBreakdown: catEntries,
    },
    detection: {
      largeTransactions, duplicates, recurringSubscriptions, unusualSpending, spendingSpike,
    },
    budgetAnalysis,
    healthScore: {
      total: healthScore,
      grade: healthGrade,
      breakdown: {
        incomeStability: incomeStabilityScore,
        savingsRate: savingsRateScore,
        expenseControl: expenseControlScore,
        budgetAdherence: budgetAdherenceScore,
        emergencyFund: emergencyFundScore,
        debtRatio: debtRatioScore,
      },
    },
    predictions: {
      endOfMonthBalance, expectedMonthlyExpense, expectedMonthlyIncome, expectedSavings,
    },
    risks,
    recommendations,
    dashboardInsights,
  }
}

// -------------- Routes --------------
async function handle(request, { params }) {
  const method = request.method
  const pathParts = (await params).path || []
  const route = '/' + pathParts.join('/')
  const db = await getDb()
  const userId = getUserId(request)

  try {
    const protectedFeature = route.startsWith('/reports') || route.startsWith('/notifications') || route === '/settings'
    if (protectedFeature) {
      const authenticatedUserId = getAuthenticatedUserId(request)
      if (!authenticatedUserId) return json({ error: 'Authentication required' }, 401)
      if (authenticatedUserId !== userId) return json({ error: 'Authentication required' }, 401)
    }

    if (route.startsWith('/reports/')) {
      if (method !== 'GET') return json({ error: 'Method not allowed' }, 405)
      const type = pathParts[1]
      const allowedTypes = ['monthly-expenses', 'income-vs-expenses', 'category-spending', 'savings', 'yearly-summary']
      if (!allowedTypes.includes(type)) return json({ error: 'Unknown report type' }, 404)
      const url = new URL(request.url)
      const now = new Date()
      const query = {
        month: Number(url.searchParams.get('month') || now.getMonth() + 1),
        year: Number(url.searchParams.get('year') || now.getFullYear()),
        startDate: url.searchParams.get('startDate') || '',
        endDate: url.searchParams.get('endDate') || '',
      }
      const format = (url.searchParams.get('format') || 'csv').toLowerCase()
      if (!['csv', 'pdf', 'excel'].includes(format) || !Number.isInteger(query.year) || query.year < 2000 || query.year > 2100 || !Number.isInteger(query.month) || query.month < 1 || query.month > 12) return json({ error: 'Invalid report parameters' }, 400)
      const transactions = await db.collection('transactions').find({ userId }).toArray()
      const budgetDoc = await db.collection('budgets').findOne({ userId })
      const report = makeReport(type, filterTransactions(transactions, query, type), budgetDoc?.budget || {}, query)
      const headers = { 'Content-Disposition': `attachment; filename="${filename(type, query, format)}"` }
      if (format === 'csv') return new Response(reportCsv(report), { headers: { ...headers, 'Content-Type': 'text/csv; charset=utf-8' } })
      if (format === 'excel') return new Response(await reportXlsx(report), { headers: { ...headers, 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } })
      return new Response(await reportPdf(report), { headers: { ...headers, 'Content-Type': 'application/pdf' } })
    }

    if (route === '/notifications' && method === 'GET') {
      await generateNotifications(db, userId)
      const notifications = await db.collection('notifications').find({ userId }).sort({ created_at: -1 }).limit(50).toArray()
      return json({ notifications: notifications.map(({ _id, ...item }) => item) })
    }
    if (route === '/notifications/unread-count' && method === 'GET') {
      await generateNotifications(db, userId)
      return json({ count: await db.collection('notifications').countDocuments({ userId, is_read: false }) })
    }
    if (route === '/notifications/mark-all-read' && method === 'PATCH') {
      await db.collection('notifications').updateMany({ userId, is_read: false }, { $set: { is_read: true } })
      return json({ ok: true })
    }
    if (route === '/settings' && method === 'GET') {
      const settings = await db.collection('user_settings').findOne({ userId })
      return json({ lowBalanceThreshold: settings?.lowBalanceThreshold || 0 })
    }
    if (route === '/settings' && method === 'PATCH') {
      const body = await request.json()
      const lowBalanceThreshold = Number(body.lowBalanceThreshold)
      if (!Number.isFinite(lowBalanceThreshold) || lowBalanceThreshold < 0) return json({ error: 'Invalid threshold' }, 400)
      await db.collection('user_settings').updateOne({ userId }, { $set: { userId, lowBalanceThreshold, updatedAt: new Date().toISOString() } }, { upsert: true })
      await generateNotifications(db, userId)
      return json({ lowBalanceThreshold })
    }
    if (pathParts[0] === 'notifications' && pathParts[1] && method === 'PATCH') {
      const result = await db.collection('notifications').updateOne({ userId, id: pathParts[1] }, { $set: { is_read: true } })
      return result.matchedCount ? json({ ok: true }) : json({ error: 'Notification not found' }, 404)
    }
    if (pathParts[0] === 'notifications' && pathParts[1] && method === 'DELETE') {
      const result = await db.collection('notifications').deleteOne({ userId, id: pathParts[1] })
      return result.deletedCount ? json({ ok: true }) : json({ error: 'Notification not found' }, 404)
    }

    // GET /api/ - health
    if (method === 'GET' && route === '/') {
      return json({ ok: true, service: 'FinWise API' })
    }

    // Transactions
    if (route === '/transactions') {
      if (method === 'GET') {
        const txs = await db.collection('transactions').find({ userId }).sort({ date: -1 }).toArray()
        return json({ transactions: txs.map(({ _id, ...rest }) => rest) })
      }
      if (method === 'POST') {
        const body = await request.json()
        const tx = {
          id: uuidv4(),
          userId,
          type: body.type,
          category: body.category,
          amount: Number(body.amount),
          date: body.date || new Date().toISOString(),
          description: body.description || '',
          createdAt: new Date().toISOString(),
        }
        await db.collection('transactions').insertOne(tx)
        
        if (tx.description && tx.category) {
          await db.collection('merchant_mappings').updateOne(
            { userId, merchant: tx.description.toLowerCase().trim() },
            { $set: { userId, merchant: tx.description.toLowerCase().trim(), category: tx.category, updatedAt: new Date().toISOString() } },
            { upsert: true }
          )
        }

        await generateNotifications(db, userId, { transaction: tx })

        const { _id, ...clean } = tx
        return json({ transaction: clean })
      }
    }

    if (method === 'DELETE' && pathParts[0] === 'transactions' && pathParts[1]) {
      await db.collection('transactions').deleteOne({ userId, id: pathParts[1] })
      return json({ ok: true })
    }

    // Budget
    if (route === '/budget') {
      if (method === 'GET') {
        const doc = await db.collection('budgets').findOne({ userId })
        return json({ budget: doc?.budget || {} })
      }
      if (method === 'POST') {
        const body = await request.json()
        await db.collection('budgets').updateOne(
          { userId },
          { $set: { userId, budget: body.budget || {} } },
          { upsert: true }
        )
        await generateNotifications(db, userId)
        return json({ budget: body.budget })
      }
    }

    // Analyze
    if (method === 'POST' && route === '/analyze') {
      const txs = await db.collection('transactions').find({ userId }).toArray()
      const budgetDoc = await db.collection('budgets').findOne({ userId })
      const result = analyzeFinance(txs, budgetDoc?.budget || {})
      return json(result)
    }

    // Seed sample data
    if (method === 'POST' && route === '/seed') {
      await db.collection('transactions').deleteMany({ userId })
      const today = new Date()
      const cats = ['Food', 'Shopping', 'Transport', 'Rent', 'Utilities', 'Entertainment', 'Health', 'Loan/EMI']
      const descByCat = {
        Food: ['Zomato', 'Swiggy', 'Groceries', 'Restaurant', 'Cafe'],
        Shopping: ['Amazon', 'Myntra', 'Flipkart', 'Clothing', 'Electronics'],
        Transport: ['Uber', 'Metro', 'Petrol', 'Ola'],
        Rent: ['Monthly Rent'],
        Utilities: ['Electricity Bill', 'Internet', 'Mobile Recharge', 'Water'],
        Entertainment: ['Netflix', 'Spotify', 'Movie', 'Prime Video'],
        Health: ['Pharmacy', 'Doctor', 'Gym'],
        'Loan/EMI': ['Home Loan EMI'],
      }
      const sample = []
      // Salary for past 3 months
      for (let m = 2; m >= 0; m--) {
        const d = new Date(today.getFullYear(), today.getMonth() - m, 1)
        sample.push({
          id: uuidv4(), userId, type: 'income', category: 'Salary',
          amount: 75000 + Math.floor(Math.random() * 5000),
          date: d.toISOString(), description: 'Monthly Salary', createdAt: new Date().toISOString(),
        })
      }
      // Rent for 3 months
      for (let m = 2; m >= 0; m--) {
        const d = new Date(today.getFullYear(), today.getMonth() - m, 5)
        sample.push({
          id: uuidv4(), userId, type: 'expense', category: 'Rent',
          amount: 18000, date: d.toISOString(), description: 'Monthly Rent', createdAt: new Date().toISOString(),
        })
      }
      // Netflix / Spotify recurring
      for (let m = 2; m >= 0; m--) {
        const d = new Date(today.getFullYear(), today.getMonth() - m, 7)
        sample.push({ id: uuidv4(), userId, type: 'expense', category: 'Entertainment', amount: 649, date: d.toISOString(), description: 'Netflix', createdAt: new Date().toISOString() })
        sample.push({ id: uuidv4(), userId, type: 'expense', category: 'Entertainment', amount: 119, date: d.toISOString(), description: 'Spotify', createdAt: new Date().toISOString() })
      }
      // EMI recurring
      for (let m = 2; m >= 0; m--) {
        const d = new Date(today.getFullYear(), today.getMonth() - m, 10)
        sample.push({ id: uuidv4(), userId, type: 'expense', category: 'Loan/EMI', amount: 12500, date: d.toISOString(), description: 'Home Loan EMI', createdAt: new Date().toISOString() })
      }
      // Random expenses over last 60 days
      for (let i = 0; i < 90; i++) {
        const daysAgo = Math.floor(Math.random() * 60)
        const d = new Date(today); d.setDate(d.getDate() - daysAgo)
        const cat = cats[Math.floor(Math.random() * cats.length)]
        if (cat === 'Rent' || cat === 'Loan/EMI') continue
        const descArr = descByCat[cat] || ['Expense']
        const desc = descArr[Math.floor(Math.random() * descArr.length)]
        let amount = 100 + Math.floor(Math.random() * 2500)
        if (cat === 'Shopping' && Math.random() < 0.2) amount = 5000 + Math.floor(Math.random() * 8000)
        sample.push({
          id: uuidv4(), userId, type: 'expense', category: cat,
          amount, date: d.toISOString(), description: desc, createdAt: new Date().toISOString(),
        })
      }
      // Duplicate transaction
      const dup = { id: uuidv4(), userId, type: 'expense', category: 'Food', amount: 850, date: new Date(today.getTime() - 86400000).toISOString(), description: 'Zomato', createdAt: new Date().toISOString() }
      sample.push(dup)
      sample.push({ ...dup, id: uuidv4() })
      // Large transaction
      sample.push({ id: uuidv4(), userId, type: 'expense', category: 'Shopping', amount: 24999, date: new Date(today.getTime() - 5 * 86400000).toISOString(), description: 'iPhone Accessories', createdAt: new Date().toISOString() })

      await db.collection('transactions').insertMany(sample)

      // Default budget
      const defaultBudget = { Food: 8000, Shopping: 5000, Transport: 3000, Rent: 20000, Utilities: 3000, Entertainment: 1500, Health: 2000, 'Loan/EMI': 15000 }
      await db.collection('budgets').updateOne(
        { userId }, { $set: { userId, budget: defaultBudget } }, { upsert: true }
      )
      return json({ ok: true, inserted: sample.length })
    }

    if (method === 'DELETE' && route === '/clear') {
      await db.collection('transactions').deleteMany({ userId })
      await db.collection('budgets').deleteMany({ userId })
      return json({ ok: true })
    }

    if (method === 'PUT' && pathParts[0] === 'transactions' && pathParts[1]) {
      const txId = pathParts[1]
      const body = await request.json()
      const tx = await db.collection('transactions').findOne({ userId, id: txId })
      if (!tx) {
        return json({ error: 'Transaction not found' }, 404)
      }

      const updatedFields = {
        type: body.type !== undefined ? body.type : tx.type,
        category: body.category !== undefined ? body.category : tx.category,
        amount: body.amount !== undefined ? Number(body.amount) : tx.amount,
        description: body.description !== undefined ? body.description : tx.description,
        date: body.date !== undefined ? body.date : tx.date,
      }

      if (updatedFields.description && updatedFields.category && 
         (updatedFields.category !== tx.category || updatedFields.description !== tx.description)) {
        await db.collection('merchant_mappings').updateOne(
          { userId, merchant: updatedFields.description.toLowerCase().trim() },
          { $set: { userId, merchant: updatedFields.description.toLowerCase().trim(), category: updatedFields.category, updatedAt: new Date().toISOString() } },
          { upsert: true }
        )
      }

      await db.collection('transactions').updateOne({ userId, id: txId }, { $set: updatedFields })
      await generateNotifications(db, userId, { transaction: { ...tx, ...updatedFields } })
      return json({ transaction: { ...tx, ...updatedFields } })
    }

    if (method === 'GET' && route === '/transactions/suggest-category') {
      const url = new URL(request.url)
      const description = url.searchParams.get('description') || ''
      const type = url.searchParams.get('type') || 'expense'
      const amount = url.searchParams.get('amount') || '0'

      if (!description) {
        return json({ category: 'Other' })
      }

      const mapping = await db.collection('merchant_mappings').findOne({ 
        userId, 
        merchant: description.toLowerCase().trim() 
      })
      
      if (mapping) {
        return json({ category: mapping.category, source: 'merchant_learning' })
      }

      const category = await aiCategorize(description, type, amount)
      return json({ category, source: 'ai' })
    }

    if (method === 'POST' && route === '/ai-insights') {
      const txs = await db.collection('transactions').find({ userId }).toArray()
      const budgetDoc = await db.collection('budgets').findOne({ userId })
      
      const financeData = analyzeFinance(txs, budgetDoc?.budget || {})
      const insights = await generateAiInsights(financeData)
      
      await db.collection('ai_insights').updateOne(
        { userId },
        { $set: { userId, insights, createdAt: new Date().toISOString() } },
        { upsert: true }
      )
      
      return json({ insights })
    }

    if (method === 'POST' && route === '/chat') {
      const { message, history } = await request.json()
      const txs = await db.collection('transactions').find({ userId }).toArray()
      const budgetDoc = await db.collection('budgets').findOne({ userId })
      const financeData = analyzeFinance(txs, budgetDoc?.budget || {})
      
      financeData.recentTransactions = txs.slice(0, 10).map(t => ({
        description: t.description,
        amount: t.amount,
        date: t.date,
        type: t.type,
        category: t.category
      }))

      const reply = await chatFinance(message, history || [], financeData)
      return json({ reply })
    }

    if (method === 'POST' && route === '/affordability') {
      const { purchaseName, amount, monthsToSave } = await request.json()
      const txs = await db.collection('transactions').find({ userId }).toArray()
      const budgetDoc = await db.collection('budgets').findOne({ userId })
      const financeData = analyzeFinance(txs, budgetDoc?.budget || {})

      const result = await checkAffordability(purchaseName, Number(amount), Number(monthsToSave || 0), financeData)
      return json(result)
    }

    if (method === 'POST' && route === '/life-simulator') {
      const { scenario, inputs } = await request.json()
      const txs = await db.collection('transactions').find({ userId }).toArray()
      const budgetDoc = await db.collection('budgets').findOne({ userId })
      const financeData = analyzeFinance(txs, budgetDoc?.budget || {})

      const result = await simulateLifeScenario(scenario, inputs || {}, financeData)
      return json(result)
    }

if (method === 'POST' && route === '/receipts/parse') {
      const { fileData, mimeType, rawText } = await request.json()
      const parsed = await parseReceipt(fileData, mimeType, rawText)
      return json(parsed)
    }

    if (method === 'POST' && route === '/statements/parse') {
      const { fileData, mimeType, rawText } = await request.json()
      const transactions = await parseStatement(fileData, mimeType, rawText)
      return json({ transactions })
    }

    if (method === 'POST' && route === '/subscriptions/detect') {
      const txs = await db.collection('transactions').find({ userId }).toArray()
      const subscriptions = await detectSubscriptions(txs)
      
      await db.collection('ai_subscriptions').updateOne(
        { userId },
        { $set: { userId, subscriptions, createdAt: new Date().toISOString() } },
        { upsert: true }
      )

      return json({ subscriptions })
    }

    return json({ error: 'Not found', route, method }, 404)
  } catch (err) {
    console.error('API error:', err)
    return json({ error: err.message || 'Internal error' }, 500)
  }
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const DELETE = handle
export const PATCH = handle
