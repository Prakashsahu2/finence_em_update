'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Bell, Check, CircleDollarSign, Trash2, WalletCards, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const icons = { BUDGET_EXCEEDED: AlertTriangle, LOW_BALANCE: WalletCards, SAVINGS_MILESTONE: CircleDollarSign, UPCOMING_BILL: Bell, UNUSUAL_SPENDING: AlertTriangle }

export default function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [knownIds, setKnownIds] = useState(new Set())
  const [threshold, setThreshold] = useState('0')

  async function load(showToast = false) {
    try {
      const response = await fetch('/api/notifications', { credentials: 'include' })
      if (!response.ok) return
      const data = await response.json()
      const fresh = data.notifications || []
      if (showToast) fresh.filter((item) => !knownIds.has(item.id) && !item.is_read).slice(0, 2).forEach((item) => toast(item.title, { description: item.message }))
      setItems(fresh); setKnownIds(new Set(fresh.map((item) => item.id)))
    } catch { /* Notification polling is non-blocking. */ }
  }

  useEffect(() => { load(); fetch('/api/settings', { credentials: 'include' }).then((response) => response.json()).then((data) => setThreshold(String(data.lowBalanceThreshold || 0))).catch(() => {}); const timer = setInterval(() => load(true), 30000); return () => clearInterval(timer) }, [])
  const unread = items.filter((item) => !item.is_read).length

  async function update(id, method, path = `/api/notifications/${id}`) {
    setLoading(true)
    try { await fetch(path, { method, credentials: 'include' }); await load() } finally { setLoading(false) }
  }

  async function saveThreshold() {
    const response = await fetch('/api/settings', { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lowBalanceThreshold: Number(threshold) }) })
    if (!response.ok) return toast.error('Could not save balance threshold')
    toast.success('Low balance threshold saved')
  }

  return <div className="relative">
    <Button variant="ghost" size="icon" aria-label="Notifications" onClick={() => setOpen((value) => !value)} className="relative text-slate-200 hover:bg-white/10 hover:text-white">
      <Bell className="h-5 w-5" />{unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unread > 99 ? '99+' : unread}</span>}
    </Button>
    {open && <div className="absolute right-0 z-50 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3"><div className="font-semibold text-white">Notifications</div><div className="flex gap-1"><Button variant="ghost" size="sm" disabled={!unread || loading} onClick={() => update('all', 'PATCH', '/api/notifications/mark-all-read')} className="h-7 text-xs text-slate-300"><Check className="mr-1 h-3.5 w-3.5" />Mark all read</Button><Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-7 w-7 text-slate-400"><X className="h-4 w-4" /></Button></div></div>
      <div className="border-b border-slate-800 px-4 py-3"><div className="mb-2 text-xs font-semibold text-slate-300">Low balance threshold</div><div className="flex gap-2"><Input type="number" min="0" value={threshold} onChange={(event) => setThreshold(event.target.value)} className="h-8 border-slate-700 bg-slate-800 text-xs text-white" placeholder="0 disables alert" /><Button size="sm" onClick={saveThreshold} className="h-8 bg-indigo-600 text-xs hover:bg-indigo-700">Save</Button></div></div>
      <div className="max-h-80 overflow-y-auto">{items.length === 0 ? <div className="px-4 py-10 text-center text-sm text-slate-400">No financial alerts yet.</div> : items.map((item) => { const Icon = icons[item.type] || Bell; return <div key={item.id} className={`flex gap-3 border-b border-slate-800 px-4 py-3 ${item.is_read ? 'opacity-60' : ''}`}><Icon className={`mt-0.5 h-4 w-4 shrink-0 ${item.priority === 'high' ? 'text-rose-400' : 'text-amber-400'}`} /><div className="min-w-0 flex-1"><div className="text-sm font-semibold text-slate-100">{item.title}</div><div className="mt-0.5 text-xs leading-relaxed text-slate-400">{item.message}</div><div className="mt-1 text-[10px] text-slate-500">{new Date(item.created_at).toLocaleString('en-IN')}</div></div><div className="flex shrink-0 gap-1"><Button variant="ghost" size="icon" title="Mark as read" disabled={item.is_read || loading} onClick={() => update(item.id, 'PATCH')} className="h-7 w-7 text-slate-400"><Check className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" title="Delete" disabled={loading} onClick={() => update(item.id, 'DELETE')} className="h-7 w-7 text-slate-400"><Trash2 className="h-3.5 w-3.5" /></Button></div></div> })}</div>
    </div>}
  </div>
}
