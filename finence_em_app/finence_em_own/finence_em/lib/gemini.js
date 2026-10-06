import { GoogleGenerativeAI } from '@google/generative-ai'

let genAI = null

function isRateLimitError(err) {
  const message = String(err?.message || '')
  return (
    err?.status === 429 ||
    err?.code === 429 ||
    err?.response?.status === 429 ||
    err?.status === 503 ||
    err?.response?.status === 503 ||
    /429|quota|rate limit|too many requests|503|service unavailable|high demand/i.test(message)
  )
}

function formatMoney(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`
}

function findCategoryFromMessage(message) {
  const text = String(message || '').toLowerCase()
  const keywordMap = [
    ['Food', ['food', 'grocery', 'groceries', 'restaurant', 'dinner', 'lunch', 'cafe', 'zomato', 'swiggy']],
    ['Shopping', ['shopping', 'amazon', 'flipkart', 'myntra', 'store', 'clothes', 'shoes', 'mall']],
    ['Transport', ['transport', 'travel', 'uber', 'ola', 'metro', 'petrol', 'cab', 'train', 'flight']],
    ['Rent', ['rent', 'house rent', 'pg rent']],
    ['Utilities', ['utilities', 'electricity', 'water', 'internet', 'wifi', 'recharge', 'mobile bill', 'gas']],
    ['Entertainment', ['entertainment', 'netflix', 'spotify', 'prime', 'movie', 'hotstar', 'bookmyshow', 'game']],
    ['Health', ['health', 'doctor', 'hospital', 'medicine', 'pharmacy', 'gym', 'medical']],
    ['Education', ['education', 'course', 'book', 'school', 'college', 'udemy']],
    ['Loan/EMI', ['loan', 'emi', 'debt', 'mortgage', 'credit card bill']],
  ]

  for (const [category, keywords] of keywordMap) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return category
    }
  }
  return null
}

function getOfflineChatReply(message, financeData) {
  const summary = financeData?.summary || {}
  const spending = financeData?.spending || {}
  const detection = financeData?.detection || {}
  const risks = financeData?.risks || []
  const recommendations = financeData?.recommendations || []
  const budgetAnalysis = financeData?.budgetAnalysis || []
  const highestCategory = spending.highestCategory
  const text = String(message || '').toLowerCase()
  const category = findCategoryFromMessage(message)
  const categoryItem = category
    ? (spending.categoryBreakdown || []).find((item) => item.category === category)
    : null

  if (/savings rate|how much did i save|my savings/i.test(text)) {
    return `Your savings rate is ${summary.savingsRate ?? 0}%, which equals ${formatMoney(summary.savings || 0)} in savings. ${highestCategory ? `Your biggest expense is ${highestCategory.category} at ${formatMoney(highestCategory.amount)}.` : ''}`.trim()
  }

  if (/balance|current balance|net worth/i.test(text)) {
    return `Your current balance is ${formatMoney(summary.currentBalance || 0)}. ${summary.currentBalance > 0 ? 'You are in positive cash flow.' : 'You are currently running at a deficit.'} ${risks[0] ? `Main risk: ${risks[0].message}` : ''}`.trim()
  }

  if (/subscription|recurring|duplicate|repeat charge/i.test(text)) {
    const recurring = detection.recurringSubscriptions || []
    if (recurring.length) {
      const top = recurring[0]
      return `I found ${recurring.length} recurring item(s). The main one is ${top.description} (${top.category}) at ${formatMoney(top.amount)}. ${top.reason || ''}`.trim()
    }
    return 'I did not detect any recurring subscriptions from the stored transactions yet.'
  }

  if (/budget|over budget|overspend|overspending/i.test(text)) {
    const over = budgetAnalysis.filter((item) => item.status === 'over')
    if (over.length) {
      return `You are over budget in ${over.map((item) => item.category).join(', ')}. The most critical one is ${over[0].category} with ${formatMoney(over[0].spent)} spent against a budget of ${formatMoney(over[0].budget)}.`
    }
    return 'No budget category is currently over limit. Keep an eye on the highest usage categories and update limits if needed.'
  }

  if (category) {
    if (categoryItem) {
      return `You have spent ${formatMoney(categoryItem.amount)} on ${category} so far. That is ${categoryItem.usagePercent ?? 0}% of the budgeted limit and ${categoryItem.status === 'over' ? 'over budget' : 'still within budget'}.`
    }
    return `I could not find ${category} spending in the current data. Try asking about Food, Shopping, Transport, Rent, Utilities, Entertainment, Health, Education, or Loan/EMI.`
  }

  if (/top spend|highest spending|largest expense|biggest expense/i.test(text)) {
    if (highestCategory) {
      return `Your highest spending category is ${highestCategory.category} at ${formatMoney(highestCategory.amount)}. ${recommendations[0] ? `Suggested next step: ${recommendations[0].title}.` : ''}`.trim()
    }
  }

  if (/income|salary|earnings/i.test(text)) {
    return `Your total income is ${formatMoney(summary.totalIncome || 0)} and total expenses are ${formatMoney(summary.totalExpense || 0)}. ${summary.totalIncome >= summary.totalExpense ? 'Income currently covers expenses.' : 'Expenses are higher than income right now.'}`.trim()
  }

  if (/chart|overview|summary|audit|insight/i.test(text)) {
    const riskText = risks.length ? ` Main risk: ${risks[0].message}` : ''
    return `Here is your financial overview: balance ${formatMoney(summary.currentBalance || 0)}, savings rate ${summary.savingsRate ?? 0}%, top category ${highestCategory ? `${highestCategory.category} at ${formatMoney(highestCategory.amount)}` : 'not available'}.${riskText}`.trim()
  }

  const parts = []
  parts.push('I am currently in offline mode because the Gemini request quota was exceeded.')
  parts.push(`Your current balance is ${formatMoney(summary.currentBalance || 0)} and your savings rate is ${summary.savingsRate ?? 0}%.`)

  if (highestCategory) {
    parts.push(`Your highest spending category is ${highestCategory.category} at ${formatMoney(highestCategory.amount)}.`)
  }

  if (risks.length) {
    parts.push(`Top risk: ${risks[0].message}`)
  }

  if (recommendations.length) {
    parts.push(`Suggested next step: ${recommendations[0].title}. ${recommendations[0].detail}`)
  } else {
    parts.push('Keep tracking expenses and review your budget monthly.')
  }

  if (message && /chart|summary|audit|overview|insight/i.test(message)) {
    parts.push('I can still generate a deterministic summary from your stored transactions and budgets.')
  }

  return parts.join(' ')
}

function getOfflineInsights(financeData) {
  const summary = financeData?.summary || {}
  const spending = financeData?.spending || {}
  const risks = financeData?.risks || []
  const recommendations = financeData?.recommendations || []

  const insights = [
    {
      title: 'Offline Insight',
      text: `Gemini quota was exceeded, so these insights are generated locally from your data. Current balance: ₹${Number(summary.currentBalance || 0).toLocaleString('en-IN')}.`,
      tone: 'neutral',
      icon: 'lightbulb',
    },
  ]

  if (spending.highestCategory) {
    insights.push({
      title: 'Top Spending Category',
      text: `${spending.highestCategory.category} is your highest expense category at ₹${Number(spending.highestCategory.amount || 0).toLocaleString('en-IN')}.`,
      tone: 'warning',
      icon: 'pie-chart',
    })
  }

  if (risks.length) {
    insights.push({
      title: 'Primary Risk',
      text: risks[0].message,
      tone: risks[0].severity === 'high' ? 'warning' : 'neutral',
      icon: 'alert-triangle',
    })
  }

  if (recommendations.length) {
    insights.push({
      title: recommendations[0].title,
      text: recommendations[0].detail,
      tone: 'success',
      icon: 'shield-check',
    })
  }

  return insights.slice(0, 4)
}

function getModel() {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY?.trim()
    if (key && !/^your_|^replace_/i.test(key)) {
      genAI = new GoogleGenerativeAI(key)
    }
  }
  if (!genAI) return null
  return genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  })
}

const CATEGORIES = [
  'Salary', 'Business', 'Investment', 'Food', 'Shopping', 'Transport', 
  'Rent', 'Utilities', 'Entertainment', 'Health', 'Education', 'Loan/EMI', 'Other'
]

// ----------------- Deterministic Fallbacks -----------------
function getMockCategory(desc = '', type = 'expense') {
  const d = desc.toLowerCase().trim()
  if (type === 'income') {
    if (d.includes('salary') || d.includes('paycheck') || d.includes('wage')) return 'Salary'
    if (d.includes('freelance') || d.includes('client') || d.includes('business') || d.includes('sale')) return 'Business'
    if (d.includes('dividend') || d.includes('interest') || d.includes('crypto') || d.includes('stocks')) return 'Investment'
    return 'Other'
  }
  if (d.includes('zomato') || d.includes('swiggy') || d.includes('restaurant') || d.includes('food') || d.includes('dinner') || d.includes('lunch') || d.includes('cafe') || d.includes('grocery') || d.includes('groceries')) return 'Food'
  if (d.includes('uber') || d.includes('ola') || d.includes('metro') || d.includes('petrol') || d.includes('cab') || d.includes('train') || d.includes('flight')) return 'Transport'
  if (d.includes('rent') || d.includes('pg rent')) return 'Rent'
  if (d.includes('netflix') || d.includes('spotify') || d.includes('prime') || d.includes('movie') || d.includes('hotstar') || d.includes('bookmyshow') || d.includes('game')) return 'Entertainment'
  if (d.includes('electricity') || d.includes('water') || d.includes('internet') || d.includes('wifi') || d.includes('recharge') || d.includes('mobile bill') || d.includes('gas')) return 'Utilities'
  if (d.includes('amazon') || d.includes('flipkart') || d.includes('myntra') || d.includes('clothes') || d.includes('shoes') || d.includes('mall') || d.includes('store')) return 'Shopping'
  if (d.includes('pharmacy') || d.includes('doctor') || d.includes('hospital') || d.includes('gym') || d.includes('medicine') || d.includes('medical')) return 'Health'
  if (d.includes('course') || d.includes('book') || d.includes('school') || d.includes('college') || d.includes('udemy') || d.includes('tution')) return 'Education'
  if (d.includes('emi') || d.includes('loan') || d.includes('mortgage') || d.includes('credit card bill')) return 'Loan/EMI'
  return 'Other'
}

// ----------------- API Methods -----------------

/**
 * 1. AI Transaction Categorization
 */
export async function aiCategorize(description, type, amount) {
  const fallback = getMockCategory(description, type)
  const model = getModel()
  if (!model) return fallback

  try {
    const prompt = `Given the transaction description: "${description}", type: "${type}", amount: "${amount}". 
    Select the most appropriate category from this exact list: ${JSON.stringify(CATEGORIES)}.
    Return ONLY a raw JSON object with key "category". Do not include markdown block syntax. Example response: {"category": "Food"}`
    
    const result = await model.generateContent(prompt)
    const text = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(text)
    if (CATEGORIES.includes(parsed.category)) {
      return parsed.category
    }
  } catch (err) {
    console.error('[Gemini AI Categorize error]', err)
  }
  return fallback
}

/**
 * 2. AI Insights (Natural Language Guidance)
 */
export async function generateAiInsights(financeData) {
  const model = getModel()
  const defaultInsights = [
    { title: 'Deterministic Insight', text: 'Please configure GEMINI_API_KEY to see dynamic AI insights.', tone: 'neutral', icon: 'lightbulb' }
  ]

  if (!model) return defaultInsights

  try {
    const prompt = `You are FinWise, a world-class financial advisor. Formulate 3 or 4 highly tailored, actionable financial insights for a user based on this data summary:
    Total Income: ₹${financeData.summary.totalIncome}
    Total Expenses: ₹${financeData.summary.totalExpense}
    Savings Rate: ${financeData.summary.savingsRate}%
    Current Balance: ₹${financeData.summary.currentBalance}
    Budget Status: ${JSON.stringify(financeData.budgetAnalysis)}
    Risks Detected: ${JSON.stringify(financeData.risks)}
    Top Category: ${financeData.spending.highestCategory?.category || 'None'}
    
    Your response must be a valid JSON array of objects. Do not wrap in markdown or backticks.
    Each object must have the following keys:
    - "title": short punchy text
    - "text": detailed, actionable natural language tip
    - "tone": "success", "warning", or "neutral"
    - "icon": "trending-up", "trending-down", "piggy-bank", "alert-triangle", "shield-check", "pie-chart", or "activity"
    
    Example output format:
    [
      {"title": "High Shopping Spend", "text": "You spent 35% of your income on shopping. Try setting a limit of ₹2,000 for next month.", "tone": "warning", "icon": "alert-triangle"}
    ]`

    const result = await model.generateContent(prompt)
    const text = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim()
    return JSON.parse(text)
  } catch (err) {
    console.error('[Gemini Insights error]', err)
    if (isRateLimitError(err)) {
      return getOfflineInsights(financeData)
    }
    return defaultInsights
  }
}

/**
 * 3. Conversational Finance Assistant
 */
export async function chatFinance(message, history, financeData) {
  const model = getModel()
  if (!model) {
    return 'The AI Assistant is currently running in offline mode because the GEMINI_API_KEY is not set. Please ask your administrator to configure it.'
  }

  try {
    const systemPrompt = `You are FinWise AI, a friendly and expert conversational finance assistant. You have access to the user's financial data:
    - Current Balance: ₹${financeData.summary.currentBalance}
    - Total Income: ₹${financeData.summary.totalIncome}
    - Total Expenses: ₹${financeData.summary.totalExpense}
    - Savings: ₹${financeData.summary.savings} (Savings Rate: ${financeData.summary.savingsRate}%)
    - Budget Details: ${JSON.stringify(financeData.budgetAnalysis)}
    - Active Subscriptions: ${JSON.stringify(financeData.detection.recurringSubscriptions)}
    - Top Expenses Category: ${financeData.spending.highestCategory ? `${financeData.spending.highestCategory.category} (₹${financeData.spending.highestCategory.amount})` : 'None'}
    - Recent 10 Transactions: ${JSON.stringify(financeData.recentTransactions || [])}

    Instructions:
    1. Answer user queries contextually and professionally.
    2. Format using markdown tables, bullet points, and clean typography.
    3. Be encouraging, but point out financial risks (like low savings rate or overspending on categories).
    4. Speak in terms of Indian Rupees (₹).
    `

    // Filter history so that the first message starts with the 'user' role
    const formattedHistory = []
    let foundFirstUser = false
    for (const h of history) {
      if (h.role === 'user') {
        foundFirstUser = true
      }
      if (foundFirstUser) {
        formattedHistory.push({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }]
        })
      }
    }

    const chatSession = model.startChat({
      history: formattedHistory,
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      }
    })

    const result = await chatSession.sendMessage(message)
    return result.response.text()
  } catch (err) {
    const errorMessage = String(err?.message || '')
    const invalidKey = err?.status === 400 && /api[_ -]?key|invalid/i.test(errorMessage)
    if (isRateLimitError(err)) {
      console.warn('[Gemini Chat] Gemini is temporarily unavailable; using offline finance response.')
    } else {
      console.error(
        `[Gemini Chat error] ${invalidKey ? 'Invalid GEMINI_API_KEY.' : errorMessage || 'Unknown Gemini error.'}`,
      )
    }
    return getOfflineChatReply(message, financeData)
  }
}

/**
 * 4. Affordability Checker
 */
export async function checkAffordability(purchaseName, amount, monthsToSave, financeData) {
  const model = getModel()
  
  const currentBalance = financeData.summary.currentBalance || 0
  const avgExpense = financeData.spending.dailyAverage * 30 || 10000
  const monthlyIncome = financeData.summary.totalIncome / Math.max(1, (financeData.spending.monthlyTrend?.length || 1))
  const monthlyExpense = financeData.summary.totalExpense / Math.max(1, (financeData.spending.monthlyTrend?.length || 1))
  const monthlySavings = Math.max(0, monthlyIncome - monthlyExpense)

  const projectedSavings = monthlySavings * monthsToSave
  const totalFundsBefore = currentBalance + projectedSavings
  const endingBalance = totalFundsBefore - amount
  const emergencyFundGoal = avgExpense * 3

  let status = 'Risky'
  if (endingBalance >= emergencyFundGoal) {
    status = 'Highly Affordable'
  } else if (endingBalance >= avgExpense) {
    status = 'Affordable'
  } else if (endingBalance >= 0) {
    status = 'Tight'
  } else {
    status = 'Risky'
  }

  const percentageOfSavings = totalFundsBefore > 0 ? Math.round((amount / totalFundsBefore) * 100) : 100
  const verdict = status === 'Highly Affordable' ? `Yes, you can easily afford the ${purchaseName}!` :
                  status === 'Affordable' ? `You can afford the ${purchaseName}, but it will reduce your safety net.` :
                  status === 'Tight' ? `This purchase will be tight. Consider saving for a few more months.` :
                  `This purchase is risky right now and will put you in debt or clear out your cash.`

  const defaultResult = {
    status,
    percentageOfSavings,
    verdict,
    analysis: `Based on your average monthly savings of ₹${Math.round(monthlySavings).toLocaleString('en-IN')} and emergency fund target of ₹${Math.round(emergencyFundGoal).toLocaleString('en-IN')}, a purchase of ₹${amount.toLocaleString('en-IN')} in ${monthsToSave} months will leave you with an estimated balance of ₹${Math.round(endingBalance).toLocaleString('en-IN')}.`,
    actionSteps: [
      `Save an additional ₹${Math.max(0, Math.round((amount - totalFundsBefore) / Math.max(1, monthsToSave)))} per month to make this safe.`,
      `Consider looking for discounts or alternatives to reduce the cost.`,
      `Avoid financing with high-interest credit options.`
    ]
  }

  if (!model) return defaultResult

  try {
    const prompt = `Evaluate the affordability of buying "${purchaseName}" for ₹${amount} in ${monthsToSave} months.
    Current Financial Standings:
    - Balance: ₹${currentBalance}
    - Monthly Net Savings: ₹${monthlySavings}
    - Average Monthly Expenses: ₹${monthlyExpense}
    - Emergency Fund target (3 months): ₹${emergencyFundGoal}
    - Projected cash pool at target date: ₹${totalFundsBefore}
    - Estimated balance remaining after purchase: ₹${endingBalance}
    - Consumption ratio: ${percentageOfSavings}% of total savings pool.
    
    Provide a personalized assessment. Return only a JSON object matching this structure:
    {
      "status": "Highly Affordable" | "Affordable" | "Tight" | "Risky",
      "percentageOfSavings": ${percentageOfSavings},
      "verdict": "short sentence verdict",
      "analysis": "a friendly paragraph evaluating the impact on their emergency fund and financial stability",
      "actionSteps": ["list item 1", "list item 2", "list item 3"]
    }`

    const result = await model.generateContent(prompt)
    const text = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim()
    return JSON.parse(text)
  } catch (err) {
    console.error('[Gemini Affordability error]', err)
    if (isRateLimitError(err)) {
      return defaultResult
    }
    return defaultResult
  }
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function calcEmi(principal, annualRate, months) {
  const amount = Math.max(0, toNumber(principal))
  const tenure = Math.max(1, Math.round(toNumber(months, 1)))
  const rate = Math.max(0, toNumber(annualRate)) / 12 / 100
  if (amount <= 0) return 0
  if (rate === 0) return Math.round(amount / tenure)
  const factor = Math.pow(1 + rate, tenure)
  return Math.round((amount * rate * factor) / (factor - 1))
}

function getScenarioLabel(scenario) {
  const labels = {
    bike: 'Buy Bike',
    car: 'Buy Car',
    phone: 'Buy Phone/Laptop',
    home_loan: 'Home Loan',
    education: 'Higher Education',
    marriage: 'Marriage Expense',
    job_loss: 'Job Loss',
    emergency: 'Medical / Emergency Expense',
    income_reduction: 'Salary Decrease',
    salary_increase: 'Salary Increase',
    new_emi: 'New EMI',
    custom: 'Custom Scenario',
  }
  return labels[scenario] || 'Financial Scenario'
}

function buildProjectionSeries(startBalance, monthlyDelta, months = 12) {
  const projection = []
  let scenarioBalance = Math.round(startBalance)
  let baselineBalance = Math.round(startBalance)
  for (let month = 1; month <= months; month++) {
    baselineBalance = Math.round(baselineBalance + monthlyDelta.baseline)
    scenarioBalance = Math.round(scenarioBalance + monthlyDelta.scenario)
    projection.push({
      month: `M${month}`,
      baseline: baselineBalance,
      scenario: scenarioBalance,
      delta: scenarioBalance - baselineBalance,
    })
  }
  return projection
}

export async function simulateLifeScenario(scenario, inputs, financeData) {
  const model = getModel()
  const summary = financeData?.summary || {}
  const spending = financeData?.spending || {}
  const detection = financeData?.detection || {}
  const budgetAnalysis = financeData?.budgetAnalysis || []

  const monthlyTrend = spending.monthlyTrend || []
  const monthsOfData = Math.max(1, monthlyTrend.length || 1)
  const monthlyIncome = toNumber(summary.totalIncome) / monthsOfData || 0
  const monthlyExpense = toNumber(summary.totalExpense) / monthsOfData || 0
  const monthlySavings = monthlyIncome - monthlyExpense
  const currentBalance = toNumber(summary.currentBalance)
  const avgMonthlyExpense = monthlyTrend.length
    ? monthlyTrend.reduce((acc, item) => acc + toNumber(item.expense), 0) / monthlyTrend.length
    : monthlyExpense || Math.max(1, toNumber(summary.totalExpense))
  const emergencyCoverage = avgMonthlyExpense > 0 ? currentBalance / avgMonthlyExpense : 0
  const subscriptionBurden = (detection.recurringSubscriptions || []).reduce((acc, item) => acc + toNumber(item.amount), 0)
  const debtBurden = (budgetAnalysis || [])
    .filter((item) => /loan|emi|debt/i.test(item.category || ''))
    .reduce((acc, item) => acc + toNumber(item.spent), 0)

  const oneTimeHit = Math.max(0, toNumber(inputs.oneTimeHit || inputs.price || inputs.totalCost || inputs.amount || inputs.emergencyExpense || inputs.downPayment))
  const durationMonths = Math.max(1, Math.round(toNumber(inputs.durationMonths || inputs.loanDurationMonths || inputs.monthsWithoutIncome || inputs.monthsToPlan || inputs.months || 12, 12)))

  let monthlyScenarioDelta = monthlySavings
  let immediateBalanceHit = 0
  let status = 'Manageable'
  let verdict = 'The scenario is manageable with careful planning.'
  let analysis = `Your current balance is ${formatMoney(currentBalance)}, with roughly ${formatMoney(monthlySavings)} in monthly savings.`
  let actionSteps = [
    'Review the timeline before committing.',
    'Keep your emergency fund above 3 months of expenses.',
    'Avoid high-interest borrowing if possible.',
  ]
  let riskFlags = []
  let monthlyImpactLabel = 'Monthly cash-flow change'

  if (scenario === 'bike' || scenario === 'car' || scenario === 'phone' || scenario === 'home_loan' || scenario === 'education' || scenario === 'marriage') {
    const purchasePrice = Math.max(oneTimeHit, toNumber(inputs.purchasePrice || inputs.totalCost || inputs.price || inputs.totalExpense || inputs.amount))
    const downPayment = Math.min(purchasePrice, Math.max(0, toNumber(inputs.downPayment || inputs.deposit || 0)))
    const principal = Math.max(0, purchasePrice - downPayment)
    const interestRate = Math.max(0, toNumber(inputs.interestRate || inputs.annualInterestRate || 0))
    const loanDurationMonths = Math.max(1, Math.round(toNumber(inputs.loanDurationMonths || inputs.durationMonths || 12, 12)))
    const emi = principal > 0 ? calcEmi(principal, interestRate, loanDurationMonths) : 0
    const maintenance = Math.max(0, toNumber(inputs.monthlyMaintenance || inputs.runningCost || 0))
    immediateBalanceHit = downPayment
    monthlyScenarioDelta = monthlySavings - emi - maintenance
    const endingBalance = currentBalance - downPayment + (monthlyScenarioDelta * durationMonths)
    const safeMonths = avgMonthlyExpense > 0 ? endingBalance / avgMonthlyExpense : 0
    status = endingBalance >= avgMonthlyExpense * 6 ? 'Safe' : endingBalance >= avgMonthlyExpense * 3 ? 'Manageable' : endingBalance >= 0 ? 'Tight' : 'Risky'
    verdict = endingBalance >= 0
      ? `${getScenarioLabel(scenario)} is possible, but it will reduce your buffer to about ${formatMoney(endingBalance)} after ${durationMonths} months.`
      : `${getScenarioLabel(scenario)} creates a cash-flow gap and should be delayed or resized.`
    analysis = `${getScenarioLabel(scenario)} uses a down payment of ${formatMoney(downPayment)} and an estimated EMI of ${formatMoney(emi)}. After monthly running costs of ${formatMoney(maintenance)}, your projected balance after ${durationMonths} months is ${formatMoney(endingBalance)}.`
    actionSteps = [
      `Keep your EMI plus running costs below ${Math.round((monthlySavings * 0.4) || emi).toLocaleString('en-IN')} per month if possible.`,
      `Maintain at least 3 months of expenses before signing the deal.`,
      `Consider a bigger down payment or longer comparison shopping window.`,
    ]
    riskFlags = [
      downPayment > currentBalance ? 'Down payment exceeds liquid balance.' : null,
      emi + maintenance > monthlySavings ? 'Monthly payment exceeds your current savings capacity.' : null,
      safeMonths < 3 ? 'Projected buffer falls below 3 months of expenses.' : null,
    ].filter(Boolean)
    monthlyImpactLabel = 'Estimated monthly EMI + running cost'
  } else if (scenario === 'job_loss') {
    const monthsWithoutIncome = Math.max(1, Math.round(toNumber(inputs.monthsWithoutIncome || 3, 3)))
    const jobSearchCosts = Math.max(0, toNumber(inputs.monthlyJobSearchCost || inputs.extraMonthlyCost || 0))
    immediateBalanceHit = 0
    monthlyScenarioDelta = -(monthlyExpense + jobSearchCosts)
    const endingBalance = currentBalance + (monthlyScenarioDelta * monthsWithoutIncome)
    const runwayMonths = avgMonthlyExpense > 0 ? currentBalance / (avgMonthlyExpense + jobSearchCosts) : 0
    status = runwayMonths >= monthsWithoutIncome + 3 ? 'Safe' : runwayMonths >= monthsWithoutIncome ? 'Manageable' : runwayMonths >= 1 ? 'Tight' : 'Risky'
    verdict = runwayMonths >= monthsWithoutIncome
      ? `You can survive about ${Math.max(0, runwayMonths).toFixed(1)} months without income, but the margin is limited.`
      : `A job loss for ${monthsWithoutIncome} months would likely deplete your liquid savings.`
    analysis = `With no income for ${monthsWithoutIncome} months, your current balance of ${formatMoney(currentBalance)} covers about ${Math.max(0, runwayMonths).toFixed(1)} months of expenses. Estimated balance after the shock: ${formatMoney(endingBalance)}.`
    actionSteps = [
      'Cut non-essential spending immediately.',
      'Prioritize rent, food, and medical costs first.',
      'Build a backup income plan before making the switch.',
    ]
    riskFlags = [
      runwayMonths < monthsWithoutIncome ? 'Emergency fund does not fully cover the offline period.' : null,
      currentBalance < avgMonthlyExpense * 3 ? 'Emergency reserve is below the 3-month rule.' : null,
    ].filter(Boolean)
    monthlyImpactLabel = 'Monthly burn rate during job loss'
  } else if (scenario === 'salary_increase') {
    const increasePercent = Math.max(0, toNumber(inputs.increasePercent || 0))
    const increaseAmount = Math.max(0, toNumber(inputs.increaseAmount || 0))
    const uplift = Math.max(increaseAmount, monthlyIncome * (increasePercent / 100))
    monthlyScenarioDelta = monthlySavings + uplift
    const endingBalance = currentBalance + (monthlyScenarioDelta * durationMonths)
    status = monthlyScenarioDelta > monthlySavings * 1.5 ? 'Safe' : monthlyScenarioDelta > monthlySavings ? 'Manageable' : 'Tight'
    verdict = `Your monthly surplus could improve by ${formatMoney(uplift)}, lifting your balance to about ${formatMoney(endingBalance)} over ${durationMonths} months.`
    analysis = `A salary increase of ${increasePercent || 0}% or ${formatMoney(increaseAmount)} per month could raise your savings rate materially. Projected balance after ${durationMonths} months: ${formatMoney(endingBalance)}.`
    actionSteps = [
      'Route part of the raise directly into savings or investments.',
      'Increase your emergency fund before lifestyle inflation kicks in.',
      'Use the extra room to pay down any EMI burden sooner.',
    ]
    riskFlags = [monthlySavings <= 0 ? 'Current savings are already weak, so the raise may only stabilize cash flow.' : null].filter(Boolean)
    monthlyImpactLabel = 'Monthly income uplift'
  } else if (scenario === 'income_reduction') {
    const reductionPercent = Math.max(0, toNumber(inputs.reductionPercent || 0))
    const reductionAmount = Math.max(0, toNumber(inputs.reductionAmount || 0))
    const loss = Math.max(reductionAmount, monthlyIncome * (reductionPercent / 100))
    monthlyScenarioDelta = monthlySavings - loss
    const endingBalance = currentBalance + (monthlyScenarioDelta * durationMonths)
    status = endingBalance >= avgMonthlyExpense * 3 ? 'Manageable' : endingBalance >= 0 ? 'Tight' : 'Risky'
    verdict = `Your monthly surplus could fall by ${formatMoney(loss)}, which would leave about ${formatMoney(endingBalance)} after ${durationMonths} months.`
    analysis = `A ${reductionPercent || 0}% income cut or ${formatMoney(reductionAmount)} monthly drop pushes your savings lower. If the reduction lasts ${durationMonths} months, your ending balance may shrink to ${formatMoney(endingBalance)}.`
    actionSteps = [
      'Trim fixed expenses before the income cut arrives.',
      'Pause non-essential subscriptions or discretionary spending.',
      'Use the simulator to test a lower-cost budget immediately.',
    ]
    riskFlags = [
      monthlyScenarioDelta < 0 ? 'Monthly cash flow turns negative under this scenario.' : null,
      endingBalance < 0 ? 'Balance turns negative before the end of the horizon.' : null,
    ].filter(Boolean)
    monthlyImpactLabel = 'Monthly income loss'
  } else if (scenario === 'new_emi') {
    const newEmi = Math.max(0, toNumber(inputs.emiAmount || inputs.monthlyEmi || 0))
    const emiMonths = Math.max(1, Math.round(toNumber(inputs.emiMonths || inputs.durationMonths || 12, 12)))
    monthlyScenarioDelta = monthlySavings - newEmi
    const endingBalance = currentBalance + (monthlyScenarioDelta * emiMonths)
    status = endingBalance >= avgMonthlyExpense * 3 ? 'Manageable' : endingBalance >= 0 ? 'Tight' : 'Risky'
    verdict = `Adding a new EMI of ${formatMoney(newEmi)} would reduce your slack and leave about ${formatMoney(endingBalance)} after ${emiMonths} months.`
    analysis = `A new debt payment of ${formatMoney(newEmi)} per month will consume a large part of your monthly surplus. Your projected balance after ${emiMonths} months is ${formatMoney(endingBalance)}.`
    actionSteps = [
      'Check if the EMI can stay below 20% of monthly income.',
      'Compare with a down-payment or cash purchase alternative.',
      'Keep your emergency reserve untouched if possible.',
    ]
    riskFlags = [newEmi > monthlySavings ? 'The new EMI exceeds your current monthly savings.' : null].filter(Boolean)
    monthlyImpactLabel = 'Monthly EMI burden'
  } else if (scenario === 'emergency') {
    const emergencyExpense = Math.max(0, toNumber(inputs.emergencyExpense || inputs.amount || 0))
    const insuranceCover = Math.max(0, toNumber(inputs.insuranceCover || 0))
    const netHit = Math.max(0, emergencyExpense - insuranceCover)
    immediateBalanceHit = netHit
    monthlyScenarioDelta = monthlySavings
    const endingBalance = currentBalance - netHit + (monthlyScenarioDelta * durationMonths)
    status = endingBalance >= avgMonthlyExpense * 3 ? 'Manageable' : endingBalance >= 0 ? 'Tight' : 'Risky'
    verdict = `After insurance, this emergency may still cost ${formatMoney(netHit)} and trim your buffer to ${formatMoney(endingBalance)}.`
    analysis = `An emergency expense of ${formatMoney(emergencyExpense)} with ${formatMoney(insuranceCover)} of cover leaves a net impact of ${formatMoney(netHit)}. Your projected balance after ${durationMonths} months is ${formatMoney(endingBalance)}.`
    actionSteps = [
      'Keep a separate emergency bucket for healthcare or sudden repairs.',
      'If possible, split payment without using high-interest credit.',
      'Rebuild the reserve immediately after the event.',
    ]
    riskFlags = [
      netHit > currentBalance ? 'Emergency cost is larger than available liquid balance.' : null,
    ].filter(Boolean)
    monthlyImpactLabel = 'Monthly cash flow after emergency'
  } else if (scenario === 'custom') {
    const monthlyIncomeChange = toNumber(inputs.monthlyIncomeChange || 0)
    const monthlyExpenseChange = toNumber(inputs.monthlyExpenseChange || 0)
    const customMonths = Math.max(1, Math.round(toNumber(inputs.durationMonths || 12, 12)))
    const customOneTime = Math.max(0, toNumber(inputs.oneTimeExpense || inputs.oneTimeHit || 0))
    immediateBalanceHit = customOneTime
    monthlyScenarioDelta = monthlySavings + monthlyIncomeChange - monthlyExpenseChange
    const endingBalance = currentBalance - customOneTime + (monthlyScenarioDelta * customMonths)
    status = endingBalance >= avgMonthlyExpense * 3 ? 'Manageable' : endingBalance >= 0 ? 'Tight' : 'Risky'
    verdict = `Your custom scenario leaves a projected balance of ${formatMoney(endingBalance)} over ${customMonths} months.`
    analysis = `This scenario changes monthly cash flow by ${formatMoney(monthlyIncomeChange - monthlyExpenseChange)} and adds an immediate hit of ${formatMoney(customOneTime)}. Ending balance: ${formatMoney(endingBalance)}.`
    actionSteps = [
      'Use the sliders to stress-test the exact numbers you expect.',
      'Track whether the event changes your emergency coverage below 3 months.',
      'Reduce the one-time hit before accepting the scenario.',
    ]
    riskFlags = [
      customOneTime > currentBalance ? 'One-time cost is above current liquid balance.' : null,
      monthlyScenarioDelta < 0 ? 'Monthly cash flow becomes negative.' : null,
    ].filter(Boolean)
    monthlyImpactLabel = 'Net monthly change'
  }

  const scenarioBaselineMonthlyDelta = monthlySavings
  const scenarioMonthlyDelta = monthlyScenarioDelta
  const startBalance = currentBalance - immediateBalanceHit
  const projection = buildProjectionSeries(startBalance, { baseline: scenarioBaselineMonthlyDelta, scenario: scenarioMonthlyDelta }, Math.min(12, durationMonths))
  const endingBalance = projection[projection.length - 1]?.scenario ?? startBalance
  const totalDelta = endingBalance - currentBalance

  const defaultResult = {
    scenarioKey: scenario,
    scenarioLabel: getScenarioLabel(scenario),
    status,
    verdict,
    analysis,
    metrics: [
      { label: 'Current balance', value: formatMoney(currentBalance) },
      { label: 'Emergency coverage', value: `${Math.max(0, emergencyCoverage).toFixed(1)} months` },
      { label: 'Immediate cash hit', value: formatMoney(immediateBalanceHit) },
      { label: monthlyImpactLabel, value: formatMoney(Math.abs(scenarioMonthlyDelta)) },
      { label: 'Projected ending balance', value: formatMoney(endingBalance) },
      { label: 'Total change vs today', value: formatMoney(totalDelta) },
    ],
    actionSteps,
    riskFlags,
    assumptions: [
      `Current monthly income is estimated at ${formatMoney(monthlyIncome)}.`,
      `Current monthly expense is estimated at ${formatMoney(monthlyExpense)}.`,
      `Recurring commitments are estimated at ${formatMoney(subscriptionBurden + debtBurden)} per month.`,
    ],
    projection,
    chartLabel: 'Projected Balance',
  }

  if (!model) return defaultResult

  try {
    const prompt = `You are FinWise's scenario engine. Refine the narrative for this financial simulation while preserving the computed numbers.
Scenario: ${getScenarioLabel(scenario)}
Inputs: ${JSON.stringify(inputs)}
Computed data: ${JSON.stringify(defaultResult)}

Return only a JSON object with these optional keys:
{
  "status": "Safe" | "Manageable" | "Tight" | "Risky",
  "verdict": "short, user-friendly verdict",
  "analysis": "one concise paragraph explaining the outcome",
  "actionSteps": ["step 1", "step 2", "step 3"],
  "riskFlags": ["risk 1", "risk 2"]
}
Do not modify metric values, projection values, or assumptions.`

    const result = await model.generateContent(prompt)
    const text = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(text)
    return {
      ...defaultResult,
      status: parsed.status || defaultResult.status,
      verdict: parsed.verdict || defaultResult.verdict,
      analysis: parsed.analysis || defaultResult.analysis,
      actionSteps: Array.isArray(parsed.actionSteps) && parsed.actionSteps.length ? parsed.actionSteps : defaultResult.actionSteps,
      riskFlags: Array.isArray(parsed.riskFlags) && parsed.riskFlags.length ? parsed.riskFlags : defaultResult.riskFlags,
    }
  } catch (err) {
    console.error('[Gemini Life Simulator error]', err)
    if (isRateLimitError(err)) {
      return defaultResult
    }
    return defaultResult
  }
}

/**
 * 5. Receipt Text / Image Parsing
 */
export async function parseReceipt(fileData, mimeType, rawText) {
  const model = getModel()
  const fallback = {
    amount: 150,
    merchant: 'Unknown Store',
    description: 'Unknown Store',
    date: new Date().toISOString().slice(0, 10),
    time: '',
    category: 'Other',
    items: [],
    paymentMethod: ''
  }

  if (!model) return fallback

  try {
    let contents = []
    if (fileData && mimeType) {
      contents.push({
        inlineData: {
          data: fileData,
          mimeType: mimeType
        }
      })
    }

    const textPrompt = `Analyze this receipt/bill image or document. Extract ALL available information:

    Required fields:
    - "merchant": name of the store, restaurant, or business (string)
    - "amount": total amount as a number (extract the final total, grand total, or amount paid)
    - "date": purchase date in YYYY-MM-DD format (use 2026 as year if not specified)
    - "category": assign one of: ${JSON.stringify(CATEGORIES)} based on the merchant type

    Optional fields (extract if available):
    - "time": time of purchase in HH:MM 24-hour format (string, or empty string if not found)
    - "items": array of purchased items, each with "name", "quantity" (number), and "price" (number)
    - "paymentMethod": payment type like "Cash", "Credit Card", "UPI", "Debit Card", etc.

    Important:
    - Be thorough - extract as much detail as possible
    - If items list is available, include all items with their quantities and individual prices
    - Look for payment method indicators like "CASH", "CARD", "UPI", "PAID VIA", etc.
    - For time, look for patterns like "TIME: 14:30" or "15:45:22" on the receipt
    - Never invent or guess missing information - use empty string or empty array for unavailable fields

    ${rawText ? `Raw text: "${rawText}"` : ''}

    Return ONLY a raw JSON object (no markdown blocks):
    {
      "merchant": "Store Name",
      "amount": 850.00,
      "date": "2026-08-11",
      "time": "14:30",
      "category": "Food",
      "items": [
        {"name": "Item 1", "quantity": 2, "price": 200},
        {"name": "Item 2", "quantity": 1, "price": 450}
      ],
      "paymentMethod": "UPI"
    }`

    contents.push(textPrompt)

    const result = await model.generateContent(contents)
    const text = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(text)

    // Ensure all fields exist with defaults
    return {
      merchant: parsed.merchant || parsed.description || 'Unknown Store',
      description: parsed.merchant || parsed.description || 'Unknown Store',
      amount: parsed.amount || 0,
      date: parsed.date || new Date().toISOString().slice(0, 10),
      time: parsed.time || '',
      category: parsed.category || 'Other',
      items: Array.isArray(parsed.items) ? parsed.items : [],
      paymentMethod: parsed.paymentMethod || ''
    }
  } catch (err) {
    console.error('[Gemini Receipt Parse error]', err)
    if (isRateLimitError(err)) {
      return fallback
    }
    return fallback
  }
}

/**
 * 6. Receipt / Statement Multi-Transaction Parsing (PDF or image)
 */
export async function parseStatement(fileData, mimeType, rawText) {
  const model = getModel()
  const fallback = []

  if (!model) return fallback

  try {
    let contents = []
    if (fileData && mimeType) {
      contents.push({
        inlineData: {
          data: fileData,
          mimeType: mimeType
        }
      })
    }

    const textPrompt = `Analyze this bank statement or transaction document. Extract EVERY transaction row listed.
    For each transaction, determine:
    - "date": transaction date in YYYY-MM-DD format (use current year 2026 if year not specified).
    - "description": merchant, payee, or transaction reference.
    - "amount": amount as a positive number.
    - "type": "income" for credits/deposits, "expense" for debits/payments/withdrawals.
    - "category": assign one of: ${JSON.stringify(CATEGORIES)}.
    
    ${rawText ? `Raw text: "${rawText}"` : ''}

    Return ONLY a raw JSON array of objects like:
    [{"date":"2026-05-12","description":"Starbucks","amount":450,"type":"expense","category":"Food"}]
    
    If no transactions can be extracted, return an empty array []. Do not include markdown block syntax.`

    contents.push(textPrompt)

    const result = await model.generateContent(contents)
    const text = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) {
      return parsed
    }
    return []
  } catch (err) {
    console.error('[Gemini Statement Parse error]', err)
    if (isRateLimitError(err)) {
      return fallback
    }
    return fallback
  }
}

/**
 * 7. Subscription Detection
 */
export async function detectSubscriptions(transactions) {
  const model = getModel()
  const expenses = transactions.filter(t => t.type === 'expense')

  // Offline mock recurring detection
  const recurringMap = {}
  for (const t of expenses) {
    const key = `${(t.description || '').toLowerCase().trim()}|${t.amount}`
    if (!key.startsWith('|')) {
      const ymKey = new Date(t.date).toISOString().slice(0, 7)
      if (!recurringMap[key]) recurringMap[key] = { months: new Set(), category: t.category, amount: t.amount, description: t.description }
      recurringMap[key].months.add(ymKey)
    }
  }
  const defaultSubs = Object.values(recurringMap)
    .filter(r => r.months.size >= 2)
    .map(r => ({
      description: r.description,
      category: r.category,
      amount: r.amount,
      frequency: 'Monthly',
      nextBillingDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 10).toISOString().slice(0, 10),
      confidence: 'medium',
      reason: `Appears in ${r.months.size} separate months. Code-detected.`
    }))

  if (!model) return defaultSubs

  try {
    const inputList = expenses.map(t => ({
      description: t.description,
      amount: t.amount,
      date: t.date.slice(0, 10),
      category: t.category
    }))

    const prompt = `Analyze these transaction records. Identify recurring monthly or yearly subscription services, SaaS tools, regular memberships, utility bills, or gym fees. Note that dates might shift slightly by a couple of days month-to-month, and amounts might vary slightly due to tax, exchange rates, or tier updates.
    Transactions: ${JSON.stringify(inputList)}
    
    Return ONLY a JSON array of objects. Each object MUST contain these keys:
    - "description": name of the service (e.g. "Netflix")
    - "category": choose from ${JSON.stringify(CATEGORIES)}
    - "amount": billing cost
    - "frequency": "Monthly" or "Yearly"
    - "nextBillingDate": estimate of next billing date in YYYY-MM-DD format (assume current date is August 2026)
    - "confidence": "high", "medium", or "low"
    - "reason": brief sentence why it was flagged
    
    Return the array. Do not include markdown headers.`

    const result = await model.generateContent(prompt)
    const text = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim()
    return JSON.parse(text)
  } catch (err) {
    console.error('[Gemini Subscription Detect error]', err)
    if (isRateLimitError(err)) {
      return defaultSubs
    }
    return defaultSubs
  }
}
