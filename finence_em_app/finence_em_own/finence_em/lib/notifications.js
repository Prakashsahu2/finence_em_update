import { v4 as uuidv4 } from 'uuid'

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export async function generateNotifications(db, userId, options = {}) {
  const now = new Date()
  const transactions = await db.collection('transactions').find({ userId }).toArray()
  const budgetDoc = await db.collection('budgets').findOne({ userId })
  const settings = await db.collection('user_settings').findOne({ userId })
  const created = []
  const add = async (notification, dedupeKey) => {
    const existing = await db.collection('notifications').findOne({ userId, dedupeKey })
    if (existing) return
    const item = { id: uuidv4(), userId, ...notification, dedupeKey, is_read: false, created_at: now.toISOString() }
    await db.collection('notifications').insertOne(item); created.push(item)
  }
  const monthKey = now.toISOString().slice(0, 7)
  const expenses = transactions.filter((item) => item.type === 'expense')
  const categories = {}
  expenses.filter((item) => String(item.date).slice(0, 7) === monthKey).forEach((item) => { categories[item.category] = (categories[item.category] || 0) + Number(item.amount || 0) })
  for (const [category, limit] of Object.entries(budgetDoc?.budget || {})) {
    const spent = categories[category] || 0; const percent = limit > 0 ? spent / Number(limit) : 0
    if (percent >= 1) await add({ title: 'Budget exceeded', message: `You have exceeded your ${category} budget by ${money(spent - Number(limit))}.`, type: 'BUDGET_EXCEEDED', priority: 'high', related_budget_id: category }, `budget:${monthKey}:${category}:100`)
    else if (percent >= 0.8) await add({ title: 'Budget warning', message: `You have used ${Math.round(percent * 100)}% of your ${category} budget this month.`, type: 'BUDGET_EXCEEDED', priority: 'medium', related_budget_id: category }, `budget:${monthKey}:${category}:80`)
  }
  const income = transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const spent = transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const balance = income - spent
  const threshold = Number(options.lowBalanceThreshold ?? settings?.lowBalanceThreshold ?? 0)
  if (threshold > 0 && balance < threshold) await add({ title: 'Low balance alert', message: `Your current balance is ${money(balance)}, below your configured threshold.`, type: 'LOW_BALANCE', priority: 'high' }, `balance:${monthKey}:${Math.floor(balance)}`)
  const goals = await db.collection('savings_goals').find({ userId }).toArray()
  for (const goal of goals) {
    const progress = Number(goal.targetAmount) > 0 ? Number(goal.currentAmount || goal.savedAmount || 0) / Number(goal.targetAmount) : 0
    for (const milestone of [25, 50, 75, 100]) {
      if (progress >= milestone / 100) await add({ title: 'Savings milestone achieved', message: `Congratulations! You have completed ${milestone}% of your ${goal.name || 'savings'} goal.`, type: 'SAVINGS_MILESTONE', priority: milestone === 100 ? 'high' : 'medium', related_goal_id: String(goal.id || goal._id) }, `goal:${goal.id || goal._id}:${milestone}`)
    }
  }
  const bills = await db.collection('bills').find({ userId }).toArray()
  for (const bill of bills) {
    const due = new Date(bill.dueDate || bill.nextDueDate)
    const days = Math.ceil((due - now) / 86400000)
    if ([1, 3, 7].includes(days)) await add({ title: 'Upcoming bill payment', message: `Reminder: ${bill.name || bill.description || 'Your bill'} payment is due in ${days} day${days === 1 ? '' : 's'}.`, type: 'UPCOMING_BILL', priority: days === 1 ? 'high' : 'medium' }, `bill:${bill.id || bill._id}:${due.toISOString().slice(0, 10)}:${days}`)
  }
  const averages = {}
  for (const item of expenses) { const category = item.category || 'Other'; averages[category] ||= []; averages[category].push(Number(item.amount || 0)) }
  const latest = options.transaction
  if (latest?.type === 'expense') { const values = averages[latest.category] || []; const average = values.length > 1 ? values.slice(0, -1).reduce((sum, value) => sum + value, 0) / (values.length - 1) : 0; if (average > 0 && Number(latest.amount) >= average * 2.5) await add({ title: 'Unusual spending detected', message: `Your ${money(latest.amount)} ${latest.category} expense is significantly higher than your normal spending.`, type: 'UNUSUAL_SPENDING', priority: 'medium', related_transaction_id: latest.id }, `unusual:${latest.id}`) }
  return created
}
