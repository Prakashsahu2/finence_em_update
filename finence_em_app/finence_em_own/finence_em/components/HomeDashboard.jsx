'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Brain,
  Calculator,
  CalendarDays,
  ChevronRight,
  Clock3,
  CreditCard,
  DollarSign,
  Flame,
  Gift,
  Goal,
  Lightbulb,
  Menu,
  Mic,
  PiggyBank,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  Award,
  Sparkles,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Wallet,
  Waves,
  Zap,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

const CATEGORY_COLOR_MAP = [
  '#818cf8', '#38bdf8', '#14b8a6', '#22c55e', '#eab308', '#f97316', '#fb7185', '#a855f7', '#06b6d4', '#60a5fa', '#c084fc', '#94a3b8',
]

const NAV_ACTIONS = [
  { label: 'Add expense', tab: 'transactions', action: 'expense' },
  { label: 'Add income', tab: 'transactions', action: 'income' },
  { label: 'Open budget', tab: 'budget' },
  { label: 'Check subscriptions', tab: 'subscriptions' },
  { label: 'Run life simulator', tab: 'simulator' },
  { label: 'Ask AI', tab: 'assistant' },
  { label: 'View predictions', tab: 'predictions' },
  { label: 'View transactions', tab: 'transactions' },
  { label: 'Open affordability', tab: 'affordability' },
]

