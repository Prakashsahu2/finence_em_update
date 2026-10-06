'use client'

import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDown, ArrowUp, CalendarDays, Check, Download, Edit3, Landmark, Plus, Save, Sparkles, Trash2, TrendingDown, Wallet, X, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { toast } from 'sonner'

const STORAGE_KEY = 'finwise-debt-payoff-plan'
const DEBT_TYPES = [
  { value: 'credit-card', label: 'Credit card', color: '#f97316' },
  { value: 'personal-loan', label: 'Personal loan', color: '#8b5cf6' },
  { value: 'car-loan', label: 'Car loan', color: '#0ea5e9' },
  { value: 'home-loan', label: 'Home loan', color: '#10b981' },
  { value: 'education-loan', label: 'Education loan', color: '#eab308' },
  { value: 'other', label: 'Other', color: '#64748b' },
]

const EMPTY_DEBT = { name: '', type: 'credit-card', balance: '', rate: '', minimum: '', fixedPayment: '' }

function inr(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function monthLabel(date) {
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

function cleanDebt(debt) {
  return {
    ...debt,
    balance: Math.max(0, Number(debt.balance) || 0),
    rate: Math.max(0, Number(debt.rate) || 0),
    minimum: Math.max(0, Number(debt.minimum) || 0),
    fixedPayment: Math.max(0, Number(debt.fixedPayment) || 0),
  }
}

function simulate(debts, strategy, extra = 0) {
  const working = debts.map((debt) => ({ ...cleanDebt(debt), remaining: Number(debt.balance) || 0, paidOffMonth: null }))
  const totalBalance = working.reduce((sum, debt) => sum + debt.remaining, 0)
  const monthlyPayment = working.reduce((sum, debt) => sum + Math.max(debt.minimum, debt.fixedPayment), 0) + Number(extra || 0)
  const rows = [{ month: 0, label: 'Today', balance: totalBalance, interest: 0, paid: 0 }]
  let totalInterest = 0
  let month = 0
  const start = new Date()

  while (working.some((debt) => debt.remaining > 0.01) && month < 600) {
    month += 1
    let interestThisMonth = 0
    working.forEach((debt) => {
      if (debt.remaining <= 0) return
      const interest = debt.remaining * (debt.rate / 100 / 12)
      debt.remaining += interest
      interestThisMonth += interest
    })
    totalInterest += interestThisMonth

    const active = working.filter((debt) => debt.remaining > 0.01)
    const ordered = [...active].sort((a, b) => strategy === 'avalanche' ? b.rate - a.rate || a.remaining - b.remaining : a.remaining - b.remaining || b.rate - a.rate)
    let payment = monthlyPayment
    active.forEach((debt) => {
      const minimum = Math.min(debt.remaining, Math.max(debt.minimum, debt.fixedPayment))
      debt.remaining -= minimum
      payment -= minimum
    })
    ordered.forEach((debt) => {
      if (payment <= 0 || debt.remaining <= 0) return
      const applied = Math.min(debt.remaining, payment)
      debt.remaining -= applied
      payment -= applied
    })
    working.forEach((debt) => {
      if (debt.remaining <= 0.01 && debt.paidOffMonth === null) debt.paidOffMonth = month
      debt.remaining = Math.max(0, debt.remaining)
    })
    const balance = working.reduce((sum, debt) => sum + debt.remaining, 0)
    const paid = totalBalance - balance
    const date = new Date(start.getFullYear(), start.getMonth() + month, 1)
    rows.push({ month, label: monthLabel(date), balance, interest: totalInterest, paid })
    if (monthlyPayment <= interestThisMonth && balance >= totalBalance) break
  }

  return { rows, totalInterest, months: month, totalBalance, monthlyPayment, debts: working }
}

function requiredPayment(debts, strategy, targetMonths) {
  if (!debts.length) return 0
  let low = 0
  let high = debts.reduce((sum, debt) => sum + Math.max(Number(debt.minimum) || 0, Number(debt.fixedPayment) || 0), 0) + debts.reduce((sum, debt) => sum + Number(debt.balance || 0), 0) / Math.max(1, targetMonths)
  while (simulate(debts, strategy, high).months > targetMonths && high < 100000000) high *= 2
  for (let i = 0; i < 28; i += 1) {
    const middle = (low + high) / 2
    if (simulate(debts, strategy, Math.max(0, middle - debts.reduce((sum, debt) => sum + Math.max(Number(debt.minimum) || 0, Number(debt.fixedPayment) || 0), 0))).months <= targetMonths) high = middle
    else low = middle
  }
  return Math.ceil(high / 100) * 100
}

function Field({ label, value, onChange, placeholder, prefix, min = 0, step = '1' }) {
  return <div className="space-y-1.5">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <div className="relative">
      {prefix && <span className="absolute left-3 top-2 text-sm text-muted-foreground">{prefix}</span>}
      <Input type="number" min={min} step={step} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={prefix ? 'pl-7' : ''} />
    </div>
  </div>
}

export default function DebtPayoffCalculator() {
  const [debts, setDebts] = useState([])
  const [draft, setDraft] = useState(EMPTY_DEBT)
  const [editingId, setEditingId] = useState(null)
  const [strategy, setStrategy] = useState('avalanche')
  const [extra, setExtra] = useState(5000)
  const [targetMonths, setTargetMonths] = useState(36)
  const [loaded, setLoaded] = useState(false)
  const [savedAt, setSavedAt] = useState(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
      if (saved?.debts) { setDebts(saved.debts); setExtra(Number(saved.extra) || 5000); setStrategy(saved.strategy || 'avalanche'); setSavedAt(saved.savedAt || null) }
    } catch { toast.error('Saved debt plan could not be loaded.') }
    setLoaded(true)
  }, [])

  const result = useMemo(() => simulate(debts, strategy, extra), [debts, strategy, extra])
  const otherResult = useMemo(() => simulate(debts, strategy === 'avalanche' ? 'snowball' : 'avalanche', extra), [debts, strategy, extra])
  const summary = useMemo(() => ({
    balance: debts.reduce((sum, debt) => sum + Number(debt.balance || 0), 0),
    minimum: debts.reduce((sum, debt) => sum + Number(debt.minimum || 0), 0),
    averageRate: debts.length ? debts.reduce((sum, debt) => sum + Number(debt.rate || 0), 0) / debts.length : 0,
  }), [debts])
  const targetPayments = useMemo(() => [12, 24, 36, 60].map((months) => ({ months, payment: requiredPayment(debts, strategy, months) })), [debts, strategy])
  const selectedTargetPayment = useMemo(() => requiredPayment(debts, strategy, targetMonths), [debts, strategy, targetMonths])
  const milestone50 = summary.balance * 0.5
  const milestone75 = summary.balance * 0.25
  const maxExtra = Math.max(10000, summary.minimum * 2, 5000)
  const progress = summary.balance ? Math.min(100, (result.rows[result.rows.length - 1]?.paid / summary.balance) * 100) : 0

  function updateDraft(key, value) { setDraft((current) => ({ ...current, [key]: value })) }

  function saveDebt(event) {
    event.preventDefault()
    const debt = cleanDebt(draft)
    if (!debt.name.trim() || debt.balance <= 0 || debt.rate < 0 || debt.minimum <= 0) { toast.error('Add a name, balance, interest rate, and minimum payment.'); return }
    if (editingId) setDebts((current) => current.map((item) => item.id === editingId ? { ...debt, id: editingId } : item))
    else setDebts((current) => [...current, { ...debt, id: `${Date.now()}-${Math.random()}` }])
    setDraft(EMPTY_DEBT); setEditingId(null); toast.success(editingId ? 'Debt updated.' : 'Debt added.')
  }

  function editDebt(debt) { setDraft(debt); setEditingId(debt.id) }
  function deleteDebt(id) { setDebts((current) => current.filter((debt) => debt.id !== id)); if (editingId === id) { setDraft(EMPTY_DEBT); setEditingId(null) } }
  function savePlan() {
    const timestamp = new Date().toISOString()
    const plan = { version: 1, debts, extra, strategy, savedAt: timestamp }
    try {
      const serialized = JSON.stringify(plan)
      localStorage.setItem(STORAGE_KEY, serialized)
      if (localStorage.getItem(STORAGE_KEY) !== serialized) throw new Error('Saved data could not be verified.')
      setSavedAt(timestamp)
      toast.success('Debt payoff plan saved in this browser.')
    } catch (error) {
      toast.error(error?.name === 'QuotaExceededError' ? 'Browser storage is full. Remove old site data and try again.' : 'Debt payoff plan could not be saved. Check browser storage permissions.')
    }
  }
  function exportPdf() { window.print() }

  if (!loaded) return null

  return <div className="space-y-5 print:bg-white print:text-black">
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="flex items-center gap-2"><Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Debt freedom workspace</Badge><span className="text-xs text-muted-foreground">{debts.length} {debts.length === 1 ? 'debt' : 'debts'} tracked</span></div>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">Debt Payoff Planner</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Turn a complicated balance sheet into a clear monthly plan. Compare the mathematically efficient Avalanche with the momentum-building Snowball.</p>
        {savedAt && <p className="mt-2 text-xs text-emerald-700">Saved in this browser on {new Date(savedAt).toLocaleString('en-IN')}</p>}
      </div>
      <div className="flex gap-2 print:hidden"><Button variant="outline" onClick={savePlan}><Save /> Save plan</Button><Button variant="outline" onClick={exportPdf}><Download /> Export PDF</Button></div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total debt</p><p className="mt-1 text-xl font-bold">{inr(summary.balance)}</p><p className="mt-1 text-xs text-muted-foreground">Across {debts.length} accounts</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Average interest</p><p className="mt-1 text-xl font-bold">{summary.averageRate.toFixed(2)}%</p><p className="mt-1 text-xs text-muted-foreground">Weighted opportunity to save</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Minimum payments</p><p className="mt-1 text-xl font-bold">{inr(summary.minimum)}<span className="text-sm font-normal">/mo</span></p><p className="mt-1 text-xs text-muted-foreground">Your baseline commitment</p></CardContent></Card>
      <Card className="border-emerald-200 bg-emerald-50/50"><CardContent className="p-4"><p className="text-xs text-emerald-700">Projected debt-free date</p><p className="mt-1 text-xl font-bold text-emerald-800">{result.months && result.months < 600 ? result.rows[result.rows.length - 1].label : 'Increase payment'}</p><p className="mt-1 text-xs text-emerald-700">{inr(result.totalInterest)} total interest</p></CardContent></Card>
    </div>

    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.4fr)]">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5 text-emerald-600" /> Your debts</CardTitle><CardDescription>Add each account to build a complete payoff order.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {debts.length === 0 && <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No debts yet. Add your first account below to see a payoff plan.</div>}
          <div className="space-y-2">
            {debts.map((debt) => <div key={debt.id} className="flex items-center gap-3 rounded-lg border p-3">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: DEBT_TYPES.find((item) => item.value === debt.type)?.color || '#64748b' }} />
              <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold">{debt.name}</p><Badge variant="secondary" className="hidden text-[10px] sm:inline-flex">{DEBT_TYPES.find((item) => item.value === debt.type)?.label}</Badge></div><p className="text-xs text-muted-foreground">{inr(debt.balance)} at {Number(debt.rate).toFixed(2)}% · {inr(debt.minimum)}/mo min</p></div>
              <Button variant="ghost" size="icon" onClick={() => editDebt(debt)} aria-label={`Edit ${debt.name}`}><Edit3 /></Button><Button variant="ghost" size="icon" onClick={() => deleteDebt(debt.id)} aria-label={`Delete ${debt.name}`}><Trash2 className="text-rose-500" /></Button>
            </div>)}
          </div>
          <form onSubmit={saveDebt} className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900/40">
            <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">{editingId ? 'Edit debt' : 'Add a debt'}</p>{editingId && <Button type="button" variant="ghost" size="sm" onClick={() => { setDraft(EMPTY_DEBT); setEditingId(null) }}><X /> Cancel</Button>}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Debt name" value={draft.name} onChange={(value) => updateDraft('name', value)} placeholder="Credit Card HDFC" />
              <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Debt type</Label><Select value={draft.type} onValueChange={(value) => updateDraft('type', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DEBT_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent></Select></div>
              <Field label="Outstanding balance" value={draft.balance} onChange={(value) => updateDraft('balance', value)} placeholder="150000" prefix="₹" />
              <Field label="Annual interest rate" value={draft.rate} onChange={(value) => updateDraft('rate', value)} placeholder="14.5" step="0.01" />
              <Field label="Minimum monthly payment" value={draft.minimum} onChange={(value) => updateDraft('minimum', value)} placeholder="5000" prefix="₹" />
              <Field label="Fixed payment (optional)" value={draft.fixedPayment} onChange={(value) => updateDraft('fixedPayment', value)} placeholder="Same as minimum" prefix="₹" />
            </div>
            <Button type="submit" className="mt-4 w-full"><Plus /> {editingId ? 'Update debt' : 'Add debt'}</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between"><div><CardTitle className="flex items-center gap-2"><TrendingDown className="h-5 w-5 text-emerald-600" /> Payoff strategy</CardTitle><CardDescription>Choose how every extra rupee is assigned.</CardDescription></div><div className="flex rounded-lg bg-muted p-1"><Button size="sm" variant={strategy === 'avalanche' ? 'default' : 'ghost'} onClick={() => setStrategy('avalanche')}>Avalanche</Button><Button size="sm" variant={strategy === 'snowball' ? 'default' : 'ghost'} onClick={() => setStrategy('snowball')}>Snowball</Button></div></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2"><div className={`rounded-lg border p-4 ${strategy === 'avalanche' ? 'border-emerald-300 bg-emerald-50/60' : ''}`}><div className="flex items-center gap-2 font-semibold"><ArrowDown className="h-4 w-4" /> Avalanche</div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Highest interest first. Usually minimizes interest and reaches the finish line sooner financially.</p></div><div className={`rounded-lg border p-4 ${strategy === 'snowball' ? 'border-amber-300 bg-amber-50/60' : ''}`}><div className="flex items-center gap-2 font-semibold"><Zap className="h-4 w-4" /> Snowball</div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Smallest balance first. Quick wins create visible momentum and motivation.</p></div></div>
          <div className="rounded-lg border p-4"><div className="flex items-center justify-between"><div><Label>Extra monthly payment</Label><p className="mt-1 text-xs text-muted-foreground">Beyond your minimums: {inr(extra)} / month</p></div><Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{inr(extra)}</Badge></div><Slider className="mt-5" min={0} max={maxExtra} step={500} value={[extra]} onValueChange={([value]) => setExtra(value)} /></div>
          <div className="grid gap-3 sm:grid-cols-3"><Stat label="Finish in" value={result.months < 600 ? `${result.months} months` : 'Not on track'} /><Stat label="Total interest" value={inr(result.totalInterest)} /><Stat label="Interest saved" value={inr(Math.max(0, otherResult.totalInterest - result.totalInterest))} tone="emerald" /></div>
          <div className="space-y-2"><div className="flex justify-between text-xs"><span>Debt-free progress</span><span className="font-semibold">{Math.round(progress)}%</span></div><Progress value={progress} className="h-2" /><p className="text-xs text-muted-foreground">{strategy === 'avalanche' ? 'Your highest-cost debt receives the next rupee.' : 'Your smallest balances are getting cleared first.'}</p></div>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><TrendingDown className="h-5 w-5 text-emerald-600" /> Payoff timeline</CardTitle><CardDescription>Balance and cumulative interest are projected month by month using your selected strategy.</CardDescription></CardHeader>
      <CardContent>
        {debts.length ? <div className="h-[320px] w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={result.rows.slice(0, 121)} margin={{ top: 10, right: 12, left: 4, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="label" minTickGap={32} /><YAxis yAxisId="balance" tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} /><YAxis yAxisId="interest" orientation="right" tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} /><Tooltip formatter={(value, name) => [inr(value), name === 'balance' ? 'Remaining balance' : 'Cumulative interest']} /><Legend /><Line yAxisId="balance" type="monotone" dataKey="balance" name="Remaining balance" stroke="#10b981" strokeWidth={3} dot={false} /><Line yAxisId="interest" type="monotone" dataKey="interest" name="Cumulative interest" stroke="#f97316" strokeWidth={2} dot={false} strokeDasharray="5 4" /><ReferenceLine yAxisId="balance" y={milestone50} stroke="#94a3b8" strokeDasharray="3 3" label="50% paid" /><ReferenceLine yAxisId="balance" y={milestone75} stroke="#cbd5e1" strokeDasharray="3 3" label="75% paid" /></LineChart></ResponsiveContainer></div> : <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">Add debts to unlock your projected timeline.</div>}
        {debts.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{result.debts.map((debt) => <div key={debt.id} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-xs"><span className="flex min-w-0 items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: DEBT_TYPES.find((item) => item.value === debt.type)?.color }} /><span className="truncate">{debt.name}</span></span><span className="font-medium">{debt.paidOffMonth ? `Month ${debt.paidOffMonth}` : 'Needs more payment'}</span></div>)}</div>}
      </CardContent>
    </Card>

    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-emerald-600" /> Payment targets</CardTitle><CardDescription>Required total monthly payment to finish within each horizon.</CardDescription></CardHeader><CardContent className="space-y-3">{targetPayments.map((item) => <div key={item.months} className="flex items-center justify-between rounded-lg border px-4 py-3"><span className="text-sm font-medium">{item.months / 12} year{item.months > 12 ? 's' : ''}</span><span className="font-semibold">{inr(item.payment)}<span className="text-xs font-normal text-muted-foreground"> / month</span></span></div>)}<div className="rounded-lg bg-emerald-50 p-4"><div className="flex items-center justify-between"><Label>Custom timeline</Label><span className="font-bold text-emerald-700">{targetMonths} months</span></div><Slider className="mt-4" min={6} max={120} step={1} value={[targetMonths]} onValueChange={([value]) => setTargetMonths(value)} /><p className="mt-3 text-xs text-emerald-700">Aim for a total payment of <strong>{inr(selectedTargetPayment)}/month</strong> to finish in this window.</p></div></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-amber-500" /> What-if scenario</CardTitle><CardDescription>See the cost of waiting, or the benefit of a small extra payment.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="rounded-lg border p-4"><div className="flex items-center justify-between"><span className="text-sm">Add extra each month</span><Badge variant="secondary">{inr(extra)}</Badge></div><p className="mt-2 text-sm text-muted-foreground">At this pace you could be debt-free in <strong className="text-foreground">{result.months < 600 ? result.months : 'more than 600'} months</strong>.</p></div><div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4"><p className="text-sm font-semibold text-amber-900">{debts.length ? result.months <= 24 ? 'You can see the finish line.' : 'Small increases compound into real freedom.' : 'Your plan starts with one honest list.'}</p><p className="mt-1 text-xs leading-relaxed text-amber-800">{debts.length ? `Each extra ${inr(1000)} per month changes the order and reduces future interest. Keep the payment automated after payday.` : 'Add your debts, then use the slider to model a realistic extra payment.'}</p></div><div className="flex items-center gap-2 text-xs text-muted-foreground"><Check className="h-4 w-4 text-emerald-600" /> Plan recalculates instantly as your inputs change.</div></CardContent></Card>
    </div>

    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-emerald-600" /> Year-by-year view</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[520px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="pb-3 font-medium">Year</th><th className="pb-3 font-medium">Starting balance</th><th className="pb-3 font-medium">Interest paid</th><th className="pb-3 text-right font-medium">Ending balance</th></tr></thead><tbody>{Array.from({ length: Math.max(1, Math.min(5, Math.ceil(result.months / 12))) }, (_, index) => { const end = result.rows[Math.min(result.rows.length - 1, (index + 1) * 12)]; const start = result.rows[Math.min(result.rows.length - 1, index * 12)]; const interest = Math.max(0, (end?.interest || 0) - (start?.interest || 0)); return <tr key={index} className="border-b last:border-0"><td className="py-3">Year {index + 1}</td><td className="py-3">{inr(start?.balance)}</td><td className="py-3">{inr(interest)}</td><td className="py-3 text-right font-semibold">{inr(end?.balance)}</td></tr> })}</tbody></table></div></CardContent></Card>
  </div>
}

function Stat({ label, value, tone }) { return <div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 text-sm font-bold ${tone === 'emerald' ? 'text-emerald-600' : ''}`}>{value}</p></div> }