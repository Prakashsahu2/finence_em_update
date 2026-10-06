'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bike,
  Brain,
  Briefcase,
  Calculator,
  CarFront,
  CreditCard,
  GraduationCap,
  HeartHandshake,
  Home,
  Lightbulb,
  PiggyBank,
  RefreshCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import { toast } from 'sonner'

const SCENARIOS = [
  { key: 'bike', title: 'Buy Bike', subtitle: 'Two-wheeler with EMI modeling', icon: Bike, tone: 'from-emerald-500/20 via-teal-500/10 to-cyan-500/10' },
  { key: 'car', title: 'Buy Car', subtitle: 'Car down payment and EMI stress test', icon: CarFront, tone: 'from-sky-500/20 via-cyan-500/10 to-indigo-500/10' },
  { key: 'phone', title: 'Buy Phone', subtitle: 'Phone or laptop purchase impact', icon: Smartphone, tone: 'from-fuchsia-500/20 via-pink-500/10 to-rose-500/10' },
  { key: 'home_loan', title: 'Home Loan', subtitle: 'Large purchase + long-tenure loan', icon: Home, tone: 'from-amber-500/20 via-orange-500/10 to-rose-500/10' },
  { key: 'education', title: 'Education', subtitle: 'Course, degree, or study abroad cost', icon: GraduationCap, tone: 'from-indigo-500/20 via-violet-500/10 to-fuchsia-500/10' },
  { key: 'marriage', title: 'Marriage', subtitle: 'One-time event with savings planning', icon: HeartHandshake, tone: 'from-rose-500/20 via-pink-500/10 to-amber-500/10' },
  { key: 'job_loss', title: 'Job Loss', subtitle: 'Income gap and runway simulation', icon: Briefcase, tone: 'from-slate-500/20 via-gray-500/10 to-zinc-500/10' },
  { key: 'emergency', title: 'Emergency', subtitle: 'Medical or urgent unexpected expense', icon: AlertTriangle, tone: 'from-red-500/20 via-orange-500/10 to-amber-500/10' },
  { key: 'income_reduction', title: 'Income Reduction', subtitle: 'Salary cut or reduced workload', icon: TrendingDown, tone: 'from-yellow-500/20 via-amber-500/10 to-orange-500/10' },
  { key: 'salary_increase', title: 'Salary Increase', subtitle: 'Raise, promotion, or side-income boost', icon: TrendingUp, tone: 'from-emerald-500/20 via-lime-500/10 to-green-500/10' },
  { key: 'new_emi', title: 'New EMI', subtitle: 'New debt burden impact on cash flow', icon: CreditCard, tone: 'from-cyan-500/20 via-sky-500/10 to-blue-500/10' },
  { key: 'custom', title: 'Custom Scenario', subtitle: 'Design any financial what-if model', icon: Brain, tone: 'from-violet-500/20 via-purple-500/10 to-fuchsia-500/10' },
]