function inr(value) {
  const number = Number(value || 0)
  return `₹${number.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function round(value, digits = 2) {
  return Math.round(Number(value || 0) * 10 ** digits) / 10 ** digits
}

function sum(values) {
  return values.reduce((acc, value) => acc + Number(value || 0), 0)
}

function mean(values) {
  return values.length ? sum(values) / values.length : 0
}

function monthKey(dateValue) {
  const date = new Date(dateValue)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function dayKey(dateValue) {
  const date = new Date(dateValue)
  return date.toISOString().slice(0, 10)
}

function isWeekend(dateValue) {
  const day = new Date(dateValue).getDay()
  return day === 0 || day === 6
}

function classifyTransaction(transaction) {
  const text = `${transaction.category || ''} ${transaction.description || ''}`.toLowerCase()
  if (/(rent|utility|electricity|water|internet|gas|loan|emi|mortgage|insurance|health|education|school|college|tuition|medical)/i.test(text)) return 'needs'
  if (/(food|restaurant|order|zomato|swiggy|shopping|amazon|flipkart|myntra|travel|uber|ola|movie|entertainment|game|coffee|cafe)/i.test(text)) return 'wants'
  if (transaction.type === 'income') return 'savings'
  return 'wants'
}

function animatedValue(value, duration = 900) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const start = performance.now()
    const target = Number(value || 0)
    let raf = 0

    const step = (now) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - progress) ** 3
      setDisplayValue(target * eased)
      if (progress < 1) raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return displayValue
}

function AnimatedCounter({ value, prefix = '', suffix = '', decimals = 0, className = '' }) {
  const animated = animatedValue(value)
  const formatted = Number(animated || 0).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return <span className={className}>{prefix}{formatted}{suffix}</span>
}

function getRelativeDateLabel(dateValue) {
  const today = dayKey(new Date())
  const input = dayKey(dateValue)
  const diff = Math.round((new Date(today) - new Date(input)) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff > 1 && diff <= 6) return `${diff} days ago`
  return new Date(dateValue).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

function computeScoreBreakdown(data) {
  if (!data) return { score: 0, breakdown: { incomeStability: 0, savingsRate: 0, expenseControl: 0, budgetAdherence: 0, emergencyFund: 0, debtManagement: 0, consistencyBonus: 0 }, grade: 'N/A', label: 'No Data' }
  const { summary, budgetAnalysis, spending } = data
  const totalIncome = Number(summary?.totalIncome || 0)
  const totalExpense = Number(summary?.totalExpense || 0)
  const savingsRate = Number(summary?.savingsRate || 0)
  const currentBalance = Number(summary?.currentBalance || 0)
  const expenseRatio = totalIncome > 0 ? totalExpense / totalIncome : 1
  const monthlyTrend = spending?.monthlyTrend || []
  const incomeSeries = monthlyTrend.map((item) => Number(item.income || 0)).filter((value) => value > 0)
  const meanIncome = incomeSeries.length ? mean(incomeSeries) : totalIncome
  const volatility = incomeSeries.length > 1 ? Math.sqrt(mean(incomeSeries.map((value) => (value - meanIncome) ** 2))) / (meanIncome || 1) : 1
  const debtRatio = budgetAnalysis?.length ? budgetAnalysis.find((item) => /loan|emi|debt/i.test(item.category || ''))?.usagePercent || 0 : 0

  const incomeStability = incomeSeries.length >= 2 ? Math.max(0, Math.min(20, Math.round(20 * (1 - Math.min(volatility, 1))))) : incomeSeries.length === 1 ? 14 : 0
  const savingsRateScore = savingsRate >= 30 ? 20 : savingsRate >= 20 ? 17 : savingsRate >= 10 ? 12 : savingsRate >= 0 ? 6 : 0
  const expenseControl = expenseRatio <= 0.5 ? 15 : expenseRatio <= 0.7 ? 12 : expenseRatio <= 0.85 ? 8 : expenseRatio <= 1 ? 4 : 0
  const budgetAdherence = budgetAnalysis?.length ? Math.round((budgetAnalysis.filter((item) => item.status !== 'over').length / budgetAnalysis.length) * 15) : 8
  const avgMonthlyExpense = monthlyTrend.length ? mean(monthlyTrend.map((item) => Number(item.expense || 0))) : totalExpense / 3 || 1
  const monthsCovered = avgMonthlyExpense > 0 ? currentBalance / avgMonthlyExpense : 0
  const emergencyFund = monthsCovered >= 6 ? 15 : monthsCovered >= 3 ? 11 : monthsCovered >= 1 ? 6 : monthsCovered > 0 ? 3 : 0
  const debtScore = debtRatio === 0 ? 15 : debtRatio <= 0.1 ? 13 : debtRatio <= 0.2 ? 10 : debtRatio <= 0.35 ? 6 : debtRatio <= 0.5 ? 3 : 0
  const total = incomeStability + savingsRateScore + expenseControl + budgetAdherence + emergencyFund + debtScore
  const grade = total >= 85 ? 'Excellent' : total >= 70 ? 'Good' : total >= 55 ? 'Fair' : total >= 40 ? 'Needs Attention' : 'Critical'

  return {
    total,
    grade,
    breakdown: { incomeStability, savingsRate: savingsRateScore, expenseControl, budgetAdherence, emergencyFund, debtRatio: debtScore },
  }
}

function computeCibilScore(analysis, transactions) {
  const summary = analysis?.summary || {}
  const spending = analysis?.spending || {}
  const budgetAnalysis = analysis?.budgetAnalysis || []
  const totalIncome = Number(summary.totalIncome || 0)
  const totalExpense = Number(summary.totalExpense || 0)
  const currentBalance = Number(summary.currentBalance || 0)
  const monthlyTrend = spending.monthlyTrend || []
  const categoryBreakdown = spending.categoryBreakdown || []

  // Factor 1: Payment History (35%) — budget adherence as proxy for on-time payments
  const budgetItems = budgetAnalysis.length || 0
  const onBudgetItems = budgetAnalysis.filter((b) => b.status !== 'over').length
  const paymentHistoryRatio = budgetItems > 0 ? onBudgetItems / budgetItems : 0.7
  const paymentHistoryScore = paymentHistoryRatio * 35

  // Factor 2: Credit Utilization (30%) — expense-to-income ratio
  const utilization = totalIncome > 0 ? Math.min(1, totalExpense / totalIncome) : 1
  const utilizationScore = (1 - utilization) * 30

  // Factor 3: Credit Age / Account Age (15%) — months of transaction history
  const txDates = (transactions || []).map((t) => new Date(t.date).getTime()).filter(Boolean)
  const historyMonths = txDates.length >= 2 ? Math.max(1, Math.round((Math.max(...txDates) - Math.min(...txDates)) / (30 * 24 * 60 * 60 * 1000))) : monthlyTrend.length || 1
  const ageFactor = Math.min(1, historyMonths / 24)
  const creditAgeScore = ageFactor * 15

  // Factor 4: Debt-to-Income (10%) — EMI/loan categories vs income
  const debtCategories = budgetAnalysis.filter((b) => /loan|emi|debt|mortgage/i.test(b.category || ''))
  const debtTotal = debtCategories.reduce((acc, b) => acc + Number(b.spent || 0), 0)
  const dtiRatio = totalIncome > 0 ? Math.min(1, debtTotal / totalIncome) : 0
  const debtScore = (1 - dtiRatio) * 10

  // Factor 5: Spending Diversity (10%) — number of distinct categories
  const uniqueCategories = new Set((transactions || []).map((t) => (t.category || 'Other').toLowerCase())).size
  const diversityFactor = Math.min(1, uniqueCategories / 8)
  const diversityScore = diversityFactor * 10

  // Total normalized to 300-900
  const rawTotal = paymentHistoryScore + utilizationScore + creditAgeScore + debtScore + diversityScore
  const score = Math.round(300 + (rawTotal / 100) * 600)
  const clampedScore = Math.max(300, Math.min(900, score))

  const rating = clampedScore >= 800 ? 'Excellent' : clampedScore >= 700 ? 'Good' : clampedScore >= 600 ? 'Fair' : clampedScore >= 450 ? 'Poor' : 'Very Poor'
  const ratingColor = clampedScore >= 800 ? 'text-emerald-300' : clampedScore >= 700 ? 'text-green-300' : clampedScore >= 600 ? 'text-amber-300' : clampedScore >= 450 ? 'text-orange-300' : 'text-rose-300'

  const factors = [
    {
      name: 'Payment History',
      score: Math.round(paymentHistoryScore),
      max: 35,
      percent: Math.round((paymentHistoryScore / 35) * 100),
      status: paymentHistoryRatio >= 0.9 ? 'Excellent' : paymentHistoryRatio >= 0.7 ? 'Good' : paymentHistoryRatio >= 0.5 ? 'Fair' : 'Needs Work',
      tip: paymentHistoryRatio >= 0.9 ? 'Great! You\'re staying within your budgets consistently.' : 'Try to stay within your budget limits to improve this factor.',
      color: '#22c55e',
    },
    {
      name: 'Credit Utilization',
      score: Math.round(utilizationScore),
      max: 30,
      percent: Math.round((utilizationScore / 30) * 100),
      status: utilization <= 0.3 ? 'Excellent' : utilization <= 0.5 ? 'Good' : utilization <= 0.7 ? 'Fair' : 'High',
      tip: utilization <= 0.5 ? 'Your spending-to-income ratio is healthy.' : 'Aim to keep expenses below 50% of income for a better score.',
      color: '#38bdf8',
    },
    {
      name: 'Account Age',
      score: Math.round(creditAgeScore),
      max: 15,
      percent: Math.round((creditAgeScore / 15) * 100),
      status: historyMonths >= 24 ? 'Excellent' : historyMonths >= 12 ? 'Good' : historyMonths >= 6 ? 'Building' : 'New',
      tip: historyMonths >= 12 ? 'A longer financial history strengthens your profile.' : 'Keep tracking — this factor improves automatically over time.',
      color: '#a855f7',
    },
    {
      name: 'Debt-to-Income',
      score: Math.round(debtScore),
      max: 10,
      percent: Math.round((debtScore / 10) * 100),
      status: dtiRatio <= 0.1 ? 'Excellent' : dtiRatio <= 0.25 ? 'Good' : dtiRatio <= 0.4 ? 'Moderate' : 'High',
      tip: dtiRatio <= 0.25 ? 'Your debt load is manageable.' : 'Reducing EMI or loan commitments will improve this score.',
      color: '#f59e0b',
    },
    {
      name: 'Spending Diversity',
      score: Math.round(diversityScore),
      max: 10,
      percent: Math.round((diversityScore / 10) * 100),
      status: uniqueCategories >= 8 ? 'Excellent' : uniqueCategories >= 5 ? 'Good' : uniqueCategories >= 3 ? 'Fair' : 'Limited',
      tip: uniqueCategories >= 5 ? 'Healthy mix of spending categories.' : 'Diversified spending patterns indicate financial maturity.',
      color: '#fb7185',
    },
  ]

  return { score: clampedScore, rating, ratingColor, factors }
}

function computeFinancialWeather(score, savingsRate, expenseRatio, emergencyMonths, debtLoad, budgetPressure) {
  const riskValue = (100 - score) * 0.35 + Math.max(0, 1 - savingsRate / 25) * 15 + Math.max(0, expenseRatio - 0.8) * 35 + Math.max(0, 3 - emergencyMonths) * 10 + Math.max(0, debtLoad) + Math.max(0, budgetPressure)

  if (riskValue <= 15) return { label: 'SUNNY', icon: '☀️', tone: 'text-amber-300', bg: 'from-emerald-500/15 to-cyan-500/10', note: 'Finances are healthy.' }
  if (riskValue <= 30) return { label: 'STABLE', icon: '🌤', tone: 'text-sky-300', bg: 'from-sky-500/15 to-indigo-500/10', note: 'Finances are generally under control.' }
  if (riskValue <= 45) return { label: 'CAUTION', icon: '🌥', tone: 'text-amber-300', bg: 'from-amber-500/15 to-orange-500/10', note: 'Some spending needs attention.' }
  if (riskValue <= 65) return { label: 'HIGH PRESSURE', icon: '🌧', tone: 'text-rose-300', bg: 'from-rose-500/15 to-red-500/10', note: 'Expenses are creating financial pressure.' }
  return { label: 'CRITICAL', icon: '⛈', tone: 'text-red-300', bg: 'from-red-500/20 to-slate-900/10', note: 'Immediate financial adjustments may be needed.' }
}

function computeCurrentMonthDailyMap(transactions) {
  const now = new Date()
  const monthIndex = now.getMonth()
  const year = now.getFullYear()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const buckets = Array.from({ length: daysInMonth }, (_, index) => ({ day: index + 1, total: 0, income: 0, expense: 0, items: [] }))

  for (const transaction of transactions || []) {
    const date = new Date(transaction.date)
    if (date.getMonth() === monthIndex && date.getFullYear() === year) {
      const bucket = buckets[date.getDate() - 1]
      const amount = Number(transaction.amount || 0)
      bucket.total += amount
      if (transaction.type === 'income') bucket.income += amount
      else bucket.expense += amount
      bucket.items.push(transaction)
    }
  }

  return buckets
}

function computeFlowBuckets(transactions) {
  const needs = []
  const wants = []
  const savings = []

  for (const transaction of transactions || []) {
    const bucket = classifyTransaction(transaction)
    if (bucket === 'needs') needs.push(transaction)
    else if (bucket === 'savings') savings.push(transaction)
    else wants.push(transaction)
  }

  const reduceBucket = (list) => list.reduce((acc, transaction) => acc + Number(transaction.amount || 0), 0)
  return {
    income: transactions.filter((transaction) => transaction.type === 'income').reduce((acc, transaction) => acc + Number(transaction.amount || 0), 0),
    needs: reduceBucket(needs),
    wants: reduceBucket(wants),
    savings: reduceBucket(savings),
    bucketTransactions: { needs, wants, savings },
  }
}

function computeFinancialPulse(analysis, transactions, budgetAnalysis) {
  const summary = analysis?.summary || {}
  const spending = analysis?.spending || {}
  const predictions = analysis?.predictions || {}
  const totalIncome = Number(summary.totalIncome || 0)
  const totalExpense = Number(summary.totalExpense || 0)
  const currentBalance = Number(summary.currentBalance || 0)
  const savingsRate = Number(summary.savingsRate || 0)
  const expenseRatio = totalIncome > 0 ? totalExpense / totalIncome : 1
  const monthlyTrend = spending.monthlyTrend || []
  const lastMonth = monthlyTrend.at(-1)
  const prevMonth = monthlyTrend.at(-2)
  const deltaIncome = lastMonth && prevMonth && prevMonth.income ? ((lastMonth.income - prevMonth.income) / prevMonth.income) * 100 : 0
  const deltaExpense = lastMonth && prevMonth && prevMonth.expense ? ((lastMonth.expense - prevMonth.expense) / prevMonth.expense) * 100 : 0
  const dailyAverage = Number(spending.dailyAverage || 0)
  const weeklyAverage = dailyAverage * 7
  const emergencyMonths = dailyAverage > 0 ? currentBalance / (dailyAverage * 30) : 0
  const debtLoad = (budgetAnalysis || []).filter((item) => /loan|emi|debt/i.test(item.category || '')).reduce((acc, item) => acc + Number(item.spent || 0), 0)

  return [
    {
      label: 'Cash Flow',
      value: currentBalance >= 0 ? `+${inr(currentBalance)}` : `-${inr(Math.abs(currentBalance))}`,
      state: currentBalance >= 0 ? 'Positive' : 'Negative',
      tone: currentBalance >= 0 ? 'text-emerald-300' : 'text-rose-300',
    },
    {
      label: 'Savings Momentum',
      value: `${deltaIncome >= 0 ? '↑' : '↓'} ${Math.abs(round(savingsRate ? savingsRate : deltaExpense, 1))}%`,
      state: savingsRate >= 20 ? 'Improving' : savingsRate >= 10 ? 'Steady' : 'Soft',
      tone: savingsRate >= 20 ? 'text-emerald-300' : savingsRate >= 10 ? 'text-sky-300' : 'text-amber-300',
    },
    {
      label: 'Spending Pressure',
      value: `${Math.min(100, Math.round(expenseRatio * 100))}/100`,
      state: expenseRatio <= 0.7 ? 'Controlled' : expenseRatio <= 0.9 ? 'Watch' : 'High',
      tone: expenseRatio <= 0.7 ? 'text-emerald-300' : expenseRatio <= 0.9 ? 'text-amber-300' : 'text-rose-300',
    },
    {
      label: 'Financial Safety',
      value: `${round(emergencyMonths, 1)} months`,
      state: emergencyMonths >= 6 ? 'Strong' : emergencyMonths >= 3 ? 'Safe' : emergencyMonths >= 1 ? 'Tight' : 'Critical',
      tone: emergencyMonths >= 3 ? 'text-sky-300' : 'text-amber-300',
    },
  ].map((item) => ({ ...item, debtLoad, weeklyAverage, predictions }))
}

function computeMoneyLeaks(transactions) {
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const currentMonthTransactions = (transactions || []).filter((transaction) => {
    const date = new Date(transaction.date)
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear
  })
  const prevMonthTransactions = (transactions || []).filter((transaction) => {
    const date = new Date(transaction.date)
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
    return date.getMonth() === prevMonth && date.getFullYear() === prevYear
  })

  const smallPurchases = currentMonthTransactions.filter((transaction) => transaction.type === 'expense' && Number(transaction.amount || 0) < 200)
  const foodCurrent = currentMonthTransactions.filter((transaction) => /food|restaurant|order|zomato|swiggy|cafe|dinner|lunch/i.test(`${transaction.category} ${transaction.description}`)).reduce((acc, transaction) => acc + Number(transaction.amount || 0), 0)
  const foodPrevious = prevMonthTransactions.filter((transaction) => /food|restaurant|order|zomato|swiggy|cafe|dinner|lunch/i.test(`${transaction.category} ${transaction.description}`)).reduce((acc, transaction) => acc + Number(transaction.amount || 0), 0)
  const weekendSpend = currentMonthTransactions.filter((transaction) => transaction.type === 'expense' && isWeekend(transaction.date)).reduce((acc, transaction) => acc + Number(transaction.amount || 0), 0)
  const weekdaySpend = currentMonthTransactions.filter((transaction) => transaction.type === 'expense' && !isWeekend(transaction.date)).reduce((acc, transaction) => acc + Number(transaction.amount || 0), 0)
  const categoryMonthMap = new Map()
  const categoryPrevMap = new Map()

  for (const transaction of currentMonthTransactions) {
    if (transaction.type !== 'expense') continue
    const key = transaction.category || 'Other'
    categoryMonthMap.set(key, (categoryMonthMap.get(key) || 0) + Number(transaction.amount || 0))
  }
  for (const transaction of prevMonthTransactions) {
    if (transaction.type !== 'expense') continue
    const key = transaction.category || 'Other'
    categoryPrevMap.set(key, (categoryPrevMap.get(key) || 0) + Number(transaction.amount || 0))
  }

  const increasedCategories = [...categoryMonthMap.entries()]
    .map(([category, amount]) => ({ category, amount, increase: amount - (categoryPrevMap.get(category) || 0) }))
    .filter((item) => item.increase > 0)
    .sort((a, b) => b.increase - a.increase)

  const duplicates = []
  const recurring = new Map()
  for (const transaction of transactions || []) {
    const key = `${(transaction.description || '').toLowerCase().trim()}|${Number(transaction.amount || 0)}`
    if (!recurring.has(key)) recurring.set(key, new Set())
    recurring.get(key).add(monthKey(transaction.date))
  }

  for (const [key, months] of recurring.entries()) {
    const [description, amount] = key.split('|')
    if (description && amount && months.size >= 2 && /netflix|spotify|prime|hotstar|youtube|subscription|membership/i.test(description)) {
      duplicates.push({
        description,
        amount: Number(amount),
        saving: Number(amount),
        text: `Possible unused recurring charge: ${description} at ${inr(Number(amount))}/month.`,
      })
    }
  }

  const leaks = []
  if (smallPurchases.length) leaks.push({ label: 'Small purchases below ₹200', value: inr(sum(smallPurchases.map((transaction) => transaction.amount))), detail: `${smallPurchases.length} small expenses this month.`, tone: 'warning' })
  if (foodCurrent > foodPrevious && foodCurrent - foodPrevious > 0) leaks.push({ label: 'Extra food spending', value: inr(foodCurrent - foodPrevious), detail: 'Food spending is higher than last month.', tone: 'warning' })
  if (weekendSpend > weekdaySpend * 0.45 && weekendSpend > 0) leaks.push({ label: 'Weekend overspending', value: inr(weekendSpend), detail: 'Weekend expenses are disproportionately high.', tone: 'warning' })
  if (increasedCategories.length) leaks.push({ label: 'Increasing category', value: `${increasedCategories[0].category}`, detail: `Up ${inr(increasedCategories[0].increase)} vs last month.`, tone: 'neutral' })
  duplicates.forEach((item) => leaks.push({ label: 'Duplicate subscription', value: inr(item.amount), detail: item.text, tone: 'warning' }))

  return leaks.length ? leaks : [{ label: 'No significant money leaks detected.', value: '', detail: 'Your current transaction history does not show clear leak patterns.', tone: 'success' }]
}

function computeWeeklyStory(transactions) {
  const dates = []
  const now = new Date()
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(now)
    date.setDate(now.getDate() - i)
    dates.push(dayKey(date))
  }

  const map = new Map(dates.map((date) => [date, 0]))
  for (const transaction of transactions || []) {
    const key = dayKey(transaction.date)
    if (map.has(key) && transaction.type === 'expense') map.set(key, map.get(key) + Number(transaction.amount || 0))
  }

  const series = dates.map((date) => ({ day: new Date(date).toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase(), value: map.get(date) }))
  const highest = [...series].sort((a, b) => b.value - a.value)[0]
  const lowest = [...series].sort((a, b) => a.value - b.value)[0]

  return { series, highest, lowest }
}

function computeStreak(transactions, dailyTarget) {
  const map = new Map()
  for (const transaction of transactions || []) {
    if (transaction.type !== 'expense') continue
    const key = dayKey(transaction.date)
    map.set(key, (map.get(key) || 0) + Number(transaction.amount || 0))
  }

  const sortedDays = [...map.entries()].sort(([left], [right]) => left.localeCompare(right))
  let current = 0
  let longest = 0
  let savedMoney = 0
  const safeDailyTarget = Number(dailyTarget || 0)
  for (const [, value] of sortedDays) {
    if (value <= safeDailyTarget) {
      current += 1
      savedMoney += Math.max(0, safeDailyTarget - value)
      longest = Math.max(longest, current)
    } else {
      current = 0
    }
  }

  return { current: current || 0, longest, savedMoney }
}

function computeHealthHistory(monthlyTrend, budget) {
  if (!monthlyTrend || monthlyTrend.length === 0) return []
  const budgetTotal = sum(Object.values(budget || {})) || 1
  return monthlyTrend.map((entry) => {
    const income = Number(entry.income || 0)
    const expense = Number(entry.expense || 0)
    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0
    const expenseRatio = income > 0 ? expense / income : 1
    const budgetCoverage = budgetTotal > 0 ? Math.min(1, expense / budgetTotal) : 1
    const score = Math.max(0, Math.min(100, Math.round(20 + Math.max(0, savingsRate) * 1.5 + Math.max(0, (1 - expenseRatio)) * 30 + (1 - budgetCoverage) * 20)))
    return { month: entry.month, score }
  })
}

function computeTimeline(transactions, subscriptions) {
  const recent = [...(transactions || [])]
    .sort((left, right) => new Date(right.date) - new Date(left.date))
    .slice(0, 5)
    .map((transaction) => ({
      type: transaction.type === 'income' ? 'income' : 'expense',
      label: transaction.description || transaction.category || 'Transaction',
      amount: transaction.amount,
      date: getRelativeDateLabel(transaction.date),
      icon: transaction.type === 'income' ? TrendingUp : TrendingDown,
    }))

  const upcoming = (subscriptions || [])
    .slice(0, 3)
    .map((item) => ({
      type: 'upcoming',
      label: `${item.description || 'Subscription'} renewal`,
      amount: item.amount,
      date: item.nextBillingDate ? getRelativeDateLabel(item.nextBillingDate) : 'Upcoming',
      icon: Clock3,
    }))

  return [...recent, ...upcoming].slice(0, 8)
}

function computeGoals(analysis, budget) {
  const summary = analysis?.summary || {}
  const spending = analysis?.spending || {}
  const currentBalance = Number(summary.currentBalance || 0)
  const monthlyExpense = spending.monthlyTrend?.length ? mean(spending.monthlyTrend.map((item) => Number(item.expense || 0))) : Number(summary.totalExpense || 0) / 3 || 1
  const emergencyGoal = monthlyExpense * 3
  const emergencyRemaining = Math.max(0, emergencyGoal - currentBalance)
  const recurringSavings = (analysis?.detection?.recurringSubscriptions || []).reduce((acc, item) => acc + Number(item.amount || 0), 0)
  const budgetOver = (analysis?.budgetAnalysis || []).filter((item) => item.status === 'over').reduce((acc, item) => acc + Number(item.spent - item.budget || 0), 0)
  const spendGoal = Math.max(0, Math.round(monthlyExpense * 0.1))

  return [
    { title: 'Emergency Fund', current: Math.max(0, currentBalance - emergencyRemaining), target: emergencyGoal, remaining: emergencyRemaining, label: '3 months cover', icon: ShieldCheck, tone: 'emerald' },
    { title: 'Subscription Cleanup', current: Math.max(0, recurringSavings - recurringSavings * 0.15), target: recurringSavings, remaining: recurringSavings, label: 'Possible savings', icon: CreditCard, tone: 'indigo' },
    { title: 'Discretionary Cut', current: spendGoal ? Math.max(0, spendGoal - Math.round(spendGoal * 0.35)) : 0, target: spendGoal || 1, remaining: spendGoal, label: 'Lower dining & wants', icon: Goal, tone: 'amber' },
    { title: 'Budget Recovery', current: Math.max(0, budgetOver), target: Math.max(1, budgetOver * 1.2), remaining: Math.max(0, budgetOver * 0.2), label: 'Over-budget categories', icon: Wallet, tone: 'rose' },
  ]
}

function computeSummaryComparisons(monthlyTrend) {
  if (!monthlyTrend || monthlyTrend.length < 2) return { incomeChange: 0, expenseChange: 0, savingsChange: 0 }
  const current = monthlyTrend.at(-1)
  const previous = monthlyTrend.at(-2)
  const safePercent = (next, old) => (old > 0 ? ((next - old) / old) * 100 : 0)
  return {
    incomeChange: safePercent(Number(current.income || 0), Number(previous.income || 0)),
    expenseChange: safePercent(Number(current.expense || 0), Number(previous.expense || 0)),
    savingsChange: safePercent(Number(current.income || 0) - Number(current.expense || 0), Number(previous.income || 0) - Number(previous.expense || 0)),
  }
}

function buildNotifications(analysis, leaks, budget, summary) {
  const notifications = []
  const budgetAnalysis = analysis?.budgetAnalysis || []
  if (budgetAnalysis.some((item) => item.status === 'over')) notifications.push({ title: 'Budget Warning', text: 'One or more categories are above budget.', tone: 'warning' })
  if ((analysis?.detection?.recurringSubscriptions || []).length) notifications.push({ title: 'Subscription Due', text: 'Recurring charges were detected in your data.', tone: 'neutral' })
  if ((analysis?.summary?.savingsRate || 0) < 10) notifications.push({ title: 'Low Savings Rate', text: 'Your savings rate is below the healthy range.', tone: 'warning' })
  if (leaks.some((item) => item.label === 'Duplicate subscription')) notifications.push({ title: 'Unusual Expense', text: 'Potential duplicate subscription activity detected.', tone: 'warning' })
  if ((analysis?.predictions?.expectedSavings || 0) > 0) notifications.push({ title: 'AI Recommendation', text: 'You have room to improve monthly savings.', tone: 'success' })
  if ((analysis?.detection?.largeTransactions || []).length) notifications.push({ title: 'Achievement', text: 'Large transactions are being tracked automatically.', tone: 'success' })
  if (!notifications.length) notifications.push({ title: 'No alerts', text: 'Your dashboard is quiet right now.', tone: 'success' })
  return notifications.slice(0, 7)
}

function commandMatches(command, query) {
  return command.label.toLowerCase().includes(query.toLowerCase())
}

export default function HomeDashboard({
  user,
  analysis,
  transactions,
  budget,
  setActiveTab,
  setForm,
  setSimulatorScenario,
  onOpenReceiptScanner,
}) {
  const summary = analysis?.summary || {}
  const spending = analysis?.spending || {}
  const health = analysis?.healthScore || computeScoreBreakdown(analysis)
  const monthlyTrend = spending.monthlyTrend || []
  const categoryBreakdown = spending.categoryBreakdown || []
  const subscriptions = analysis?.detection?.recurringSubscriptions || []
  const aiBriefSource = analysis?.dashboardInsights || []

  const [selectedCategory, setSelectedCategory] = useState(null)
  const [moneyLeakOpen, setMoneyLeakOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [healthDialogOpen, setHealthDialogOpen] = useState(false)
  const [cibilDialogOpen, setCibilDialogOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const [simulatorScenario, setLocalSimulatorScenario] = useState('bike')

  const summaryComparisons = useMemo(() => computeSummaryComparisons(monthlyTrend), [monthlyTrend])
  const currentMonthDaily = useMemo(() => computeCurrentMonthDailyMap(transactions), [transactions])
  const flowBuckets = useMemo(() => computeFlowBuckets(transactions), [transactions])
  const pulseCards = useMemo(() => computeFinancialPulse(analysis, transactions, analysis?.budgetAnalysis || []), [analysis, transactions, budget])
  const weather = useMemo(() => computeFinancialWeather(
    health.total,
    Number(summary.savingsRate || 0),
    Number(summary.totalIncome || 0) > 0 ? Number(summary.totalExpense || 0) / Number(summary.totalIncome || 1) : 1,
    flowBuckets.income ? Number(summary.currentBalance || 0) / (mean(monthlyTrend.map((item) => Number(item.expense || 0))) || 1) : 0,
    (analysis?.budgetAnalysis || []).filter((item) => item.status === 'over').length * 6,
    (analysis?.budgetAnalysis || []).some((item) => item.status === 'over') ? 10 : 0,
  ), [health.total, summary, flowBuckets, monthlyTrend, analysis])
  const leaks = useMemo(() => computeMoneyLeaks(transactions), [transactions])
  const weeklyStory = useMemo(() => computeWeeklyStory(transactions), [transactions])
  const streak = useMemo(() => computeStreak(transactions, Math.max(1, mean(currentMonthDaily.map((item) => item.total)) * 0.8 || mean(currentMonthDaily.map((item) => item.expense)) || 500)), [transactions, currentMonthDaily])
  const goals = useMemo(() => computeGoals(analysis, budget), [analysis, budget])
  const notifications = useMemo(() => buildNotifications(analysis, leaks, budget, summary), [analysis, leaks, budget, summary])
  const history = useMemo(() => computeHealthHistory(monthlyTrend, budget), [monthlyTrend, budget])
  const cibilScore = useMemo(() => computeCibilScore(analysis, transactions), [analysis, transactions])
  const timeline = useMemo(() => computeTimeline(transactions, subscriptions), [transactions, subscriptions])
  const monthlyForecast = analysis?.predictions || {}
  const currentMonthIndex = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const currentMonthData = currentMonthDaily.map((day) => ({
    day: day.day,
    total: day.total,
    label: new Date(currentYear, currentMonthIndex, day.day).toLocaleDateString('en-IN', { day: 'numeric' }),
  }))

  const commandItems = useMemo(() => NAV_ACTIONS.filter((action) => commandMatches(action, commandQuery)), [commandQuery])
  const dailyAverage = spending.dailyAverage || (Number(summary.totalExpense || 0) / 30 || 0)
  const safeDailySpend = Math.max(0, dailyAverage * 0.72)
  const runwayDays = dailyAverage > 0 ? Number(summary.currentBalance || 0) / dailyAverage : 0
  const currentSavingsRate = Number(summary.savingsRate || 0)
  const healthChange = history.length >= 2 ? history.at(-1).score - history.at(-2).score : 0
  const bestScore = history.length ? Math.max(...history.map((item) => item.score)) : health.total
  const averageScore = history.length ? round(mean(history.map((item) => item.score)), 1) : health.total
  const incomeCategories = categoryBreakdown.filter((item) => item.amount > 0).slice(0, 5)
  const defaultHero = aiBriefSource[0]?.text || (summary.savingsRate < 10 ? 'You are financially stable, but your savings rate is lower than target. Reducing discretionary spend can improve your score.' : 'Your finances look balanced. Keep monitoring spending to protect your cushion.')
  const financialStatus = currentSavingsRate >= 20 && health.total >= 70 ? 'STRONG' : currentSavingsRate >= 10 && health.total >= 55 ? 'STABLE' : 'NEEDS ATTENTION'
  const currentSimulatorScenario = simulatorScenario

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen(true)
      }
      if (event.key === 'Escape') {
        setCommandOpen(false)
        setQuickAddOpen(false)
        setNotificationsOpen(false)
        setMoneyLeakOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const openTab = (tab, preset) => {
    if (tab) setActiveTab(tab)
    if (preset && setForm) {
      setForm((prev) => ({
        ...prev,
        type: preset === 'income' ? 'income' : 'expense',
        category: preset === 'income' ? 'Salary' : 'Food',
      }))
    }
    setQuickAddOpen(false)
    setCommandOpen(false)
  }

  const handleScenarioOpen = (scenario) => {
    setLocalSimulatorScenario(scenario)
    if (setSimulatorScenario) setSimulatorScenario(scenario)
    setActiveTab('simulator')
  }

  const categories = useMemo(() => {
    const map = new Map()
    for (const transaction of transactions || []) {
      if (transaction.type !== 'expense') continue
      const key = transaction.category || 'Other'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(transaction)
    }
    return [...map.entries()].map(([category, items]) => ({ category, items, amount: sum(items.map((item) => item.amount || 0)) })).sort((left, right) => right.amount - left.amount)
  }, [transactions])

  const selectedCategoryItems = selectedCategory ? categories.find((item) => item.category === selectedCategory)?.items || [] : []

  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-[#070B17] text-slate-100 shadow-2xl ring-1 ring-white/10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(129,140,248,0.24),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.16),_transparent_26%),linear-gradient(180deg,_rgba(7,11,23,1)_0%,_rgba(7,11,23,0.98)_100%)]" />
      <div className="absolute inset-0 opacity-40 pointer-events-none bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative z-10 p-4 sm:p-5 lg:p-6 space-y-5">
        {/* Hero Section */}
        <div className="flex flex-col gap-4 rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:p-7">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
                <Sparkles className="h-3.5 w-3.5" /> FinWise Command Center
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {user?.name || 'there'} 👋
                </h1>
                <p className="mt-2 text-sm text-slate-300 sm:text-base">Here is your financial situation today.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge className={`border-0 px-3 py-1.5 text-xs font-semibold tracking-[0.16em] ${financialStatus === 'STRONG' ? 'bg-emerald-500/15 text-emerald-200' : financialStatus === 'STABLE' ? 'bg-sky-500/15 text-sky-200' : 'bg-amber-500/15 text-amber-200'}`}>
                  Financial Status: {financialStatus}
                </Badge>
                <p className="max-w-2xl text-sm leading-relaxed text-slate-300">
                  {defaultHero}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button onClick={() => setActiveTab('assistant')} className="rounded-full bg-gradient-to-r from-fuchsia-600/40 to-indigo-600/40 border-white/10 text-white hover:bg-fuchsia-600/50">
                  <Brain className="mr-2 h-4 w-4" /> Ask FinWise AI
                </Button>
                <Button onClick={() => handleScenarioOpen(currentSimulatorScenario)} className="rounded-full bg-gradient-to-r from-cyan-600/40 to-blue-600/40 border-white/10 text-white hover:bg-cyan-600/50">
                  <Calculator className="mr-2 h-4 w-4" /> Simulate a Decision
                </Button>
                <Button onClick={() => setQuickAddOpen(true)} className="rounded-full bg-white/10 border-white/10 text-white hover:bg-white/15">
                  <Plus className="mr-2 h-4 w-4" /> Quick Add
                </Button>
                {onOpenReceiptScanner && (
                  <Button onClick={onOpenReceiptScanner} className="rounded-full bg-gradient-to-r from-purple-600/40 to-fuchsia-600/40 border-white/10 text-white hover:bg-purple-600/50">
                    <Receipt className="mr-2 h-4 w-4" /> Scan Receipt 📸
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:min-w-[360px]">
              <Card className="border border-white/10 bg-white/6 shadow-lg backdrop-blur-xl">
                <CardContent className="p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Current Balance</div>
                  <div className="mt-2 text-2xl font-black text-white">
                    <AnimatedCounter value={summary.currentBalance || 0} prefix="₹" />
                  </div>
                  <div className={`mt-2 text-xs ${summaryComparisons.savingsChange >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {summaryComparisons.savingsChange >= 0 ? '↑' : '↓'} {Math.abs(round(summaryComparisons.savingsChange, 1))}% vs previous period
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-white/10 bg-white/6 shadow-lg backdrop-blur-xl">
                <CardContent className="p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Savings Rate</div>
                  <div className="mt-2 text-2xl font-black text-white"><AnimatedCounter value={summary.savingsRate || 0} suffix="%" decimals={1} /></div>
                  <div className="mt-2 text-xs text-slate-300">Target: 20%+</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Financial Command Center - Summary Cards */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          {[
            { label: 'Total Income', value: summary.totalIncome || 0, change: summaryComparisons.incomeChange, icon: TrendingUp, tone: 'emerald' },
            { label: 'Total Expense', value: summary.totalExpense || 0, change: summaryComparisons.expenseChange, icon: TrendingDown, tone: 'rose' },
            { label: 'Current Balance', value: summary.currentBalance || 0, change: summaryComparisons.savingsChange, icon: Wallet, tone: 'indigo' },
            { label: 'Total Savings', value: summary.savings || 0, change: summaryComparisons.savingsChange, icon: PiggyBank, tone: 'violet' },
            { label: 'Savings Rate', value: summary.savingsRate || 0, change: 0, icon: ShieldCheck, tone: 'amber', suffix: '%' },
          ].map((item) => (
            <Card key={item.label} className="group border border-white/10 bg-white/6 shadow-xl backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 hover:bg-white/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    <item.icon className="h-4 w-4" /> {item.label}
                  </div>
                  <Badge className={`border-0 ${item.tone === 'emerald' ? 'bg-emerald-500/15 text-emerald-200' : item.tone === 'rose' ? 'bg-rose-500/15 text-rose-200' : item.tone === 'amber' ? 'bg-amber-500/15 text-amber-200' : 'bg-sky-500/15 text-sky-200'}`}>
                    {item.change >= 0 ? '↑' : item.change < 0 ? '↓' : '•'} {Math.abs(round(item.change || 0, 1))}%
                  </Badge>
                </div>
                <div className="mt-3 text-2xl font-black text-white">
                  <AnimatedCounter value={item.value} prefix={item.label === 'Savings Rate' ? '' : '₹'} suffix={item.suffix || ''} decimals={item.label === 'Savings Rate' ? 1 : 0} />
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-white/10">
                  <div className={`h-full rounded-full ${item.tone === 'emerald' ? 'bg-emerald-400' : item.tone === 'rose' ? 'bg-rose-400' : item.tone === 'amber' ? 'bg-amber-400' : 'bg-sky-400'}`} style={{ width: `${Math.min(100, Math.abs(item.change || 48) + 42)}%` }} />
                </div>
                <div className="mt-2 text-xs text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">Hover for comparison details.</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Financial Pulse */}
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="border border-white/10 bg-white/6 shadow-xl backdrop-blur-xl">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-white"><Waves className="h-5 w-5 text-cyan-300" /> Financial Pulse</CardTitle>
              <CardDescription className="text-slate-300">What is happening with my money right now?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {pulseCards.map((card) => (
                  <div key={card.label} className="rounded-2xl border border-white/10 bg-black/20 p-4 transition-all hover:bg-black/25">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{card.label}</div>
                    <div className={`mt-2 text-xl font-black ${card.tone}`}>{card.value}</div>
                    <div className="mt-1 text-sm text-slate-300">{card.state}</div>
                    <div className="mt-3 h-1.5 rounded-full bg-white/10">
                      <div className={`h-full rounded-full ${card.state === 'Positive' || card.state === 'Strong' || card.state === 'Improving' || card.state === 'Controlled' ? 'bg-emerald-400' : card.state === 'Safe' || card.state === 'Steady' ? 'bg-sky-400' : card.state === 'High' || card.state === 'Critical' ? 'bg-rose-400' : 'bg-amber-400'}`} style={{ width: `${card.label === 'Cash Flow' ? Math.min(100, Math.abs(Number(summary.currentBalance || 0)) / 2000 + 55) : card.label === 'Financial Safety' ? Math.min(100, round((Number(summary.currentBalance || 0) / (mean(monthlyTrend.map((item) => item.expense || 0)) || 1)) * 16)) : card.label === 'Spending Pressure' ? Math.min(100, (Number(summary.totalExpense || 0) / Math.max(1, Number(summary.totalIncome || 1))) * 100) : Math.min(100, Math.abs(summary.savingsRate || 0) * 3 + 30)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className={`border border-white/10 bg-gradient-to-br ${weather.bg} shadow-xl backdrop-blur-xl`}>
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-white"><span className="text-3xl animate-pulse">{weather.icon}</span> Your Financial Weather</CardTitle>
              <CardDescription className="text-slate-200/80">{weather.note}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                <div className={`text-5xl ${weather.tone}`}>{weather.icon}</div>
                <div className="mt-4 text-sm uppercase tracking-[0.22em] text-slate-300">Status</div>
                <div className="mt-1 text-2xl font-black text-white">{weather.label}</div>
                <div className="mt-2 text-sm text-slate-300">Based on score, savings rate, spending pressure, emergency fund, and debt.</div>
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Health Score</div>
                  <div className="mt-2 text-3xl font-black text-white">{health.total} / 100</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Emergency Fund</div>
                  <div className="mt-2 text-3xl font-black text-white">{round((Number(summary.currentBalance || 0) / (mean(monthlyTrend.map((item) => item.expense || 0)) || 1)), 1)} months</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Daily Brief */}
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="border border-white/10 bg-white/6 shadow-xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><Sparkles className="h-5 w-5 text-fuchsia-300" /> FinWise AI Daily Brief</CardTitle>
              <CardDescription className="text-slate-300">3-4 useful insights from your actual financial data.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {(aiBriefSource.length ? aiBriefSource : [
                { title: 'Good', text: summaryComparisons.expenseChange < 0 ? `Your spending decreased ${Math.abs(round(summaryComparisons.expenseChange, 1))}% this month.` : 'Your monthly spending is stable.', tone: 'success', icon: 'trending-down' },
                { title: 'Attention', text: leaks[0]?.detail || 'Review categories with rising costs and recurring payments.', tone: 'warning', icon: 'alert-triangle' },
                { title: 'Opportunity', text: `Saving ${inr(Math.max(0, dailyAverage * 0.15))} per day could add about ${inr(Math.max(0, dailyAverage * 4.5))} monthly.`, tone: 'neutral', icon: 'piggy-bank' },
                { title: 'Upcoming', text: subscriptions[0] ? `${subscriptions[0].description} renews around ${subscriptions[0].nextBillingDate ? getRelativeDateLabel(subscriptions[0].nextBillingDate) : 'soon'}.` : 'No upcoming subscription due detected.', tone: 'neutral', icon: 'calendar' },
              ]).slice(0, 4).map((item, index) => (
                <div key={index} className={`rounded-2xl border p-4 ${item.tone === 'warning' ? 'border-amber-500/20 bg-amber-500/10' : item.tone === 'success' ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-white/10 bg-black/20'}`}>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                    {item.tone === 'warning' ? <TriangleAlert className="h-4 w-4 text-amber-300" /> : item.tone === 'success' ? <ShieldCheck className="h-4 w-4 text-emerald-300" /> : <Lightbulb className="h-4 w-4 text-cyan-300" />}
                    {item.title || 'Insight'}
                  </div>
                  <div className="mt-3 text-sm leading-relaxed text-slate-100">{item.text}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-white/6 shadow-xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><Bell className="h-5 w-5 text-sky-300" /> Notification Center</CardTitle>
              <CardDescription className="text-slate-300">Unread alerts and action prompts.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setNotificationsOpen(true)} className="w-full rounded-2xl bg-white/10 text-white hover:bg-white/15">
                <Bell className="mr-2 h-4 w-4" /> View notifications <Badge className="ml-2 bg-cyan-500/20 text-cyan-100">{notifications.length}</Badge>
              </Button>
              <div className="mt-4 space-y-2">
                {notifications.slice(0, 4).map((item, index) => (
                  <div key={index} className={`rounded-2xl border p-3 ${item.tone === 'warning' ? 'border-amber-500/20 bg-amber-500/10' : 'border-white/10 bg-black/20'}`}>
                    <div className="text-sm font-semibold text-white">{item.title}</div>
                    <div className="mt-1 text-xs text-slate-300">{item.text}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Money Flow Visualization */}
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="border border-white/10 bg-white/6 shadow-xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><PiggyBank className="h-5 w-5 text-emerald-300" /> Money Flow Visualization</CardTitle>
              <CardDescription className="text-slate-300">Where your money goes across needs, wants, and savings.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Income</div>
                  <div className="mt-2 text-3xl font-black text-white"><AnimatedCounter value={flowBuckets.income} prefix="₹" /></div>
                  <div className="mt-6 flex flex-col items-center gap-2 text-slate-400">
                    <ArrowRight className="h-5 w-5 rotate-90 text-cyan-300" />
                    <span className="text-xs uppercase tracking-[0.22em]">Flow</span>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { key: 'needs', label: 'Needs', amount: flowBuckets.needs, tone: 'emerald' },
                    { key: 'wants', label: 'Wants', amount: flowBuckets.wants, tone: 'amber' },
                    { key: 'savings', label: 'Savings', amount: flowBuckets.savings, tone: 'cyan' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(item.label === 'Savings' ? null : (categories.find((category) => category.category === item.label)?.category || selectedCategory))
                      }}
                      className={`rounded-3xl border border-white/10 p-4 text-left transition-transform hover:-translate-y-1 hover:bg-white/10 ${item.tone === 'emerald' ? 'bg-emerald-500/10' : item.tone === 'amber' ? 'bg-amber-500/10' : 'bg-cyan-500/10'}`}
                    >
                      <div className="text-xs uppercase tracking-[0.22em] text-slate-400">{item.label}</div>
                      <div className="mt-3 text-2xl font-black text-white">{inr(item.amount)}</div>
                      <div className="mt-2 text-xs text-slate-300">Click a category to view transactions.</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {incomeCategories.map((category) => (
                  <button key={category.category} type="button" onClick={() => setSelectedCategory(category.category)} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:bg-black/30">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{category.category}</div>
                    <div className="mt-2 text-xl font-black text-white">{inr(category.amount)}</div>
                  </button>
                ))}
              </div>
              <div className="mt-5 h-72 rounded-3xl border border-white/10 bg-black/20 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={currentMonthData.slice(0, 12)}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="label" stroke="#cbd5e1" />
                    <YAxis stroke="#cbd5e1" />
                    <Tooltip formatter={(value) => inr(value)} />
                    <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                      {currentMonthData.slice(0, 12).map((entry, index) => (
                        <Cell key={index} fill={CATEGORY_COLOR_MAP[index % CATEGORY_COLOR_MAP.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-white/6 shadow-xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><Flame className="h-5 w-5 text-orange-300" /> Money Leak Radar</CardTitle>
              <CardDescription className="text-slate-300">Detected patterns from your transaction history.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {leaks.map((item, index) => (
                <div key={index} className={`rounded-2xl border p-4 ${item.tone === 'success' ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-white/10 bg-black/20'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">{item.label}</div>
                      <div className="mt-1 text-xs text-slate-300">{item.detail}</div>
                    </div>
                    <div className="text-sm font-black text-white">{item.value}</div>
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <Button onClick={() => setMoneyLeakOpen(true)} className="w-full rounded-2xl bg-white/10 text-white hover:bg-white/15">
                  View Money Leaks <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Smart Action Center + Cash Runway */}
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="border border-white/10 bg-white/6 shadow-xl backdrop-blur-xl xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><Goal className="h-5 w-5 text-emerald-300" /> Smart Action Center</CardTitle>
              <CardDescription className="text-slate-300">Recommended actions based on your current data.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { title: `SAVE ${inr(Math.max(0, Math.round(dailyAverage * 6)))}`, detail: 'Reduce dining spending this month.', button: 'Create Budget', tab: 'budget', icon: Wallet },
                  { title: 'REVIEW SUBSCRIPTION', detail: `Potential saving: ${inr(subscriptions.reduce((acc, item) => acc + Number(item.amount || 0), 0))}/month.`, button: 'Review', tab: 'subscriptions', icon: CreditCard },
                  { title: 'BUILD EMERGENCY FUND', detail: `${inr(Math.max(0, Math.round(mean(monthlyTrend.map((item) => item.expense || 0)) * 3 - (summary.currentBalance || 0))))} more needed to reach 3 months.`, button: 'Start Goal', tab: 'budget', icon: ShieldCheck },
                  { title: 'LOWER FINANCIAL RISK', detail: 'Reduce discretionary expenses by 10%.', button: 'Ask AI', tab: 'assistant', icon: Brain },
                ].map((action, index) => (
                  <div key={index} className="rounded-3xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          <action.icon className="h-4 w-4 text-cyan-300" /> {action.title}
                        </div>
                        <div className="mt-2 text-sm text-slate-200">{action.detail}</div>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button onClick={() => setActiveTab(action.tab)} className="rounded-full bg-white/10 text-white hover:bg-white/15">
                        {action.button}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-white/6 shadow-xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><Clock3 className="h-5 w-5 text-sky-300" /> Cash Runway</CardTitle>
              <CardDescription className="text-slate-300">How long your available funds can cover spending.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Available funds could cover</div>
                <div className="mt-2 text-5xl font-black text-white"><AnimatedCounter value={runwayDays} decimals={0} /> DAYS</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/20 p-4 space-y-3">
                <div className="flex justify-between text-sm"><span className="text-slate-400">Average Daily Spending</span><span className="font-semibold text-white">{inr(dailyAverage)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-400">Safe Daily Spending</span><span className="font-semibold text-emerald-300">{inr(safeDailySpend)}</span></div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-400">
                  <span>Saving Streak</span>
                  <Badge className="bg-orange-500/15 text-orange-200">🔥 {streak.current} Days</Badge>
                </div>
                <div className="mt-3 text-sm text-slate-200">Your spending stayed within target for <span className="font-semibold text-white">{streak.current}</span> consecutive days.</div>
                <div className="mt-3 flex justify-between text-xs text-slate-400"><span>Longest: {streak.longest} days</span><span>Money saved: {inr(streak.savedMoney)}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Spending Calendar + Financial Timeline */}
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="border border-white/10 bg-white/6 shadow-xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><CalendarDays className="h-5 w-5 text-cyan-300" /> Spending Calendar</CardTitle>
              <CardDescription className="text-slate-300">Monthly heatmap based on actual transaction dates.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <div key={index} className="text-center">{day}</div>)}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-2">
                {Array.from({ length: new Date(currentYear, currentMonthIndex, 1).getDay() }).map((_, index) => <div key={`pad-${index}`} />)}
                {currentMonthDaily.map((day) => {
                  const intensity = dailyAverage > 0 ? Math.min(1, day.total / Math.max(1, dailyAverage * 1.7)) : 0
                  const bg = intensity <= 0.2 ? 'bg-cyan-500/10' : intensity <= 0.45 ? 'bg-cyan-500/25' : intensity <= 0.75 ? 'bg-cyan-500/45' : 'bg-cyan-500/70'
                  return (
                    <button
                      key={day.day}
                      type="button"
                      title={`Spent ${inr(day.total)} on day ${day.day}`}
                      onClick={() => {
                        const matching = day.items[0]
                        if (matching) setSelectedCategory(matching.category || 'Other')
                      }}
                      className={`min-h-16 rounded-2xl border border-white/10 ${bg} p-2 text-left transition hover:scale-[1.02] hover:border-cyan-300/40`}
                    >
                      <div className="text-[10px] text-slate-300">{day.day}</div>
                      <div className="mt-2 text-xs font-semibold text-white">{inr(day.total)}</div>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-white/6 shadow-xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><ArrowRight className="h-5 w-5 text-fuchsia-300" /> Financial Timeline</CardTitle>
              <CardDescription className="text-slate-300">Past transactions and upcoming recurring payments.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {timeline.map((item, index) => (
                  <div key={index} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-cyan-200">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="truncate text-sm font-semibold text-white">{item.label}</div>
                        <div className="text-xs text-slate-400">{item.date}</div>
                      </div>
                      <div className="mt-1 text-xs text-slate-300">{item.type === 'income' ? 'Income' : item.type === 'expense' ? 'Expense' : 'Upcoming'} · {inr(item.amount)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Goals + Financial Health Score */}
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="border border-white/10 bg-white/6 shadow-xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><Goal className="h-5 w-5 text-emerald-300" /> Goals</CardTitle>
              <CardDescription className="text-slate-300">Suggested goals based on your current finances.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {goals.map((goal) => {
                const progress = Math.min(100, goal.target > 0 ? (goal.current / goal.target) * 100 : 0)
                return (
                  <div key={goal.title} className="rounded-3xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-white"><goal.icon className="h-4 w-4 text-cyan-300" /> {goal.title}</div>
                        <div className="mt-1 text-xs text-slate-400">{goal.label}</div>
                      </div>
                      <Badge className="bg-white/10 text-white">{round(progress, 0)}%</Badge>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/10">
                      <div className={`h-full rounded-full ${goal.tone === 'emerald' ? 'bg-emerald-400' : goal.tone === 'indigo' ? 'bg-indigo-400' : goal.tone === 'amber' ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
                    </div>
                    <div className="mt-3 flex justify-between text-xs text-slate-300">
                      <span>{inr(goal.current)} / {inr(goal.target)}</span>
                      <span>{inr(goal.remaining)} remaining</span>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-400">Estimated completion: {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</div>
                  </div>
                )
              })}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button onClick={() => setActiveTab('budget')} className="rounded-full bg-white/10 text-white hover:bg-white/15">Add Money</Button>
                <Button onClick={() => setActiveTab('affordability')} className="rounded-full bg-white/10 text-white hover:bg-white/15">View Goal</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-white/6 shadow-xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><Brain className="h-5 w-5 text-fuchsia-300" /> Financial Health Score</CardTitle>
              <CardDescription className="text-slate-300">Animated score, breakdown, and history.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="flex flex-col items-center justify-center rounded-[2rem] border border-white/10 bg-black/20 p-6">
                  <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-[conic-gradient(#818cf8_0deg,#38bdf8_90deg,#22c55e_180deg,#f59e0b_250deg,#fb7185_320deg,#818cf8_360deg)] shadow-[0_0_40px_rgba(129,140,248,0.22)]">
                    <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#07101f] text-center text-white">
                      <div>
                        <div className="text-4xl font-black"><AnimatedCounter value={health.total} decimals={0} /></div>
                        <div className="text-[10px] uppercase tracking-[0.24em] text-slate-400">/ 100</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-slate-300">Status: <span className="font-semibold text-white">{health.grade}</span></div>
                  <Button onClick={() => setHealthDialogOpen(true)} className="mt-4 rounded-full bg-white/10 text-white hover:bg-white/15">Why is my score {health.total}?</Button>
                  <div className={`mt-3 text-sm ${healthChange >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{healthChange >= 0 ? '+' : '−'} {Math.abs(healthChange)} vs previous month</div>
                </div>
                <div>
                  <div className="space-y-2">
                    {[
                      ['Income Stability', health.breakdown.incomeStability, 20],
                      ['Savings Rate', health.breakdown.savingsRate, 20],
                      ['Expense Control', health.breakdown.expenseControl, 15],
                      ['Budget Adherence', health.breakdown.budgetAdherence, 15],
                      ['Emergency Fund', health.breakdown.emergencyFund, 15],
                      ['Debt Ratio', health.breakdown.debtRatio, 15],
                    ].map(([label, value, max]) => (
                      <div key={label}>
                        <div className="flex justify-between text-xs text-slate-300"><span>{label}</span><span>{value}/{max}</span></div>
                        <Progress value={Math.min(100, (Number(value) / Number(max)) * 100)} className="mt-1 [&>div]:bg-gradient-to-r [&>div]:from-cyan-400 [&>div]:to-indigo-500" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Progress + Month-End Forecast */}
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="border border-white/10 bg-white/6 shadow-xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><TrendingUp className="h-5 w-5 text-sky-300" /> Financial Progress</CardTitle>
              <CardDescription className="text-slate-300">Real monthly score movement derived from your transaction history.</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.16} />
                  <XAxis dataKey="month" stroke="#cbd5e1" />
                  <YAxis stroke="#cbd5e1" />
                  <Tooltip formatter={(value) => `${value}/100`} />
                  <Area type="monotone" dataKey="score" stroke="#38bdf8" fill="url(#scoreGradient)" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-200 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Current</div><div className="mt-1 text-lg font-black text-white">{health.total}</div></div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Best</div><div className="mt-1 text-lg font-black text-white">{bestScore}</div></div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Average</div><div className="mt-1 text-lg font-black text-white">{averageScore}</div></div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Improvement</div><div className="mt-1 text-lg font-black text-white">{healthChange >= 0 ? '+' : ''}{healthChange}</div></div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-white/6 shadow-xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><RefreshCw className="h-5 w-5 text-cyan-300" /> Month-End Forecast</CardTitle>
              <CardDescription className="text-slate-300">Based on current spending patterns.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                ['Projected Income', monthlyForecast.expectedMonthlyIncome],
                ['Projected Expenses', monthlyForecast.expectedMonthlyExpense],
                ['Expected Balance', monthlyForecast.endOfMonthBalance],
                ['Expected Savings', monthlyForecast.expectedSavings],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4 flex items-center justify-between">
                  <div className="text-sm text-slate-300">{label}</div>
                  <div className="text-lg font-black text-white">{inr(value)}</div>
                </div>
              ))}
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-300">Budget Risk</div>
                  <div className="mt-1 text-sm font-semibold text-white">
                    {currentSavingsRate >= 20 || (analysis?.budgetAnalysis || []).every((item) => item.status !== 'over') ? 'Low' : currentSavingsRate >= 10 ? 'Medium' : 'High'}
                  </div>
                </div>
                <Button onClick={() => setActiveTab('predictions')} className="rounded-full bg-white/10 text-white hover:bg-white/15">View Prediction</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Money Story + Life Simulator Widget */}
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="border border-white/10 bg-white/6 shadow-xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><CalendarDays className="h-5 w-5 text-cyan-300" /> Weekly Money Story</CardTitle>
              <CardDescription className="text-slate-300">Your money pattern across the last 7 days.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {weeklyStory.series.map((item) => (
                  <div key={item.day} className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{item.day}</div>
                    <div className="mt-2 text-sm font-black text-white">{inr(item.value)}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-3xl border border-white/10 bg-black/20 p-4 text-sm text-slate-200">
{weeklyStory.highest?.day === 'SAT' ? 'Saturday was your highest spending day.' : `Your highest spending day was ${weeklyStory.highest?.day || 'this week'}.`} {weeklyStory.highest?.value ? `Spending peaked at ${inr(weeklyStory.highest.value)}.` : ''}
                {weeklyStory.lowest?.value !== undefined ? ` Lowest day: ${weeklyStory.lowest.day} at ${inr(weeklyStory.lowest.value)}.` : ''}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-white/6 shadow-xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><Zap className="h-5 w-5 text-yellow-300" /> Life Simulator Home Widget</CardTitle>
              <CardDescription className="text-slate-300">See how your next major decision could affect your finances.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-3xl border border-white/10 bg-black/20 p-4 text-sm text-slate-200">🔮 WHAT IF? Try a quick scenario and jump into your existing Life Simulator.</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  ['Buy a Bike', 'bike'],
                  ['New Phone', 'phone'],
                  ['Job Loss', 'job_loss'],
                  ['Emergency', 'emergency'],
                  ['Custom', 'custom'],
                ].map(([label, scenario]) => (
                  <Button key={label} onClick={() => { if (setSimulatorScenario) setSimulatorScenario(scenario); setActiveTab('simulator') }} className="rounded-full bg-white/10 text-white hover:bg-white/15">
                    {label}
                  </Button>
                ))}
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                Quick scenarios are linked to the existing simulator. No duplicate flow is created.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Command Search + Alerts */}
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <Card className="border border-white/10 bg-white/6 shadow-xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><Search className="h-5 w-5 text-cyan-300" /> Smart Command Search</CardTitle>
              <CardDescription className="text-slate-300">Press Ctrl+K to jump through existing features faster.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setCommandOpen(true)} className="rounded-full bg-white/10 text-white hover:bg-white/15">Open Command Search</Button>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-white/6 shadow-xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><Bell className="h-5 w-5 text-yellow-300" /> Alerts and Action Feed</CardTitle>
              <CardDescription className="text-slate-300">A short list of the most relevant items right now.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {notifications.slice(0, 3).map((item, index) => (
                <div key={index} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="text-sm font-semibold text-white">{item.title}</div>
                  <div className="mt-1 text-xs text-slate-300">{item.text}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* CIBIL Score Estimator */}
        <Card className="border border-white/10 bg-white/6 shadow-xl backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Award className="h-5 w-5 text-amber-300" /> Check CIBIL Score</CardTitle>
            <CardDescription className="text-slate-300">Estimated credit score based on your financial behaviour.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
              {/* Animated Gauge */}
              <div className="flex flex-col items-center justify-center rounded-[2rem] border border-white/10 bg-black/20 p-6">
                <div className="relative flex h-44 w-44 items-center justify-center rounded-full shadow-[0_0_50px_rgba(251,191,36,0.15)]" style={{ background: `conic-gradient(#ef4444 0deg, #f59e0b ${((Math.min(Math.max(cibilScore.score, 300), 900) - 300) / 600) * 120}deg, #22c55e ${((Math.min(Math.max(cibilScore.score, 300), 900) - 300) / 600) * 280}deg, #16a34a ${((Math.min(Math.max(cibilScore.score, 300), 900) - 300) / 600) * 360}deg, #1e293b ${((Math.min(Math.max(cibilScore.score, 300), 900) - 300) / 600) * 360}deg)` }}>
                  <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-[#07101f] text-center">
                    <div className="text-4xl font-black text-white"><AnimatedCounter value={cibilScore.score} decimals={0} /></div>
                    <div className="text-[10px] uppercase tracking-[0.24em] text-slate-400">/ 900</div>
                  </div>
                </div>
                <Badge className={`mt-4 rounded-full border-0 bg-white/10 px-4 py-1 text-sm font-semibold ${cibilScore.ratingColor}`}>{cibilScore.rating}</Badge>
                <div className="mt-2 text-center text-xs text-slate-400">Estimated from your transaction data</div>
                <Button onClick={() => setCibilDialogOpen(true)} className="mt-4 rounded-full bg-white/10 text-white hover:bg-white/15">View Detailed Report</Button>
              </div>

              {/* Factor Breakdown */}
              <div className="space-y-3">
                {cibilScore.factors.map((factor) => (
                  <div key={factor.name} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-white">{factor.name}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{factor.score}/{factor.max}</span>
                        <Badge className={`rounded-full border-0 text-[10px] ${factor.percent >= 75 ? 'bg-emerald-500/20 text-emerald-300' : factor.percent >= 50 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'}`}>{factor.status}</Badge>
                      </div>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${factor.percent}%`, backgroundColor: factor.color }} />
                    </div>
                    <div className="mt-1.5 text-[11px] text-slate-400">{factor.tip}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <Dialog open={selectedCategory !== null} onOpenChange={(open) => !open && setSelectedCategory(null)}>
        <DialogContent className="max-w-2xl border-white/10 bg-[#07101f] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white"><Goal className="h-5 w-5 text-cyan-300" /> {selectedCategory || 'Category'} transactions</DialogTitle>
            <DialogDescription className="text-slate-300">Transactions related to this category.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[420px] pr-4">
            <div className="space-y-2">
              {selectedCategoryItems.length ? selectedCategoryItems.map((transaction) => (
                <div key={transaction.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">{transaction.description || transaction.category}</div>
                      <div className="text-xs text-slate-400">{new Date(transaction.date).toLocaleDateString('en-IN')}</div>
                    </div>
                    <div className={`text-sm font-bold ${transaction.type === 'income' ? 'text-emerald-300' : 'text-rose-300'}`}>{transaction.type === 'income' ? '+' : '−'}{inr(transaction.amount)}</div>
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">No data available yet.</div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={moneyLeakOpen} onOpenChange={setMoneyLeakOpen}>
        <DialogContent className="max-w-3xl border-white/10 bg-[#07101f] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Money Leak Radar</DialogTitle>
            <DialogDescription className="text-slate-300">Evidence-based leak detection from your data.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[460px] pr-4">
            <div className="space-y-3">
              {leaks.map((item, index) => (
                <div key={index} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">{item.label}</div>
                      <div className="mt-1 text-xs text-slate-300">{item.detail}</div>
                    </div>
                    <div className="text-sm font-black text-cyan-200">{item.value || '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <DialogContent className="max-w-2xl border-white/10 bg-[#07101f] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Notification Center</DialogTitle>
            <DialogDescription className="text-slate-300">Unread and useful alerts.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {notifications.map((item, index) => (
              <div key={index} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-semibold text-white">{item.title}</div>
                <div className="mt-1 text-xs text-slate-300">{item.text}</div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="max-w-2xl border-white/10 bg-[#07101f] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Command Search</DialogTitle>
            <DialogDescription className="text-slate-300">Type a command or use Ctrl+K to open this quickly.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={commandQuery} onChange={(event) => setCommandQuery(event.target.value)} placeholder="Search commands..." className="border-white/10 bg-white/5 text-white placeholder:text-slate-400" />
            <ScrollArea className="h-[320px] pr-4">
              <div className="space-y-2">
                {commandItems.map((command) => (
                  <button key={command.label} type="button" onClick={() => openTab(command.tab, command.action)} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10">
                    <span className="text-sm text-white">{command.label}</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="max-w-2xl border-white/10 bg-[#07101f] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Quick Add</DialogTitle>
            <DialogDescription className="text-slate-300">Jump straight to an existing FinWise flow.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={() => openTab('transactions', 'income')} className="rounded-2xl bg-white/10 text-white hover:bg-white/15"><Plus className="mr-2 h-4 w-4" /> Add Income</Button>
            <Button onClick={() => openTab('transactions', 'expense')} className="rounded-2xl bg-white/10 text-white hover:bg-white/15"><Plus className="mr-2 h-4 w-4" /> Add Expense</Button>
            <Button onClick={() => openTab('budget')} className="rounded-2xl bg-white/10 text-white hover:bg-white/15"><Goal className="mr-2 h-4 w-4" /> Add Goal</Button>
            <Button onClick={() => openTab('subscriptions')} className="rounded-2xl bg-white/10 text-white hover:bg-white/15"><CreditCard className="mr-2 h-4 w-4" /> Add Subscription</Button>
            <Button onClick={() => { handleScenarioOpen(currentSimulatorScenario); setQuickAddOpen(false) }} className="rounded-2xl bg-white/10 text-white hover:bg-white/15"><Calculator className="mr-2 h-4 w-4" /> Run Simulation</Button>
            <Button onClick={() => openTab('assistant')} className="rounded-2xl bg-white/10 text-white hover:bg-white/15"><Brain className="mr-2 h-4 w-4" /> Ask AI</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={healthDialogOpen} onOpenChange={setHealthDialogOpen}>
        <DialogContent className="max-w-3xl border-white/10 bg-[#07101f] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Why is my score {health.total}?</DialogTitle>
            <DialogDescription className="text-slate-300">A breakdown of the score drivers used by FinWise.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(health.breakdown || {}).map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{label.replace(/([A-Z])/g, ' $1')}</div>
                <div className="mt-2 text-2xl font-black text-white">{value}/{label === 'incomeStability' || label === 'savingsRate' ? 20 : 15}</div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cibilDialogOpen} onOpenChange={setCibilDialogOpen}>
        <DialogContent className="max-w-3xl border-white/10 bg-[#07101f] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white"><Award className="h-5 w-5 text-amber-300" /> CIBIL Score Report</DialogTitle>
            <DialogDescription className="text-slate-300">Detailed breakdown of your estimated credit score.</DialogDescription>
          </DialogHeader>
          <div className="mb-4 flex items-center gap-6 rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="text-center">
              <div className="text-5xl font-black text-white">{cibilScore.score}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">out of 900</div>
            </div>
            <div>
              <Badge className={`rounded-full border-0 bg-white/10 px-4 py-1 text-sm font-semibold ${cibilScore.ratingColor}`}>{cibilScore.rating}</Badge>
              <div className="mt-2 text-sm text-slate-300">
                {cibilScore.score >= 800 ? 'Your financial behaviour is outstanding. You would likely qualify for the best interest rates.' : cibilScore.score >= 700 ? 'Strong financial profile. Most lenders would consider you a low-risk borrower.' : cibilScore.score >= 600 ? 'Decent standing. Some areas can be improved for better loan terms.' : cibilScore.score >= 450 ? 'Your score needs attention. Focus on reducing debt and staying within budgets.' : 'Critical range. Immediate improvements in spending habits are recommended.'}
              </div>
            </div>
          </div>
          <ScrollArea className="h-[380px] pr-4">
            <div className="space-y-3">
              {cibilScore.factors.map((factor) => (
                <div key={factor.name} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-white">{factor.name}</div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-white">{factor.score}/{factor.max}</span>
                      <Badge className={`rounded-full border-0 text-[10px] ${factor.percent >= 75 ? 'bg-emerald-500/20 text-emerald-300' : factor.percent >= 50 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'}`}>{factor.status}</Badge>
                    </div>
                  </div>
                  <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${factor.percent}%`, backgroundColor: factor.color }} />
                  </div>
                  <div className="mt-3 text-xs text-slate-300">💡 {factor.tip}</div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="mt-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-200/80">
            ⚠️ This is an estimated score based on your financial data in FinWise. It is not an official CIBIL bureau report. For your actual CIBIL score, visit the official CIBIL website.
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-3">
        <Button onClick={() => setQuickAddOpen(true)} className="rounded-full border border-white/10 bg-cyan-500/20 px-5 py-6 text-white shadow-2xl shadow-cyan-500/20 backdrop-blur-xl hover:bg-cyan-500/30">
          <Plus className="mr-2 h-5 w-5" /> Quick Add
        </Button>
        <Button onClick={() => setActiveTab('assistant')} className="rounded-full border border-white/10 bg-fuchsia-500/20 px-5 py-6 text-white shadow-2xl shadow-fuchsia-500/20 backdrop-blur-xl hover:bg-fuchsia-500/30">
          ✨ Ask FinWise
        </Button>
      </div>
</div>
  )
}
