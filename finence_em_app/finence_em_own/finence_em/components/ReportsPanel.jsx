'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, FileText, Loader2, Table2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const reportTypes = [
  ['monthly-expenses', 'Monthly Expenses'], ['income-vs-expenses', 'Income vs Expenses'],
  ['category-spending', 'Category-Wise Spending'], ['savings', 'Savings Report'], ['yearly-summary', 'Yearly Financial Summary'],
]

export default function ReportsPanel() {
  const today = new Date()
  const [type, setType] = useState('monthly-expenses')
  const [month, setMonth] = useState(String(today.getMonth() + 1))
  const [year, setYear] = useState(String(today.getFullYear()))
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [format, setFormat] = useState('pdf')
  const [loading, setLoading] = useState(false)

  async function downloadReport() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ month, year, format })
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      const response = await fetch(`/api/reports/${type}?${params}`, { credentials: 'include' })
      if (!response.ok) throw new Error((await response.json()).error || 'Could not generate report')
      const blob = await response.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = response.headers.get('content-disposition')?.match(/filename="([^"]+)/)?.[1] || `FinWise_${type}.${format === 'excel' ? 'xlsx' : format}`
      link.click()
      URL.revokeObjectURL(link.href)
      toast.success('Report downloaded')
    } catch (error) {
      toast.error(error.message)
    } finally { setLoading(false) }
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Table2 className="h-5 w-5 text-indigo-500" /> Financial Reports</CardTitle>
        <CardDescription>Export your authenticated financial data in a professional format.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div><Label className="text-xs">Report type</Label><select value={type} onChange={(event) => setType(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">{reportTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <div><Label className="text-xs">Month</Label><select value={month} onChange={(event) => setMonth(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Date(2000, index, 1).toLocaleString('en-IN', { month: 'long' })}</option>)}</select></div>
          <div><Label className="text-xs">Year</Label><Input type="number" min="2000" max="2100" value={year} onChange={(event) => setYear(event.target.value)} /></div>
          <div><Label className="text-xs">Format</Label><select value={format} onChange={(event) => setFormat(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="pdf">PDF</option><option value="excel">Excel (.xlsx)</option><option value="csv">CSV</option></select></div>
        </div>
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4 md:grid-cols-2">
          <div><Label className="text-xs">Start date (optional)</Label><Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></div>
          <div><Label className="text-xs">End date (optional)</Label><Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
          <div className="flex items-center gap-3 text-sm text-slate-600">{format === 'pdf' ? <FileText className="h-5 w-5 text-rose-500" /> : format === 'excel' ? <FileSpreadsheet className="h-5 w-5 text-emerald-600" /> : <Download className="h-5 w-5 text-sky-600" />} Ready to export your selected report.</div>
          <Button onClick={downloadReport} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Generate & Download</Button>
        </div>
      </CardContent>
    </Card>
  )
}