const SCENARIO_FIELDS = {
  bike: [
    { key: 'purchasePrice', label: 'Purchase Price', type: 'number', placeholder: '60000' },
    { key: 'downPayment', label: 'Down Payment', type: 'number', placeholder: '10000' },
    { key: 'interestRate', label: 'Interest Rate %', type: 'number', placeholder: '12' },
    { key: 'loanDurationMonths', label: 'Loan Duration (months)', type: 'number', placeholder: '24' },
    { key: 'monthlyMaintenance', label: 'Monthly Running Cost', type: 'number', placeholder: '500' },
  ],
  car: [
    { key: 'purchasePrice', label: 'Car Price', type: 'number', placeholder: '1200000' },
    { key: 'downPayment', label: 'Down Payment', type: 'number', placeholder: '250000' },
    { key: 'interestRate', label: 'Interest Rate %', type: 'number', placeholder: '9.5' },
    { key: 'loanDurationMonths', label: 'Loan Duration (months)', type: 'number', placeholder: '60' },
    { key: 'monthlyMaintenance', label: 'Insurance + Maintenance', type: 'number', placeholder: '5000' },
  ],
  phone: [
    { key: 'purchasePrice', label: 'Device Price', type: 'number', placeholder: '85000' },
    { key: 'downPayment', label: 'Upfront Payment', type: 'number', placeholder: '0' },
    { key: 'interestRate', label: 'Interest Rate %', type: 'number', placeholder: '0' },
    { key: 'loanDurationMonths', label: 'Payback Period (months)', type: 'number', placeholder: '12' },
    { key: 'monthlyMaintenance', label: 'Accessory / Protection Plan', type: 'number', placeholder: '1000' },
  ],
  home_loan: [
    { key: 'purchasePrice', label: 'Property Value', type: 'number', placeholder: '6500000' },
    { key: 'downPayment', label: 'Down Payment', type: 'number', placeholder: '1300000' },
    { key: 'interestRate', label: 'Loan Interest %', type: 'number', placeholder: '8.5' },
    { key: 'loanDurationMonths', label: 'Loan Tenure (months)', type: 'number', placeholder: '240' },
    { key: 'monthlyMaintenance', label: 'Maintenance + Insurance', type: 'number', placeholder: '7000' },
  ],
  education: [
    { key: 'purchasePrice', label: 'Tuition / Total Cost', type: 'number', placeholder: '450000' },
    { key: 'downPayment', label: 'Scholarship / Upfront Support', type: 'number', placeholder: '50000' },
    { key: 'interestRate', label: 'Education Loan %', type: 'number', placeholder: '10' },
    { key: 'loanDurationMonths', label: 'Repayment Period (months)', type: 'number', placeholder: '72' },
    { key: 'monthlyMaintenance', label: 'Monthly Living Cost', type: 'number', placeholder: '15000' },
  ],
  marriage: [
    { key: 'totalCost', label: 'Marriage Budget', type: 'number', placeholder: '800000' },
    { key: 'downPayment', label: 'Family Contribution', type: 'number', placeholder: '200000' },
    { key: 'interestRate', label: 'Borrowing Cost %', type: 'number', placeholder: '10' },
    { key: 'loanDurationMonths', label: 'Recovery Period (months)', type: 'number', placeholder: '36' },
    { key: 'monthlyMaintenance', label: 'Monthly Added Lifestyle Cost', type: 'number', placeholder: '3000' },
  ],
  job_loss: [
    { key: 'monthsWithoutIncome', label: 'Months Without Income', type: 'number', placeholder: '3' },
    { key: 'monthlyJobSearchCost', label: 'Job Search / Travel Cost', type: 'number', placeholder: '3000' },
    { key: 'durationMonths', label: 'Simulation Horizon (months)', type: 'number', placeholder: '6' },
  ],
  emergency: [
    { key: 'emergencyExpense', label: 'Emergency Expense', type: 'number', placeholder: '125000' },
    { key: 'insuranceCover', label: 'Insurance Cover / Support', type: 'number', placeholder: '50000' },
    { key: 'durationMonths', label: 'Recovery Horizon (months)', type: 'number', placeholder: '6' },
    { key: 'monthlyFollowUpCost', label: 'Monthly Follow-up Cost', type: 'number', placeholder: '5000' },
  ],
  income_reduction: [
    { key: 'reductionPercent', label: 'Income Reduction %', type: 'number', placeholder: '20' },
    { key: 'reductionAmount', label: 'Fixed Monthly Loss', type: 'number', placeholder: '0' },
    { key: 'durationMonths', label: 'Impact Period (months)', type: 'number', placeholder: '6' },
  ],
  salary_increase: [
    { key: 'increasePercent', label: 'Salary Increase %', type: 'number', placeholder: '15' },
    { key: 'increaseAmount', label: 'Fixed Monthly Raise', type: 'number', placeholder: '0' },
    { key: 'durationMonths', label: 'Projection Period (months)', type: 'number', placeholder: '12' },
  ],
  new_emi: [
    { key: 'emiAmount', label: 'New EMI Amount', type: 'number', placeholder: '12000' },
    { key: 'emiMonths', label: 'EMI Duration (months)', type: 'number', placeholder: '36' },
  ],
  custom: [
    { key: 'oneTimeExpense', label: 'One-time Expense', type: 'number', placeholder: '250000' },
    { key: 'monthlyIncomeChange', label: 'Monthly Income Change', type: 'number', placeholder: '0' },
    { key: 'monthlyExpenseChange', label: 'Monthly Expense Change', type: 'number', placeholder: '0' },
    { key: 'durationMonths', label: 'Projection Period (months)', type: 'number', placeholder: '12' },
  ],
}

