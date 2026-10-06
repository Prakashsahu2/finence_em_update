'use client'

import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BriefcaseBusiness, CalendarDays, CheckCircle2, Download, FileText, HeartPulse, Info, Lightbulb, Receipt, Save, ShieldCheck, Sparkles, UploadCloud } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

const STORAGE_KEY = 'finwise-tax-planning'
const FY_OPTIONS = ['2024-25', '2025-26', '2026-27']
const INCOME_CATEGORIES = ['Salary', 'Business', 'Freelance', 'Rental', 'Interest', 'Dividends', 'Capital Gains', 'Other']
const SECTION_COLORS = ['#10b981', '#0ea5e9', '#8b5cf6', '#f97316', '#eab308', '#64748b']
const INVESTMENTS = [
  { name: 'ELSS', lockIn: '3 years', risk: 'Moderate', returns: '12-15%', benefit: 150000, description: 'Equity-linked growth with the shortest 80C lock-in.' },
  { name: 'PPF', lockIn: '15 years', risk: 'Low', returns: '7-8%', benefit: 150000, description: 'Government-backed, tax-efficient long-term savings.' },
  { name: 'NSC', lockIn: '5 years', risk: 'Low', returns: '7-8%', benefit: 150000, description: 'Fixed-income security with predictable returns.' },
  { name: 'Tax-saving FD', lockIn: '5 years', risk: 'Low', returns: '6-7%', benefit: 150000, description: 'Bank fixed deposit with a five-year lock-in.' },
]
const DEDUCTION_FIELDS = [
  ['lifeInsurance', 'Life insurance premium'], ['ppf', 'PPF'], ['epf', 'EPF'], ['nsc', 'NSC'], ['taxSavingFd', 'Tax-saving FD'], ['sukanya', 'Sukanya Samriddhi'], ['elss', 'ELSS'], ['homePrincipal', 'Home loan principal'], ['tuition', 'Children tuition fees'], ['pension', 'Pension plans'],
]
const EMPTY_PROFILE = { ageGroup: 'below-60', residentialStatus: 'resident', incomeType: 'salaried', homeLoan: 'no', parentSenior: 'no', healthInsurance: 0, parentHealthInsurance: 0, educationLoanInterest: 0, homeLoanInterest: 0, propertyType: 'self-occupied', donations: 0, savingsInterest: 0, rentPaid: 0 }
const EMPTY_DEDUCTIONS = Object.fromEntries(DEDUCTION_FIELDS.map(([key]) => [key, 0]))

function inr(value) { return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` }
function number(value) { return Math.max(0, Number(value) || 0) }
function yearForFy(fy) { return Number(fy.split('-')[0]) }
function txDate(transaction) { return new Date(transaction.date || transaction.createdAt || transaction.timestamp || Date.now()) }
function incomeCategory(category) {
  const value = String(category || 'Other').toLowerCase()
  if (value.includes('salary')) return 'Salary'
  if (value.includes('business')) return 'Business'
  if (value.includes('freelance') || value.includes('professional')) return 'Freelance'
  if (value.includes('rent')) return 'Rental'
  if (value.includes('interest')) return 'Interest'
  if (value.includes('dividend')) return 'Dividends'
  if (value.includes('capital')) return 'Capital Gains'
  return 'Other'
}
function calculateTax(income) {
  const slabs = [{ label: 'Up to ₹3L', limit: 300000, rate: 0 }, { label: '₹3L - ₹7L', limit: 400000, rate: 0.1 }, { label: '₹7L - ₹10L', limit: 300000, rate: 0.15 }, { label: '₹10L - ₹12L', limit: 200000, rate: 0.2 }, { label: '₹12L - ₹15L', limit: 300000, rate: 0.25 }, { label: 'Above ₹15L', limit: Infinity, rate: 0.3 }]
  let remaining = Math.max(0, income)
  let tax = 0
  const breakdown = slabs.map((slab) => { const taxable = Math.min(remaining, slab.limit); const amount = taxable * slab.rate; remaining -= taxable; tax += amount; return { ...slab, taxable, amount } })
  const cess = tax * 0.04
  return { base: tax, cess, total: tax + cess, breakdown }
}
function formatCsv(rows) { return rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n') }

function Metric({ label, value, detail, tone = 'default' }) { return <Card className={tone === 'green' ? 'border-emerald-200 bg-emerald-50/60' : ''}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 text-xl font-bold ${tone === 'green' ? 'text-emerald-700' : ''}`}>{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent></Card> }
function Tip({ children }) { return <span title={children} className="inline-flex cursor-help align-middle"><Info className="ml-1 h-3.5 w-3.5 text-muted-foreground" aria-label={children} /></span> }
function MoneyField({ label, value, onChange, hint }) { return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}{hint && <Tip>{hint}</Tip>}</Label><div className="relative"><span className="absolute left-3 top-2 text-sm text-muted-foreground">₹</span><Input className="pl-7" type="number" min="0" value={value} onChange={(event) => onChange(event.target.value)} /></div></div> }

