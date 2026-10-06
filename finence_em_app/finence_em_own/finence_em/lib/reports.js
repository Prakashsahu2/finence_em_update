import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const round = (value) => Math.round(Number(value || 0) * 100) / 100
const monthName = (month, year) => new Date(Number(year), Number(month) - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })
const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`

function buildRows(type, transactions, budget, query) {
  const expenses = transactions.filter((item) => item.type === 'expense')
  const income = transactions.filter((item) => item.type === 'income')
  const totalExpenses = round(expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0))
  const totalIncome = round(income.reduce((sum, item) => sum + Number(item.amount || 0), 0))
  const categories = {}
  expenses.forEach((item) => { categories[item.category || 'Other'] = (categories[item.category || 'Other'] || 0) + Number(item.amount || 0) })
  const categoryRows = Object.entries(categories).map(([category, amount]) => ({
    category, total: round(amount), percentage: totalExpenses ? round((amount / totalExpenses) * 100) : 0,
    transactions: expenses.filter((item) => (item.category || 'Other') === category).length,
  })).sort((a, b) => b.total - a.total)
  const monthMap = {}
  transactions.forEach((item) => {
    const key = new Date(item.date).toISOString().slice(0, 7)
    if (!monthMap[key]) monthMap[key] = { month: key, income: 0, expenses: 0 }
    item.type === 'income' ? monthMap[key].income += Number(item.amount || 0) : monthMap[key].expenses += Number(item.amount || 0)
  })
  const monthly = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month)).map((item) => ({
    month: item.month, income: round(item.income), expenses: round(item.expenses), savings: round(item.income - item.expenses),
  }))
  const titleMap = {
    'monthly-expenses': `Monthly Expenses - ${monthName(query.month, query.year)}`,
    'income-vs-expenses': 'Income vs Expenses', 'category-spending': 'Category-Wise Spending',
    savings: 'Savings Report', 'yearly-summary': `Yearly Financial Summary - ${query.year}`,
  }
  let rows = []
  if (type === 'monthly-expenses') rows = expenses.map((item) => ({ date: new Date(item.date).toLocaleDateString('en-IN'), category: item.category || 'Other', description: item.description || '', amount: round(item.amount) }))
  if (type === 'income-vs-expenses') rows = monthly
  if (type === 'category-spending') rows = categoryRows
  if (type === 'savings') rows = monthly
  if (type === 'yearly-summary') rows = monthly
  return {
    title: titleMap[type], generatedAt: new Date().toISOString(), rows, categoryRows, monthly,
    totals: { income: totalIncome, expenses: totalExpenses, savings: round(totalIncome - totalExpenses), savingsPercentage: totalIncome ? round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0 },
    budget: budget || {}, highestExpenseMonth: monthly.length ? monthly.reduce((a, b) => a.expenses > b.expenses ? a : b) : null,
    lowestExpenseMonth: monthly.length ? monthly.reduce((a, b) => a.expenses < b.expenses ? a : b) : null,
  }
}

export function filterTransactions(transactions, query, type) {
  const start = query.startDate ? new Date(query.startDate) : type === 'yearly-summary' ? new Date(`${query.year}-01-01`) : new Date(Number(query.year), Number(query.month) - 1, 1)
  const end = query.endDate ? new Date(`${query.endDate}T23:59:59.999`) : type === 'yearly-summary' ? new Date(`${query.year}-12-31T23:59:59.999`) : new Date(Number(query.year), Number(query.month), 0, 23, 59, 59, 999)
  return transactions.filter((item) => { const date = new Date(item.date); return !Number.isNaN(date.getTime()) && date >= start && date <= end })
}

export function makeReport(type, transactions, budget, query) { return buildRows(type, transactions, budget, query) }

export function reportCsv(report) {
  const rows = report.rows
  if (!rows.length) return `${csvCell(report.title)}\n${csvCell('No data available for the selected period')}`
  const headers = Object.keys(rows[0])
  return [headers.map(csvCell).join(','), ...rows.map((row) => headers.map((key) => csvCell(row[key])).join(','))].join('\n')
}

export async function reportXlsx(report) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(report.title.slice(0, 31))
  sheet.addRow([report.title]); sheet.addRow([`Generated: ${new Date(report.generatedAt).toLocaleString('en-IN')}`]); sheet.addRow([])
  sheet.addRow(['Income', report.totals.income, 'Expenses', report.totals.expenses, 'Savings', report.totals.savings])
  sheet.addRow([])
  const rows = report.rows
  if (rows.length) { sheet.columns = Object.keys(rows[0]).map((key) => ({ header: key, key, width: 22 })); rows.forEach((row) => sheet.addRow(row)) }
  sheet.getRow(1).font = { bold: true, size: 16 }; sheet.getRow(4).font = { bold: true }
  return workbook.xlsx.writeBuffer()
}

export async function reportPdf(report) {
  const document = new PDFDocument({ margin: 42 })
  const chunks = []
  document.on('data', (chunk) => chunks.push(chunk))
  const finished = new Promise((resolve) => document.on('end', () => resolve(Buffer.concat(chunks))))
  document.fontSize(18).fillColor('#253b80').text(report.title)
  document.fontSize(9).fillColor('#555').text(`Generated: ${new Date(report.generatedAt).toLocaleString('en-IN')}`)
  document.moveDown().fontSize(11).fillColor('#111').text(`Total income: ${money(report.totals.income)}    Total expenses: ${money(report.totals.expenses)}    Savings: ${money(report.totals.savings)}`)
  document.moveDown()
  if (!report.rows.length) document.fontSize(11).text('No data available for the selected period.')
  else report.rows.forEach((row) => document.fontSize(9).text(Object.entries(row).map(([key, value]) => `${key}: ${typeof value === 'number' && /amount|total|income|expense|saving/i.test(key) ? money(value) : value}`).join(' | ')))
  document.end()
  return finished
}

export function filename(type, query, format) {
  const labels = { 'monthly-expenses': `Monthly_Expenses_${query.month}_${query.year}`, 'income-vs-expenses': `Income_vs_Expenses_${query.year}`, 'category-spending': `Category_Spending_${query.year}`, savings: `Savings_Report_${query.year}`, 'yearly-summary': `Yearly_Summary_${query.year}` }
  return `FinWise_${labels[type] || 'Financial_Report'}.${format === 'excel' ? 'xlsx' : format}`
}