function money(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`
}

function getDefaultValues(key, analysis) {
  const monthlyExpense = Math.max(1, Math.round(
    analysis?.spending?.monthlyTrend?.length
      ? analysis.spending.monthlyTrend.reduce((acc, item) => acc + Number(item.expense || 0), 0) / analysis.spending.monthlyTrend.length
      : Number(analysis?.summary?.totalExpense || 0),
  ))
  const monthlyIncome = Math.max(1, Math.round(
    analysis?.spending?.monthlyTrend?.length
      ? analysis.spending.monthlyTrend.reduce((acc, item) => acc + Number(item.income || 0), 0) / analysis.spending.monthlyTrend.length
      : Number(analysis?.summary?.totalIncome || 0),
  ))
  const balance = Number(analysis?.summary?.currentBalance || 0)

  const defaults = {
    bike: { purchasePrice: 70000, downPayment: 15000, interestRate: 12, loanDurationMonths: 24, monthlyMaintenance: 800 },
    car: { purchasePrice: 1250000, downPayment: 250000, interestRate: 9.5, loanDurationMonths: 60, monthlyMaintenance: 5000 },
    phone: { purchasePrice: 85000, downPayment: 0, interestRate: 0, loanDurationMonths: 12, monthlyMaintenance: 1200 },
    home_loan: { purchasePrice: 6500000, downPayment: Math.max(0, Math.round(balance * 0.3)), interestRate: 8.5, loanDurationMonths: 240, monthlyMaintenance: 7000 },
    education: { purchasePrice: 450000, downPayment: 50000, interestRate: 10, loanDurationMonths: 72, monthlyMaintenance: 15000 },
    marriage: { totalCost: 800000, downPayment: 200000, interestRate: 10, loanDurationMonths: 36, monthlyMaintenance: 3000 },
    job_loss: { monthsWithoutIncome: 3, monthlyJobSearchCost: 3000, durationMonths: 6 },
    emergency: { emergencyExpense: 125000, insuranceCover: 50000, durationMonths: 6, monthlyFollowUpCost: 5000 },
    income_reduction: { reductionPercent: 20, reductionAmount: 0, durationMonths: 6 },
    salary_increase: { increasePercent: 15, increaseAmount: Math.max(0, Math.round(monthlyIncome * 0.1)), durationMonths: 12 },
    new_emi: { emiAmount: 12000, emiMonths: 36 },
    custom: { oneTimeExpense: 250000, monthlyIncomeChange: 0, monthlyExpenseChange: 0, durationMonths: 12 },
  }

  return defaults[key] || defaults.custom
}

export default function LifeSimulator({ api, analysis, transactions, defaultScenario = 'bike' }) {
  const [selectedScenario, setSelectedScenario] = useState(defaultScenario)
  const [form, setForm] = useState(() => getDefaultValues(defaultScenario, analysis))
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const formRef = useRef(null)

  useEffect(() => {
    setForm(getDefaultValues(selectedScenario, analysis))
    setResult(null)
  }, [selectedScenario, analysis])

  useEffect(() => {
    if (defaultScenario && defaultScenario !== selectedScenario) {
      setSelectedScenario(defaultScenario)
    }
  }, [defaultScenario])

  useEffect(() => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedScenario])

  const scenarioMeta = useMemo(() => SCENARIOS.find((scenario) => scenario.key === selectedScenario) || SCENARIOS[0], [selectedScenario])
  const fields = SCENARIO_FIELDS[selectedScenario] || SCENARIO_FIELDS.custom

  const currentBalance = Number(analysis?.summary?.currentBalance || 0)
  const monthlySavings = Number(analysis?.summary?.savings || 0)
  const savingsRate = Number(analysis?.summary?.savingsRate || 0)
  const emergencyMonths = useMemo(() => {
    const monthlyExpense = analysis?.spending?.monthlyTrend?.length
      ? analysis.spending.monthlyTrend.reduce((acc, item) => acc + Number(item.expense || 0), 0) / analysis.spending.monthlyTrend.length
      : Number(analysis?.summary?.totalExpense || 0)
    return monthlyExpense > 0 ? currentBalance / monthlyExpense : 0
  }, [analysis, currentBalance])

  const handleRunSimulation = async () => {
    if (!api) {
      toast.error('Simulation API is not available')
      return
    }

    setLoading(true)
    try {
      const response = await api('/life-simulator', {
        method: 'POST',
        body: JSON.stringify({ scenario: selectedScenario, inputs: form }),
      })
      setResult(response)
      toast.success('Scenario simulation completed')
    } catch (error) {
      toast.error(error.message || 'Simulation failed')
    } finally {
      setLoading(false)
    }
  }

  const riskValue = result?.status === 'Safe' ? 100 : result?.status === 'Manageable' ? 72 : result?.status === 'Tight' ? 48 : 22
  const chartData = result?.projection || []

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white relative">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_right,_rgba(129,140,248,0.35),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.22),_transparent_32%)]" />
        <CardContent className="relative p-6 md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" /> AI Financial Life Simulator
              </div>
              <h2 className="mt-4 text-3xl md:text-4xl font-black tracking-tight">Financial Life Simulator</h2>
              <p className="mt-3 text-sm md:text-base text-slate-300 max-w-2xl">
                See how today's decisions could affect your financial future. Model major purchases, income shocks, or custom life events before you commit.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
              <StatChip label="Current balance" value={money(currentBalance)} icon={PiggyBank} />
              <StatChip label="Monthly savings" value={money(monthlySavings)} icon={TrendingUp} />
              <StatChip label="Savings rate" value={`${savingsRate}%`} icon={ShieldCheck} />
              <StatChip label="Emergency runway" value={`${emergencyMonths.toFixed(1)} mo`} icon={Activity} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md bg-white/90 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl"><Brain className="h-5 w-5 text-indigo-600" /> Choose a scenario</CardTitle>
          <CardDescription>Click a card to load the matching calculator and simulation inputs.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {SCENARIOS.map((scenario) => {
              const Icon = scenario.icon
              const active = scenario.key === selectedScenario
              return (
                <button
                  key={scenario.key}
                  type="button"
                  onClick={() => setSelectedScenario(scenario.key)}
                  className={`group rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${active ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <div className={`rounded-2xl bg-gradient-to-br ${scenario.tone} p-4 transition-transform group-hover:scale-[1.02]`}>
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950/90 text-white shadow-lg"><Icon className="h-5 w-5" /></div>
                      {active ? <Badge className="bg-indigo-600 text-white">Active</Badge> : <Badge variant="secondary">Tap to open</Badge>}
                    </div>
                    <div className="mt-4 text-lg font-bold text-slate-950">{scenario.title}</div>
                    <div className="mt-1 text-sm text-slate-700">{scenario.subtitle}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card ref={formRef} className="border-0 shadow-lg bg-white/95 backdrop-blur-xl">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl"><scenarioMeta.icon className="h-5 w-5 text-indigo-600" /> {scenarioMeta.title}</CardTitle>
              <CardDescription>{scenarioMeta.subtitle}</CardDescription>
            </div>
            <Badge className="w-fit bg-slate-900 text-white hover:bg-slate-900">Live data from {transactions?.length || 0} transactions</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label className="text-xs font-semibold text-slate-600">{field.label}</Label>
                <Input
                  type={field.type}
                  value={form[field.key] ?? ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                  placeholder={field.placeholder}
                  className="bg-slate-50 border-slate-200 focus-visible:ring-indigo-500"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Expected EMI</div>
              <div className="mt-1 text-sm text-slate-600">Calculated automatically for purchase, loan, and education scenarios after you submit.</div>
            </div>
            <Button onClick={handleRunSimulation} disabled={loading} className="bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md hover:from-indigo-700 hover:to-cyan-700">
              {loading ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />} Run simulation
            </Button>
          </div>

          {result && (
            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <Card className="border border-slate-100 bg-gradient-to-br from-white to-indigo-50/30 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg"><Lightbulb className="h-4 w-4 text-amber-500" /> Simulation result</CardTitle>
                      <CardDescription>{result.scenarioLabel || scenarioMeta.title}</CardDescription>
                    </div>
                    <Badge className={`${result.status === 'Safe' ? 'bg-emerald-600' : result.status === 'Manageable' ? 'bg-teal-600' : result.status === 'Tight' ? 'bg-amber-600' : 'bg-rose-600'} text-white`}>{result.status || 'Manageable'}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Verdict</div>
                    <p className="mt-2 text-base font-semibold text-slate-900">{result.verdict}</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{result.analysis}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {(result.metrics || []).map((metric) => (
                      <div key={metric.label} className="rounded-2xl border border-slate-100 bg-white p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{metric.label}</div>
                        <div className="mt-1 text-lg font-bold text-slate-900">{metric.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Zap className="h-4 w-4 text-indigo-500" /> AI action checklist</div>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                      {(result.actionSteps || []).map((step, index) => (
                        <li key={index} className="flex items-start gap-2"><ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" /><span>{step}</span></li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card className="border border-slate-100 bg-white shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Risk level</CardTitle>
                    <CardDescription>How strained this scenario looks against your current finances.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Progress value={riskValue} className="h-3 [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:via-amber-500 [&>div]:to-rose-500" />
                    <div className="mt-2 text-xs text-slate-500">Higher is safer. Lower indicates more risk.</div>
                  </CardContent>
                </Card>

                <Card className="border border-slate-100 bg-white shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg"><TrendingUp className="h-4 w-4 text-indigo-600" /> Projection</CardTitle>
                    <CardDescription>Baseline vs simulated monthly balance over time.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => money(value)} />
                        <Legend />
                        <Line type="monotone" dataKey="baseline" name="Baseline" stroke="#475569" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="scenario" name="Scenario" stroke="#4f46e5" strokeWidth={3} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border border-slate-100 bg-white shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Assumptions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-slate-600">
                    {(result.assumptions || []).map((line, index) => (
                      <div key={index} className="rounded-xl bg-slate-50 px-3 py-2">{line}</div>
                    ))}
                    {(result.riskFlags || []).length > 0 && (
                      <>
                        <Separator className="my-3" />
                        <div className="flex items-center gap-2 text-sm font-semibold text-rose-700"><AlertTriangle className="h-4 w-4" /> Risk flags</div>
                        <div className="space-y-2">
                          {(result.riskFlags || []).map((flag, index) => (
                            <div key={index} className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-rose-700">{flag}</div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatChip({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-300"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <div className="mt-2 text-sm font-bold text-white">{value}</div>
    </div>
  )
}