export default function TaxPlanning({ transactions = [] }) {
  const [fy, setFy] = useState('2025-26')
  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [deductions, setDeductions] = useState(EMPTY_DEDUCTIONS)
  const [scenario, setScenario] = useState('none')
  const [loaded, setLoaded] = useState(false)
  const [receipts, setReceipts] = useState([])
  const [savedAt, setSavedAt] = useState(null)

  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); if (saved) { setFy(saved.fy || '2025-26'); setProfile({ ...EMPTY_PROFILE, ...(saved.profile || {}) }); setDeductions({ ...EMPTY_DEDUCTIONS, ...(saved.deductions || {}) }); setReceipts(saved.receipts || []); setSavedAt(saved.savedAt || null) } } catch { toast.error('Saved tax plan could not be loaded.') }
    setLoaded(true)
  }, [])

  const calculated = useMemo(() => {
    const startYear = yearForFy(fy)
    const fyStart = new Date(startYear, 3, 1)
    const fyEnd = new Date(startYear + 1, 3, 1)
    const source = transactions.filter((transaction) => transaction.type === 'income' && txDate(transaction) >= fyStart && txDate(transaction) < fyEnd)
    const incomeByCategory = Object.fromEntries(INCOME_CATEGORIES.map((category) => [category, 0]))
    source.forEach((transaction) => { incomeByCategory[incomeCategory(transaction.category)] += number(transaction.amount) })
    const transactionIncome = Object.values(incomeByCategory).reduce((sum, amount) => sum + amount, 0)
    const manualIncome = scenario === 'elss' ? 0 : 0
    const totalIncome = transactionIncome + manualIncome
    const section80C = Math.min(150000, Object.values(deductions).reduce((sum, value) => sum + number(value), 0))
    const section80D = Math.min((profile.ageGroup === 'senior' ? 50000 : 25000) + (profile.parentSenior === 'yes' ? 50000 : 25000) + 5000, number(profile.healthInsurance) + number(profile.parentHealthInsurance))
    const section80E = number(profile.educationLoanInterest)
    const section24 = profile.homeLoan === 'yes' ? (profile.propertyType === 'self-occupied' ? Math.min(200000, number(profile.homeLoanInterest)) : number(profile.homeLoanInterest)) : 0
    const other = Math.min(10000, number(profile.savingsInterest)) + number(profile.donations) + Math.min(number(profile.rentPaid), Math.max(0, totalIncome * 0.25))
    const totalDeductions = section80C + section80D + section80E + section24 + other
    const taxableIncome = Math.max(0, totalIncome - totalDeductions)
    const tax = calculateTax(taxableIncome)
    const unplannedTax = calculateTax(totalIncome).total
    return { incomeByCategory, totalIncome, section80C, section80D, section80E, section24, other, totalDeductions, taxableIncome, tax, unplannedTax, taxSaved: Math.max(0, unplannedTax - tax.total) }
  }, [transactions, fy, profile, deductions, scenario])

  const monthlyIncome = useMemo(() => { const rows = []; const startYear = yearForFy(fy); for (let month = 3; month < 15; month += 1) { const date = new Date(startYear, month, 1); const income = transactions.filter((transaction) => transaction.type === 'income' && txDate(transaction).getFullYear() === date.getFullYear() && txDate(transaction).getMonth() === date.getMonth()).reduce((sum, transaction) => sum + number(transaction.amount), 0); rows.push({ month: date.toLocaleDateString('en-IN', { month: 'short' }), income, taxable: Math.max(0, income - calculated.totalDeductions / 12) }) } return rows }, [transactions, fy, calculated.totalDeductions])
  const deductionChart = [{ section: '80C', value: calculated.section80C }, { section: '80D', value: calculated.section80D }, { section: '80E', value: calculated.section80E }, { section: '24', value: calculated.section24 }, { section: 'Other', value: calculated.other }]
  const remaining80C = Math.max(0, 150000 - calculated.section80C)
  const scenarioTax = useMemo(() => { if (scenario === 'elss') return calculateTax(Math.max(0, calculated.taxableIncome - Math.min(remaining80C, 50000))).total; if (scenario === 'parents') return calculateTax(Math.max(0, calculated.taxableIncome - 25000)).total; if (scenario === 'home') return calculateTax(Math.max(0, calculated.taxableIncome - 50000)).total; return calculated.tax.total }, [scenario, calculated])

  function setProfileValue(key, value) { setProfile((current) => ({ ...current, [key]: value })) }
  function setDeduction(key, value) { setDeductions((current) => ({ ...current, [key]: value })) }
  function savePlan() {
    const timestamp = new Date().toISOString()
    const plan = { version: 1, fy, profile, deductions, receipts, savedAt: timestamp }
    try {
      const serialized = JSON.stringify(plan)
      localStorage.setItem(STORAGE_KEY, serialized)
      if (localStorage.getItem(STORAGE_KEY) !== serialized) throw new Error('Saved data could not be verified.')
      setSavedAt(timestamp)
      toast.success('Tax plan saved in this browser.')
    } catch (error) {
      toast.error(error?.name === 'QuotaExceededError' ? 'Browser storage is full. Remove old site data and try again.' : 'Tax plan could not be saved. Check browser storage permissions.')
    }
  }
  function exportCsv() { const rows = [['Section', 'Deduction', 'Amount'], ...DEDUCTION_FIELDS.map(([key, label]) => ['80C', label, number(deductions[key])]), ['80D', 'Health insurance', calculated.section80D], ['80E', 'Education loan interest', calculated.section80E], ['24', 'Home loan interest', calculated.section24], ['Other', 'Other deductions', calculated.other]]; const blob = new Blob([formatCsv(rows)], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `finwise-tax-summary-${fy}.csv`; link.click(); URL.revokeObjectURL(url); toast.success('Deduction CSV exported.') }
  function exportTaxPdf() {
    const reportWindow = window.open('', '_blank')
    const deductionRows = [...DEDUCTION_FIELDS.map(([key, label]) => ['80C', label, deductions[key]]), ['80D', 'Health insurance', calculated.section80D], ['80E', 'Education loan interest', calculated.section80E], ['Section 24', 'Home loan interest', calculated.section24], ['Other', 'Other deductions', calculated.other]]
    const incomeRows = Object.entries(calculated.incomeByCategory).filter(([, value]) => value > 0)
    const slabRows = calculated.tax.breakdown.filter((slab) => slab.taxable > 0).map((slab) => `<tr><td>${slab.label}</td><td>${slab.rate * 100}%</td><td>${inr(slab.taxable)}</td><td>${inr(slab.amount)}</td></tr>`).join('')
    const receiptRows = receipts.length ? receipts.map((receipt) => `<li>${receipt.name}</li>`).join('') : '<li>No receipts attached</li>'
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>FinWise Tax Summary FY ${fy}</title><style>
      *{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172033;margin:0;padding:32px;line-height:1.45}h1{margin:0;font-size:26px}h2{font-size:16px;margin:26px 0 10px;border-bottom:2px solid #d9eee6;padding-bottom:6px}p{margin:4px 0;color:#526174;font-size:12px}.header{display:flex;justify-content:space-between;gap:20px;border-bottom:3px solid #10b981;padding-bottom:16px}.fy{color:#047857;font-weight:700;font-size:16px}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}.metric{border:1px solid #dbe5e1;border-radius:7px;padding:12px}.metric small{display:block;color:#64748b;font-size:10px}.metric strong{display:block;font-size:17px;margin-top:4px}.green{color:#047857}table{width:100%;border-collapse:collapse;font-size:12px}th,td{text-align:left;border-bottom:1px solid #e5e7eb;padding:8px}th{background:#f0fdf4;color:#166534;font-weight:700}.two{display:grid;grid-template-columns:1fr 1fr;gap:28px}.note{background:#f0fdf4;border-left:4px solid #10b981;padding:10px;font-size:12px;margin-top:18px}ul{font-size:12px;color:#526174;padding-left:18px}@media print{body{padding:18px}.no-print{display:none!important}}@media(max-width:650px){body{padding:18px}.summary{grid-template-columns:1fr 1fr}.two{grid-template-columns:1fr}}
    </style></head><body><div class="header"><div><h1>FinWise Tax Summary</h1><p>Tax estimation and deduction planning report</p></div><div class="fy">FY ${fy}<br><span style="font-size:11px;font-weight:400;color:#526174">April - March</span></div></div>
      <div class="summary"><div class="metric"><small>Estimated income</small><strong>${inr(calculated.totalIncome)}</strong></div><div class="metric"><small>Total deductions</small><strong>${inr(calculated.totalDeductions)}</strong></div><div class="metric"><small>Taxable income</small><strong>${inr(calculated.taxableIncome)}</strong></div><div class="metric"><small>Estimated liability</small><strong class="green">${inr(calculated.tax.total)}</strong></div></div>
      <h2>Tax profile</h2><table><tbody><tr><td>Age group</td><td>${profile.ageGroup === 'senior' ? '60 or above' : 'Below 60'}</td><td>Residential status</td><td>${profile.residentialStatus === 'resident' ? 'Resident' : 'Non-Resident'}</td></tr><tr><td>Income type</td><td>${profile.incomeType}</td><td>Home loan borrower</td><td>${profile.homeLoan === 'yes' ? 'Yes' : 'No'}</td></tr><tr><td>Effective tax rate</td><td>${calculated.totalIncome ? ((calculated.tax.total / calculated.totalIncome) * 100).toFixed(2) : '0.00'}%</td><td>Tax saved</td><td class="green">${inr(calculated.taxSaved)}</td></tr></tbody></table>
      <div class="two"><div><h2>Income breakdown</h2><table><thead><tr><th>Source</th><th>Amount</th></tr></thead><tbody>${incomeRows.length ? incomeRows.map(([name, value]) => `<tr><td>${name}</td><td>${inr(value)}</td></tr>`).join('') : '<tr><td colspan="2">No income transactions recorded for this financial year.</td></tr>'}</tbody></table></div><div><h2>Deductions claimed</h2><table><thead><tr><th>Section</th><th>Deduction</th><th>Amount</th></tr></thead><tbody>${deductionRows.map(([section, label, value]) => `<tr><td>${section}</td><td>${label}</td><td>${inr(value)}</td></tr>`).join('')}</tbody></table></div></div>
      <h2>Tax liability by slab</h2><table><thead><tr><th>Slab</th><th>Rate</th><th>Taxable amount</th><th>Tax</th></tr></thead><tbody>${slabRows || '<tr><td colspan="4">No tax due under the current estimate.</td></tr>'}<tr><td colspan="3">Health and education cess</td><td>${inr(calculated.tax.cess)}</td></tr><tr><th colspan="3">Estimated tax liability</th><th>${inr(calculated.tax.total)}</th></tr></tbody></table>
      <div class="note"><strong>Planning note:</strong> This is an estimate based on the information entered in FinWise. Confirm applicable rules, eligibility, and filing treatment with your CA or tax professional.</div><h2>Supporting documents</h2><ul>${receiptRows}</ul><p>Generated on ${new Date().toLocaleDateString('en-IN')}</p><script>window.onload=function(){window.focus();window.print()}</script></body></html>`
    if (!reportWindow) {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `finwise-tax-summary-${fy}.html`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('Pop-up blocked. A printable tax report was downloaded instead.')
      return
    }
    reportWindow.document.open()
    reportWindow.document.write(html)
    reportWindow.document.close()
    toast.success('Tax-only PDF report is ready to print or save.')
  }
  function addReceipt(event) { const file = event.target.files?.[0]; if (!file) return; setReceipts((current) => [...current, { name: file.name, size: file.size, addedAt: new Date().toISOString() }]); toast.success('Receipt added to this plan.') }
  if (!loaded) return null

  return <div className="space-y-5 print:bg-white print:text-black">
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><div className="flex items-center gap-2"><Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">India tax planner</Badge><span className="text-xs text-muted-foreground">FY {fy}</span></div><h2 className="mt-2 text-2xl font-bold tracking-tight">Tax Estimation &amp; Planning</h2><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Estimate your FY 2025-26 liability, organize deductions, and turn your remaining tax-saving headroom into a practical plan.</p>{savedAt && <p className="mt-2 text-xs text-emerald-700">Saved in this browser on {new Date(savedAt).toLocaleString('en-IN')}</p>}</div><div className="flex gap-2 print:hidden"><Button variant="outline" onClick={savePlan}><Save /> Save plan</Button><Button variant="outline" onClick={exportTaxPdf}><FileText /> Tax PDF</Button></div></div>

    <Card><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-emerald-600" /><div><p className="text-sm font-semibold">Financial year</p><p className="text-xs text-muted-foreground">Income is grouped from April through March.</p></div></div><Select value={fy} onValueChange={setFy}><SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger><SelectContent>{FY_OPTIONS.map((option) => <SelectItem key={option} value={option}>FY {option}</SelectItem>)}</SelectContent></Select></CardContent></Card>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Metric label="Estimated income" value={inr(calculated.totalIncome)} detail={`${Object.values(calculated.incomeByCategory).filter(Boolean).length} income sources`} /><Metric label="Deductions claimed" value={inr(calculated.totalDeductions)} detail="Across all sections" /><Metric label="Taxable income" value={inr(calculated.taxableIncome)} detail="After deductions" /><Metric label="Estimated liability" value={inr(calculated.tax.total)} detail={`Effective rate ${calculated.totalIncome ? ((calculated.tax.total / calculated.totalIncome) * 100).toFixed(1) : '0.0'}%`} tone="green" /><Metric label="Tax saved" value={inr(calculated.taxSaved)} detail="Compared with no planning" /></div>

    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><BriefcaseBusiness className="h-5 w-5 text-emerald-600" /> Tax profile</CardTitle><CardDescription>These details set the deduction limits and planning context.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Age group<Tip>Senior citizen limits are applied to health insurance.</Tip></Label><Select value={profile.ageGroup} onValueChange={(value) => setProfileValue('ageGroup', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="below-60">Below 60</SelectItem><SelectItem value="senior">60 or above</SelectItem></SelectContent></Select></div><div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Residential status</Label><Select value={profile.residentialStatus} onValueChange={(value) => setProfileValue('residentialStatus', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="resident">Resident</SelectItem><SelectItem value="non-resident">Non-Resident</SelectItem></SelectContent></Select></div><div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Primary income type</Label><Select value={profile.incomeType} onValueChange={(value) => setProfileValue('incomeType', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['salaried', 'business', 'freelance', 'professional'].map((value) => <SelectItem key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Home loan borrower</Label><Select value={profile.homeLoan} onValueChange={(value) => setProfileValue('homeLoan', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent></Select></div><MoneyField label="Health insurance paid" value={profile.healthInsurance} onChange={(value) => setProfileValue('healthInsurance', value)} hint="Section 80D health insurance premium for self and spouse." /><MoneyField label="Parents health insurance" value={profile.parentHealthInsurance} onChange={(value) => setProfileValue('parentHealthInsurance', value)} /><div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Parent senior citizen?</Label><Select value={profile.parentSenior} onValueChange={(value) => setProfileValue('parentSenior', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent></Select></div><MoneyField label="Education loan interest" value={profile.educationLoanInterest} onChange={(value) => setProfileValue('educationLoanInterest', value)} hint="Section 80E is modeled without a monetary cap." /><MoneyField label="Home loan interest" value={profile.homeLoanInterest} onChange={(value) => setProfileValue('homeLoanInterest', value)} /><div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Property type</Label><Select value={profile.propertyType} onValueChange={(value) => setProfileValue('propertyType', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="self-occupied">Self-occupied</SelectItem><SelectItem value="let-out">Let-out</SelectItem></SelectContent></Select></div></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600" /> Deduction tracker</CardTitle><CardDescription>Section 80C is capped at ₹1,50,000. Enter investments already made.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2">{DEDUCTION_FIELDS.map(([key, label]) => <MoneyField key={key} label={label} value={deductions[key]} onChange={(value) => setDeduction(key, value)} />)}</div><div><div className="mb-2 flex justify-between text-xs"><span>80C utilization</span><strong>{inr(calculated.section80C)} / ₹1,50,000</strong></div><Progress value={(calculated.section80C / 150000) * 100} className="h-2" /><p className="mt-2 text-xs text-muted-foreground">{remaining80C ? `You have ${inr(remaining80C)} of 80C room remaining.` : 'Your 80C limit is fully utilized.'}</p></div><div className="grid gap-3 sm:grid-cols-2"><MoneyField label="Section 80G donations" value={profile.donations} onChange={(value) => setProfileValue('donations', value)} /><MoneyField label="Savings interest (80TTA)" value={profile.savingsInterest} onChange={(value) => setProfileValue('savingsInterest', value)} /><MoneyField label="Rent paid (80GG estimate)" value={profile.rentPaid} onChange={(value) => setProfileValue('rentPaid', value)} /></div></CardContent></Card>
    </div>

    <div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle>Income sources</CardTitle><CardDescription>Income pulled from your existing income transactions for FY {fy}.</CardDescription></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={Object.entries(calculated.incomeByCategory).filter(([, value]) => value > 0).map(([name, value]) => ({ name, value }))} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>{Object.entries(calculated.incomeByCategory).map(([name], index) => <Cell key={name} fill={SECTION_COLORS[index % SECTION_COLORS.length]} />)}</Pie><Tooltip formatter={(value) => inr(value)} /><Legend /></PieChart></ResponsiveContainer></div></CardContent></Card><Card><CardHeader><CardTitle>Deductions by section</CardTitle><CardDescription>Where your tax planning is doing the most work.</CardDescription></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={deductionChart}><CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="section" /><YAxis tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} /><Tooltip formatter={(value) => inr(value)} /><Bar dataKey="value" name="Deduction" fill="#10b981" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></CardContent></Card></div>

    <Card><CardHeader><CardTitle>Income vs taxable income</CardTitle><CardDescription>Monthly income compared with the portion remaining after deductions are applied.</CardDescription></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthlyIncome}><defs><linearGradient id="taxIncome" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.35} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="month" /><YAxis tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} /><Tooltip formatter={(value) => inr(value)} /><Legend /><Area type="monotone" dataKey="income" name="Income" stroke="#0ea5e9" fill="transparent" /><Area type="monotone" dataKey="taxable" name="Taxable after deductions" stroke="#10b981" fill="url(#taxIncome)" /></AreaChart></ResponsiveContainer></div></CardContent></Card>

    <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]"><Card><CardHeader><CardTitle>Tax liability breakdown</CardTitle><CardDescription>FY 2025-26 slabs supplied in your planning brief, plus 4% cess.</CardDescription></CardHeader><CardContent className="space-y-2">{calculated.tax.breakdown.map((slab) => <div key={slab.label} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-xs"><span>{slab.label} <span className="text-muted-foreground">({slab.rate * 100}%)</span></span><strong>{inr(slab.amount)}</strong></div>)}<div className="flex justify-between border-t pt-3 text-sm"><span>Health &amp; education cess (4%)</span><strong>{inr(calculated.tax.cess)}</strong></div><div className="flex justify-between text-base font-bold"><span>Estimated tax liability</span><span className="text-emerald-700">{inr(calculated.tax.total)}</span></div></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-amber-500" /> Investment suggestions</CardTitle><CardDescription>Options ranked by useful trade-offs, not a blanket recommendation.</CardDescription></CardHeader><CardContent className="space-y-3">{INVESTMENTS.map((investment) => <div key={investment.name} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-sm font-semibold">{investment.name}<Badge variant="secondary">{investment.risk} risk</Badge></div><p className="text-xs text-muted-foreground">{investment.lockIn} lock-in · {investment.returns} expected · {investment.description}</p></div><span className="shrink-0 text-xs font-semibold text-emerald-700">Up to {inr(Math.min(remaining80C, investment.benefit))} 80C room</span></div>)}<p className="rounded-md bg-amber-50 p-3 text-xs text-amber-800">{remaining80C ? `You need ${inr(remaining80C)} more eligible 80C investment to use the remaining limit.` : 'Your 80C allowance is currently fully used.'}</p></CardContent></Card></div>

    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-emerald-600" /> Planning scenarios</CardTitle><CardDescription>Compare common actions before committing money.</CardDescription></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-3">{[{ key: 'elss', label: 'Invest ₹50,000 in ELSS', detail: 'Uses available 80C room.' }, { key: 'parents', label: 'Insure your parents', detail: 'Adds a Section 80D allowance.' }, { key: 'home', label: 'Increase home loan prepayment', detail: 'Models ₹50,000 additional interest benefit.' }].map((item) => <button key={item.key} type="button" onClick={() => setScenario(scenario === item.key ? 'none' : item.key)} className={`rounded-lg border p-4 text-left transition-colors ${scenario === item.key ? 'border-emerald-400 bg-emerald-50' : 'hover:bg-muted/50'}`}><p className="text-sm font-semibold">{item.label}</p><p className="mt-1 text-xs text-muted-foreground">{item.detail}</p><p className="mt-3 text-xs font-medium">Projected tax: {inr(item.key === scenario ? scenarioTax : calculated.tax.total)}</p></button>)}</div>{scenario !== 'none' && <div className="mt-4 flex flex-col gap-2 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 sm:flex-row sm:items-center sm:justify-between"><span><strong>Potential tax reduction:</strong> {inr(Math.max(0, calculated.tax.total - scenarioTax))} in this scenario.</span><CheckCircle2 className="h-5 w-5" /></div>}</CardContent></Card>

    <div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle>Optimal path</CardTitle><CardDescription>A simple order of operations for this financial year.</CardDescription></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex gap-3"><Badge className="h-6 w-6 justify-center rounded-full bg-emerald-600 p-0">1</Badge><p><strong>Use existing 80C room:</strong> prioritize investments that match your lock-in and risk comfort.</p></div><div className="flex gap-3"><Badge className="h-6 w-6 justify-center rounded-full bg-emerald-600 p-0">2</Badge><p><strong>Protect health:</strong> document self, spouse, and parent premiums under 80D.</p></div><div className="flex gap-3"><Badge className="h-6 w-6 justify-center rounded-full bg-emerald-600 p-0">3</Badge><p><strong>Collect evidence:</strong> keep receipts, loan certificates, donation receipts, and rent records before filing.</p></div><p className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">Reminder: confirm limits and eligibility with your CA before making a tax-driven investment.</p></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5 text-emerald-600" /> Documents &amp; export</CardTitle><CardDescription>Keep supporting evidence attached to your local plan.</CardDescription></CardHeader><CardContent className="space-y-3"><label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-sm hover:bg-muted/50"><UploadCloud className="h-4 w-4" /> Add receipt<input type="file" accept="image/*,.pdf" onChange={addReceipt} className="sr-only" /></label>{receipts.map((receipt) => <div key={`${receipt.name}-${receipt.addedAt}`} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-xs"><span className="truncate">{receipt.name}</span><span className="text-muted-foreground">Attached</span></div>)}<Button variant="outline" className="w-full" onClick={exportCsv}><Download /> Export deductions CSV</Button></CardContent></Card></div>
  </div>
}