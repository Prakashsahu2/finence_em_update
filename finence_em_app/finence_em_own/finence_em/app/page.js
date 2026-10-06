'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import {
  Wallet, TrendingUp, TrendingDown, PiggyBank, Sparkles, Trash2, PlusCircle, Database,
  AlertTriangle, ShieldCheck, PieChart as PieIcon, Activity, Target, Brain, RefreshCcw,
  Repeat, AlertOctagon, Zap, Lightbulb, LogOut, MessageSquare, Clock, HelpCircle,
  CheckCircle, UploadCloud, ChevronRight, Sparkle, Palette
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import Auth from '@/components/Auth'
import LifeSimulator from '@/components/LifeSimulator'
import HomeDashboard from '@/components/HomeDashboard'
import ReceiptScanner from '@/components/ReceiptScanner'
import ReportsPanel from '@/components/ReportsPanel'
import NotificationsBell from '@/components/NotificationsBell'
import DebtPayoffCalculator from '@/components/DebtPayoffCalculator'
import TaxPlanning from '@/components/TaxPlanning'
import NewsAndMarketDashboard from '@/components/NewsAndMarket/NewsAndMarketDashboard'

const CATEGORIES = ['Salary', 'Business', 'Investment', 'Food', 'Shopping', 'Transport', 'Rent', 'Utilities', 'Entertainment', 'Health', 'Education', 'Loan/EMI', 'Other']
const PIE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#3b82f6', '#a855f7', '#64748b']

function inr(n) {
  if (n === undefined || n === null || isNaN(n)) return '\u20B90'
  return '\u20B9' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

function round(n, d = 2) { return Math.round(n * 10 ** d) / 10 ** d }
function mean(arr) { return arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0 }

function getUserId() {
  if (typeof window === 'undefined') return 'demo-user'
  let uid = localStorage.getItem('finwise-uid')
  if (!uid) {
    uid = 'u-' + Math.random().toString(36).slice(2, 10)
    localStorage.setItem('finwise-uid', uid)
  }
  return uid
}

async function api(path, options = {}) {
  const uid = getUserId()
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': uid,
      ...(options.headers || {}),
    },
  })
  if (!res.ok) throw new Error((await res.json()).error || 'Request failed')
  return res.json()
}

const THEME_STYLES = {
  aurora: {
    id: 'aurora',
    name: '✨ Midnight Aurora',
    wrapper: 'bg-[#090D16] text-slate-100 min-h-screen relative overflow-hidden transition-colors duration-500',
    glow1: 'bg-indigo-600/30',
    glow2: 'bg-purple-600/25',
    header: 'bg-slate-900/80 border-slate-800 text-white backdrop-blur-xl',
  },
  cyber: {
    id: 'cyber',
    name: '❇️ Cyber Emerald',
    wrapper: 'bg-[#031513] text-emerald-100 min-h-screen relative overflow-hidden transition-colors duration-500',
    glow1: 'bg-emerald-500/25',
    glow2: 'bg-teal-500/20',
    header: 'bg-[#05221F]/80 border-emerald-900/50 text-white backdrop-blur-xl',
  },
  cosmic: {
    id: 'cosmic',
    name: '🌌 Cosmic Royal',
    wrapper: 'bg-[#0F081D] text-purple-100 min-h-screen relative overflow-hidden transition-colors duration-500',
    glow1: 'bg-purple-600/30',
    glow2: 'bg-fuchsia-600/25',
    header: 'bg-[#180D2E]/80 border-purple-900/50 text-white backdrop-blur-xl',
  },
  sunset: {
    id: 'sunset',
    name: '🌅 Sunset Gold',
    wrapper: 'bg-[#120B09] text-amber-100 min-h-screen relative overflow-hidden transition-colors duration-500',
    glow1: 'bg-amber-600/25',
    glow2: 'bg-rose-600/20',
    header: 'bg-[#1F120E]/80 border-amber-900/50 text-white backdrop-blur-xl',
  },
  pearl: {
    id: 'pearl',
    name: '🌸 Pearl Lavender',
    wrapper: 'bg-gradient-to-br from-slate-100 via-indigo-50/70 to-purple-100/80 text-slate-900 min-h-screen relative overflow-hidden transition-colors duration-500',
    glow1: 'bg-indigo-300/30',
    glow2: 'bg-purple-300/30',
    header: 'bg-white/80 border-slate-200 text-slate-900 backdrop-blur-xl',
  },
  volt: {
    id: 'volt',
    name: '⚡ Volt Neon Surge',
    wrapper: 'bg-gradient-to-br from-[#000612] via-[#051A28] to-[#1a3a52] text-cyan-50 min-h-screen relative overflow-hidden transition-colors duration-700',
    glow1: 'bg-cyan-500',
    glow2: 'bg-lime-500',
    glow3: 'bg-white/10',
    header: 'bg-[#001020]/80 border-cyan-900/40 text-white backdrop-blur-xl shadow-inner',
    primary: 'active:from-cyan-500 active:via-cyan-200 active:to-cyan-300',
    secondary: 'hover:from-lime-400 hover:to-lime-500',
    accent: 'focus:ring-cyan-400 focus:ring-2 focus-offset-2'
  },
  ocean: {
    id: 'ocean',
    name: '🌊 Ocean Depths',
    wrapper: 'bg-gradient-to-br from-[#020B18] via-[#061A2E] to-[#0A2540] text-blue-50 min-h-screen relative overflow-hidden transition-colors duration-500',
    glow1: 'bg-blue-600/25',
    glow2: 'bg-teal-500/20',
    header: 'bg-[#041222]/80 border-blue-900/40 text-white backdrop-blur-xl',
  },
  rose: {
    id: 'rose',
    name: '🥀 Rose Noir',
    wrapper: 'bg-gradient-to-br from-[#120508] via-[#1A0A12] to-[#2A0F1F] text-rose-50 min-h-screen relative overflow-hidden transition-colors duration-500',
    glow1: 'bg-rose-600/25',
    glow2: 'bg-pink-500/20',
    header: 'bg-[#1A0810]/80 border-rose-900/40 text-white backdrop-blur-xl',
  },
  arctic: {
    id: 'arctic',
    name: '🧊 Arctic Frost',
    wrapper: 'bg-gradient-to-br from-[#E8F0FE] via-[#D5E3F7] to-[#C2D6F0] text-slate-800 min-h-screen relative overflow-hidden transition-colors duration-500',
    glow1: 'bg-sky-300/35',
    glow2: 'bg-blue-200/30',
    header: 'bg-white/80 border-sky-200 text-slate-800 backdrop-blur-xl',
  },
  jungle: {
    id: 'jungle',
    name: '🌿 Jungle Noir',
    wrapper: 'bg-gradient-to-br from-[#030D08] via-[#071A0E] to-[#0D2A18] text-green-50 min-h-screen relative overflow-hidden transition-colors duration-500',
    glow1: 'bg-green-600/25',
    glow2: 'bg-lime-500/18',
    header: 'bg-[#051208]/80 border-green-900/40 text-white backdrop-blur-xl',
  },
  nebula: {
    id: 'nebula',
    name: '🔮 Nebula Violet',
    wrapper: 'bg-gradient-to-br from-[#0C0418] via-[#150828] to-[#1E0C3A] text-violet-50 min-h-screen relative overflow-hidden transition-colors duration-500',
    glow1: 'bg-violet-600/30',
    glow2: 'bg-fuchsia-500/22',
    header: 'bg-[#0F0620]/80 border-violet-900/40 text-white backdrop-blur-xl',
  }
}

export default function App() {
  const [bgTheme, setBgTheme] = useState('aurora')
  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [transactions, setTransactions] = useState([])
  const [budget, setBudget] = useState({})
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)

  // form state
  const [form, setForm] = useState({ type: 'expense', category: 'Food', amount: '', date: new Date().toISOString().slice(0, 10), description: '' })
  const [budgetForm, setBudgetForm] = useState({ category: 'Food', limit: '' })

  // AI-powered feature states
  const [aiInsights, setAiInsights] = useState([])
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    { role: 'model', text: 'Hello! I am your FinWise AI Assistant. Ask me anything about your transactions, budgets, or savings!' }
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [affordabilityForm, setAffordabilityForm] = useState({ purchaseName: '', amount: '', monthsToSave: '0' })
  const [affordabilityResult, setAffordabilityResult] = useState(null)
  const [affordabilityLoading, setAffordabilityLoading] = useState(false)
  const [detectedSubs, setDetectedSubs] = useState([])
  const [subsLoading, setSubsLoading] = useState(false)
  const [receiptText, setReceiptText] = useState('')
  const [receiptFileBase64, setReceiptFileBase64] = useState('')
  const [receiptMimeType, setReceiptMimeType] = useState('')
  const [receiptLoading, setReceiptLoading] = useState(false)
  const [showReceiptScanner, setShowReceiptScanner] = useState(false)
  const [receiptScannerData, setReceiptScannerData] = useState(null)
  const [auditReport, setAuditReport] = useState('')
  const [auditLoading, setAuditLoading] = useState(false)
  const [showAuditDialog, setShowAuditDialog] = useState(false)
  const [aiSuggestionSource, setAiSuggestionSource] = useState('') // 'ai' or 'merchant_learning' or ''
  const [aiSuggestingCategory, setAiSuggestingCategory] = useState(false)

  // PDF statement import state
  const [statementFileBase64, setStatementFileBase64] = useState('')
  const [statementMimeType, setStatementMimeType] = useState('')
  const [statementFileName, setStatementFileName] = useState('')
  const [statementLoading, setStatementLoading] = useState(false)
  const [parsedStatements, setParsedStatements] = useState([])
  const [showStatementImport, setShowStatementImport] = useState(false)
  const [importingStatements, setImportingStatements] = useState(false)

// Stat detail popup state
  const [detailStat, setDetailStat] = useState(null)

  // Home dashboard navigation state
  const [activeTab, setActiveTab] = useState('home')
  const [simulatorScenario, setSimulatorScenario] = useState('bike')

  async function loadAll() {
    try {
      const [t, b] = await Promise.all([api('/transactions'), api('/budget')])
      setTransactions(t.transactions || [])
      setBudget(b.budget || {})
    } catch (e) { toast.error(e.message) }
  }

  async function runAnalysis() {
    setLoading(true)
    try {
      const res = await api('/analyze', { method: 'POST' })
      setAnalysis(res)
      toast.success('Analysis updated')
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  const [showAiWelcomePopup, setShowAiWelcomePopup] = useState(false)

  const triggerAiWelcome = () => {
    setShowAiWelcomePopup(true)
  }

  async function checkSession() {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      if (data.authenticated && data.user) {
        setUser(data.user)
        return true
      }
    } catch (err) {
      console.error('Session check failed:', err)
    } finally {
      setCheckingSession(false)
    }
    return false
  }

  useEffect(() => {
    const savedTheme = localStorage.getItem('finwise-bg-theme')
    if (savedTheme && THEME_STYLES[savedTheme]) {
      setBgTheme(savedTheme)
    }
  }, [])

  const changeTheme = (newTheme) => {
    setBgTheme(newTheme)
    localStorage.setItem('finwise-bg-theme', newTheme)
    toast.success(`Background theme updated to ${THEME_STYLES[newTheme].name}`)
  }

  useEffect(() => {
    checkSession().then((isAuthenticated) => {
      if (isAuthenticated) {
        loadAll().then(runAnalysis)
        triggerAiWelcome()
      }
    })
  }, [])

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser)
    setShowAiWelcomePopup(true)
    loadAll().then(runAnalysis)
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      setTransactions([])
      setBudget({})
      setAnalysis(null)
      toast.success('Logged out successfully')
    } catch (e) {
      toast.error('Logout failed')
    }
  }

  async function addTransaction() {
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Enter a valid amount')
    try {
      await api('/transactions', { method: 'POST', body: JSON.stringify({ ...form, amount: Number(form.amount), date: new Date(form.date).toISOString() }) })
      setForm({ ...form, amount: '', description: '' })
      await loadAll()
      await runAnalysis()
      toast.success('Transaction added')
    } catch (e) { toast.error(e.message) }
  }

  async function handleReceiptScannerConfirm(receiptData) {
    try {
      const txData = {
        type: receiptData.type || 'expense',
        category: receiptData.category || 'Other',
        amount: Number(receiptData.amount) || 0,
        date: receiptData.date ? new Date(receiptData.date).toISOString() : new Date().toISOString(),
        description: receiptData.description || receiptData.merchant || 'Receipt Transaction'
      }

      if (!txData.amount || txData.amount <= 0) {
        throw new Error('Invalid amount')
      }

      await api('/transactions', { method: 'POST', body: JSON.stringify(txData) })
      await loadAll()
      await runAnalysis()
      toast.success('Transaction added from receipt!')
    } catch (e) {
      throw e
    }
  }

  async function deleteTransaction(id) {
    try {
      await api(`/transactions/${id}`, { method: 'DELETE' })
      await loadAll(); await runAnalysis()
    } catch (e) { toast.error(e.message) }
  }

  async function changeTransactionCategory(id, newCat) {
    try {
      await api(`/transactions/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ category: newCat })
      })
      toast.success('Category updated & mapping learned!')
      await loadAll()
      await runAnalysis()
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function suggestCategoryForForm(desc) {
    if (!desc || desc.trim().length < 3) return
    setAiSuggestingCategory(true)
    try {
      const res = await api(`/transactions/suggest-category?description=${encodeURIComponent(desc)}&type=${form.type}&amount=${form.amount || '0'}`)
      if (res.category && CATEGORIES.includes(res.category)) {
        setForm(prev => ({ ...prev, category: res.category }))
        setAiSuggestionSource(res.source || 'ai')
      }
    } catch (e) {
      console.error('Category suggestion failed:', e)
    } finally {
      setAiSuggestingCategory(false)
    }
  }

  async function fetchAiInsights() {
    setInsightsLoading(true)
    try {
      const res = await api('/ai-insights', { method: 'POST' })
      setAiInsights(res.insights || [])
      toast.success('AI Insights refreshed')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setInsightsLoading(false)
    }
  }

  async function sendChatMessage() {
    if (!chatInput.trim()) return
    const userMsg = { role: 'user', text: chatInput }
    const updatedMsgs = [...chatMessages, userMsg]
    setChatMessages(updatedMsgs)
    setChatInput('')
    setChatLoading(true)
    try {
      const res = await api('/chat', {
        method: 'POST',
        body: JSON.stringify({ message: chatInput, history: chatMessages })
      })
      setChatMessages([...updatedMsgs, { role: 'model', text: res.reply }])
    } catch (e) {
      toast.error(e.message)
    } finally {
      setChatLoading(false)
    }
  }

  async function checkAffordability() {
    if (!affordabilityForm.purchaseName || !affordabilityForm.amount) {
      return toast.error('Enter purchase name and price')
    }
    setAffordabilityLoading(true)
    try {
      const res = await api('/affordability', {
        method: 'POST',
        body: JSON.stringify({
          purchaseName: affordabilityForm.purchaseName,
          amount: Number(affordabilityForm.amount),
          monthsToSave: Number(affordabilityForm.monthsToSave || 0)
        })
      })
      setAffordabilityResult(res)
      toast.success('Affordability check complete!')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setAffordabilityLoading(false)
    }
  }

  async function runSubscriptionDetection() {
    setSubsLoading(true)
    try {
      const res = await api('/subscriptions/detect', { method: 'POST' })
      setDetectedSubs(res.subscriptions || [])
      toast.success('Subscription scan finished')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSubsLoading(false)
    }
  }

function handleReceiptFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    
    // File size validation - allow up to 5MB
    const MAX_SIZE = 5 * 1024 * 1024 // 5MB
    if (file.size > MAX_SIZE) {
      toast.error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum allowed is 5MB.`)
      e.target.value = ''
      return
    }
    
    setReceiptMimeType(file.type)
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      setReceiptFileBase64(base64)
    }
    reader.readAsDataURL(file)
    toast.info(`Selected receipt: ${file.name}`)
  }

  function handleStatementFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    
    const MAX_SIZE = 5 * 1024 * 1024 // 5MB
    if (file.size > MAX_SIZE) {
      toast.error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum allowed is 5MB.`)
      e.target.value = ''
      return
    }
    
    setStatementMimeType(file.type)
    setStatementFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      setStatementFileBase64(base64)
    }
    reader.readAsDataURL(file)
    toast.info(`Selected statement: ${file.name}`)
  }

  async function handleStatementParse() {
    if (!statementFileBase64) {
      return toast.error('Please upload a PDF or image statement')
    }
    setStatementLoading(true)
    try {
      const res = await api('/statements/parse', {
        method: 'POST',
        body: JSON.stringify({
          fileData: statementFileBase64,
          mimeType: statementMimeType,
          rawText: ''
        })
      })
      setParsedStatements(res.transactions || [])
      if ((res.transactions || []).length === 0) {
        toast.error('No transactions found in the statement. Please try another file.')
      } else {
        toast.success(`Parsed ${res.transactions.length} transactions from the statement!`)
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setStatementLoading(false)
    }
  }

  async function importStatements() {
    if (parsedStatements.length === 0) return
    setImportingStatements(true)
    try {
      let added = 0
      for (const tx of parsedStatements) {
        const amount = Number(tx.amount)
        if (!amount || amount <= 0) continue
        const txObj = {
          type: tx.type === 'income' ? 'income' : 'expense',
          category: CATEGORIES.includes(tx.category) ? tx.category : 'Other',
          amount,
          date: tx.date ? new Date(tx.date).toISOString() : new Date().toISOString(),
          description: tx.description || ''
        }
        await api('/transactions', { method: 'POST', body: JSON.stringify(txObj) })
        added++
      }
      await loadAll()
      await runAnalysis()
      if (added > 0) {
        toast.success(`Imported ${added} transactions successfully!`)
        setParsedStatements([])
        setStatementFileBase64('')
        setStatementFileName('')
        setShowStatementImport(false)
      } else {
        toast.error('No valid transactions to import.')
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setImportingStatements(false)
    }
  }

  async function handleReceiptParse() {
    if (!receiptFileBase64 && !receiptText.trim()) {
      return toast.error('Please upload an image or paste receipt text')
    }
    setReceiptLoading(true)
    try {
      const res = await api('/receipts/parse', {
        method: 'POST',
        body: JSON.stringify({
          fileData: receiptFileBase64,
          mimeType: receiptMimeType,
          rawText: receiptText
        })
      })
      
      setForm({
        type: res.category === 'Salary' || res.category === 'Business' ? 'income' : 'expense',
        category: res.category || 'Other',
        amount: res.amount ? String(res.amount) : '',
        date: res.date ? res.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
        description: res.description || ''
      })
      setAiSuggestionSource('receipt')
      setShowReceiptScanner(false)
      toast.success('Receipt parsed! Form populated.')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setReceiptLoading(false)
    }
  }

  async function generateHealthAudit() {
    setAuditLoading(true)
    setShowAuditDialog(true)
    try {
      const res = await api('/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Perform a comprehensive financial audit. Break down my financial health score. List my top 3 strengths, my top 2 risks, and give me a custom 30-day savings checklist.',
          history: []
        })
      })
      setAuditReport(res.reply)
    } catch (e) {
      setAuditReport(`Failed to generate audit report: ${e.message}`)
    } finally {
      setAuditLoading(false)
    }
  }

  async function saveBudget() {
    if (!budgetForm.category || !budgetForm.limit) return
    const next = { ...budget, [budgetForm.category]: Number(budgetForm.limit) }
    try {
      await api('/budget', { method: 'POST', body: JSON.stringify({ budget: next }) })
      setBudget(next)
      setBudgetForm({ ...budgetForm, limit: '' })
      await runAnalysis()
      toast.success('Budget saved')
    } catch (e) { toast.error(e.message) }
  }

  async function removeBudget(cat) {
    const next = { ...budget }; delete next[cat]
    await api('/budget', { method: 'POST', body: JSON.stringify({ budget: next }) })
    setBudget(next); await runAnalysis()
  }

  async function seedData() {
    setLoading(true)
    try {
      await api('/seed', { method: 'POST' })
      await loadAll(); await runAnalysis()
      toast.success('Sample data loaded')
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  async function clearAll() {
    if (!confirm('Clear all data?')) return
    await api('/clear', { method: 'DELETE' })
    setTransactions([]); setBudget({}); setAnalysis(null)
    toast.success('Cleared')
  }

  const summary = analysis?.summary
  const health = analysis?.healthScore

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#5A4EAB] border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-500 font-sans">Verifying session...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Auth onLoginSuccess={handleLoginSuccess} />
  }

  const currentTheme = THEME_STYLES[bgTheme] || THEME_STYLES.aurora

  return (
    <div className={currentTheme.wrapper}>
      {/* Ambient background glowing color orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full ${currentTheme.glow1} blur-[140px] transition-all duration-1000 animate-pulse`} />
        <div className={`absolute top-1/3 -right-40 h-[700px] w-[700px] rounded-full ${currentTheme.glow2} blur-[160px] transition-all duration-1000`} />
        <div className="absolute bottom-0 left-1/4 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[140px] transition-all duration-1000" />
      </div>

      {/* Header */}
      <header className={`sticky top-0 z-30 border-b ${currentTheme.header}`}>
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white shadow-lg shadow-indigo-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight flex items-center gap-2 text-white">
                FinWise
                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px] py-0 px-2 font-mono">
                  AI PRO
                </Badge>
              </div>
              <div className="text-xs text-slate-400 -mt-0.5">Smart Personal Finance</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Selector Dropdown */}
            <Select value={bgTheme} onValueChange={changeTheme}>
              <SelectTrigger className="w-[145px] h-8 text-xs font-semibold bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 transition-colors">
                <Palette className="h-3.5 w-3.5 mr-1 text-indigo-400" />
                <SelectValue placeholder="Theme" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                <SelectItem value="aurora">✨ Midnight Aurora</SelectItem>
                <SelectItem value="cyber">❇️ Cyber Emerald</SelectItem>
                <SelectItem value="cosmic">🌌 Cosmic Royal</SelectItem>
                <SelectItem value="sunset">🌅 Sunset Gold</SelectItem>
                <SelectItem value="pearl">🌸 Pearl Lavender</SelectItem>
                <SelectItem value="volt">⚡ Volt Neon</SelectItem>
                <SelectItem value="ocean">🌊 Ocean Depths</SelectItem>
                <SelectItem value="rose">🥀 Rose Noir</SelectItem>
                <SelectItem value="arctic">🧊 Arctic Frost</SelectItem>
                <SelectItem value="jungle">🌿 Jungle Noir</SelectItem>
                <SelectItem value="nebula">🔮 Nebula Violet</SelectItem>
              </SelectContent>
            </Select>

            <div className="mr-2 hidden items-center gap-2 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-300 border border-indigo-500/30">
                {user.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="text-left text-xs">
                <p className="font-semibold text-slate-200 leading-none">{user.name}</p>
                <p className="text-[10px] text-slate-400 leading-none mt-0.5">{user.email}</p>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={() => setShowAiWelcomePopup(true)} className="bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20 font-medium">
              <Sparkles className="h-4 w-4 mr-1.5 text-purple-400 animate-pulse" /> AI Overview
            </Button>
            <NotificationsBell />
            <Button variant="outline" size="sm" onClick={seedData} disabled={loading} className="bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800">
              <Database className="h-4 w-4 mr-1.5" /> Load Demo Data
            </Button>
            <Button variant="outline" size="sm" onClick={clearAll} className="bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800">
              <Trash2 className="h-4 w-4 mr-1.5" /> Clear
            </Button>
            <Button size="sm" onClick={runAnalysis} disabled={loading} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md">
              <RefreshCcw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Analyze
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">
              <LogOut className="h-4 w-4 sm:mr-1.5" /> <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Top Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Total Income" value={inr(summary?.totalIncome || 0)} icon={TrendingUp} tone="emerald" onClick={() => setDetailStat('income')} />
          <StatCard title="Total Expense" value={inr(summary?.totalExpense || 0)} icon={TrendingDown} tone="rose" onClick={() => setDetailStat('expense')} />
          <StatCard title="Current Balance" value={inr(summary?.currentBalance || 0)} icon={Wallet} tone="indigo" onClick={() => setDetailStat('balance')} />
          <StatCard title="Savings" value={inr(summary?.savings || 0)} icon={PiggyBank} tone="purple" onClick={() => setDetailStat('savings')} />
          <StatCard title="Savings Rate" value={`${summary?.savingsRate ?? 0}%`} icon={Activity} tone="amber" onClick={() => setDetailStat('savingsRate')} />
        </div>

        {/* Health + Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card
            className="lg:col-span-1 border-0 shadow-md bg-gradient-to-br from-indigo-600 to-purple-700 text-white"
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-white"><Brain className="h-5 w-5 animate-pulse" /> Financial Health Score</CardTitle>
              <CardDescription className="text-indigo-100">Composite score across 6 dimensions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3">
                <div className="text-6xl font-black tracking-tight">{health?.total ?? 0}</div>
                <div className="pb-2 text-sm text-indigo-100">/ 100</div>
                <Badge className="ml-auto bg-white/20 text-white hover:bg-white/30">{health?.grade || '—'}</Badge>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                {health && Object.entries(health.breakdown).map(([k, v]) => {
                  const max = k === 'incomeStability' || k === 'savingsRate' ? 20 : 15
                  return (
                    <div key={k}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="capitalize text-indigo-100">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="font-medium">{v}/{max}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-white" style={{ width: `${(v / max) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <Button onClick={generateHealthAudit} variant="secondary" className="w-full mt-4 bg-white/15 hover:bg-white/25 border-0 text-white flex items-center justify-center gap-1.5 font-semibold text-xs tracking-wide transition-all">
                <Sparkles className="h-3.5 w-3.5" /> Run AI Audit Report
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-0 shadow-md">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-amber-500" /> AI Financial Guidance</CardTitle>
                <CardDescription>Personalized financial guidance powered by Gemini</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={fetchAiInsights} disabled={insightsLoading} className="border-indigo-100 hover:bg-indigo-50/50 hover:border-indigo-200">
                <Sparkles className={`h-4 w-4 mr-1 text-indigo-500 ${insightsLoading ? 'animate-spin' : ''}`} /> 
                {insightsLoading ? 'Analyzing...' : 'Generate AI Insights'}
              </Button>
            </CardHeader>
            <CardContent>
              {insightsLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
                  <span className="text-xs text-muted-foreground">Running AI diagnosis on your accounts...</span>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {(aiInsights.length > 0 ? aiInsights : (analysis?.dashboardInsights || [])).map((ins, i) => {
                    const isAi = aiInsights.length > 0;
                    return (
                      <div key={i} className={`rounded-xl border p-3 flex items-start gap-3 transition-all hover:shadow-sm ${
                        ins.tone === 'warning' ? 'bg-amber-50 border-amber-200' :
                        ins.tone === 'success' ? 'bg-emerald-50 border-emerald-200' :
                        'bg-indigo-50/30 border-indigo-100'
                      }`}>
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                          ins.tone === 'warning' ? 'bg-amber-500/10 text-amber-700' :
                          ins.tone === 'success' ? 'bg-emerald-500/10 text-emerald-700' :
                          'bg-indigo-500/10 text-indigo-700'
                        }`}>
                          {ins.icon === 'trending-up' ? <TrendingUp className="h-4 w-4" /> :
                           ins.icon === 'trending-down' ? <TrendingDown className="h-4 w-4" /> :
                           ins.icon === 'piggy-bank' ? <PiggyBank className="h-4 w-4" /> :
                           ins.icon === 'alert-triangle' ? <AlertTriangle className="h-4 w-4" /> :
                           ins.icon === 'shield-check' ? <ShieldCheck className="h-4 w-4" /> :
                           ins.icon === 'pie-chart' ? <PieIcon className="h-4 w-4" /> :
                           ins.icon === 'activity' ? <Activity className="h-4 w-4" /> :
                           <Sparkles className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            {ins.title || (isAi ? "AI Tip" : "Finance Highlight")}
                            {isAi && <Badge variant="secondary" className="scale-75 origin-left bg-indigo-100 text-indigo-700 font-normal">AI</Badge>}
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">{ins.text}</div>
                        </div>
                      </div>
                    )
                  })}
                  {(!analysis?.dashboardInsights || analysis.dashboardInsights.length === 0) && aiInsights.length === 0 && (
                    <div className="col-span-full text-sm text-muted-foreground py-8 text-center">
                      Add transactions or click "Generate AI Insights" to trigger financial audits.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

<Tabs value={activeTab} onValueChange={setActiveTab} className="flex w-full items-start gap-4">
          <TabsList className="sticky top-4 flex h-auto w-56 shrink-0 flex-col items-stretch justify-start gap-1 rounded-xl bg-slate-100 p-2">
            <TabsTrigger value="home" className="justify-start">Home</TabsTrigger>
            <TabsTrigger value="overview" className="justify-start">Overview</TabsTrigger>
            <TabsTrigger value="transactions" className="justify-start">Transactions</TabsTrigger>
            <TabsTrigger value="budget" className="justify-start">Budget</TabsTrigger>
            <TabsTrigger value="detection" className="justify-start">Detection</TabsTrigger>
            <TabsTrigger value="predictions" className="justify-start">Predictions</TabsTrigger>
            <TabsTrigger value="subscriptions" className="justify-start">Subscriptions</TabsTrigger>
            <TabsTrigger value="reports" className="justify-start">Reports</TabsTrigger>
            <TabsTrigger value="affordability" className="justify-start">Affordability</TabsTrigger>
            <TabsTrigger value="debt-payoff" className="justify-start">Debt Payoff</TabsTrigger>
            <TabsTrigger value="tax-planning" className="justify-start">Tax Planning</TabsTrigger>
            <TabsTrigger value="news-market" className="justify-start">News & Markets</TabsTrigger>
            <TabsTrigger value="simulator" className="justify-start">Life Simulator</TabsTrigger>
            <TabsTrigger value="assistant" className="justify-start">AI Chat</TabsTrigger>
            <TabsTrigger value="advice" className="justify-start">Advice</TabsTrigger>
            <Button type="button" variant="ghost" onClick={() => setShowReceiptScanner(true)} className="justify-start font-normal">
              AI Receipt Scan
            </Button>
          </TabsList>

          <div className="min-w-0 flex-1">

          <TabsContent value="debt-payoff" className="space-y-4">
            <DebtPayoffCalculator />
          </TabsContent>

          <TabsContent value="tax-planning" className="space-y-4">
            <TaxPlanning transactions={transactions} />
          </TabsContent>

          <TabsContent value="news-market" className="space-y-4">
            <NewsAndMarketDashboard transactions={transactions} analysis={analysis} />
          </TabsContent>

          {/* Home - Premium FinWise Dashboard */}
          <TabsContent value="home" className="space-y-4">
            <HomeDashboard
              user={user}
              analysis={analysis}
              transactions={transactions}
              budget={budget}
              setActiveTab={setActiveTab}
              setForm={setForm}
              setSimulatorScenario={setSimulatorScenario}
              onOpenReceiptScanner={() => setShowReceiptScanner(true)}
            />
          </TabsContent>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2 border-0 shadow-md">
                <CardHeader className="pb-2"><CardTitle>Monthly Trend</CardTitle></CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analysis?.spending?.monthlyTrend || []}>
                      <defs>
                        <linearGradient id="gInc" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gExp" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(v) => inr(v)} />
                      <Legend />
                      <Area type="monotone" dataKey="income" stroke="#10b981" fill="url(#gInc)" />
                      <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#gExp)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><PieIcon className="h-4 w-4" /> Category Breakdown</CardTitle></CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analysis?.spending?.categoryBreakdown || []}
                        dataKey="amount" nameKey="category"
                        outerRadius={90} innerRadius={45} paddingAngle={2}
                      >
                        {(analysis?.spending?.categoryBreakdown || []).map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => inr(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MiniStat label="Daily Average" value={inr(analysis?.spending?.dailyAverage || 0)} icon={Activity} />
              <MiniStat label="Weekly Average" value={inr(analysis?.spending?.weeklyAverage || 0)} icon={Activity} />
              <MiniStat label="Highest Category" value={analysis?.spending?.highestCategory ? `${analysis.spending.highestCategory.category} · ${inr(analysis.spending.highestCategory.amount)}` : '—'} icon={Target} />
            </div>
          </TabsContent>

          {/* Transactions */}
          <TabsContent value="transactions" className="space-y-4">
            <Card className="border-0 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2"><PlusCircle className="h-5 w-5" /> Add Transaction</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowStatementImport(!showStatementImport)} className="border-emerald-100 hover:bg-emerald-50/50 text-emerald-700 flex items-center gap-1 text-xs">
                    <Database className="h-4 w-4" /> 
                    {showStatementImport ? 'Hide Statement Import' : 'Import PDF Statement'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowReceiptScanner(!showReceiptScanner)} className="border-indigo-100 hover:bg-indigo-50/50 text-indigo-700 flex items-center gap-1 text-xs">
                    <UploadCloud className="h-4 w-4" /> 
                    {showReceiptScanner ? 'Hide Scanner' : 'AI Receipt Scan'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showStatementImport && (
                  <div className="mb-4 p-4 border border-emerald-100 bg-emerald-50/30 rounded-xl space-y-3">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><Database className="h-4 w-4 text-emerald-600" /> Import Bank Statement (PDF)</h4>
                    <p className="text-xs text-slate-500 leading-normal mt-0.5">Upload a PDF bank statement (or image). Gemini will extract all transactions and show them below for review before importing.</p>
                    <div className="border-2 border-dashed border-emerald-200/60 rounded-xl p-4 bg-white flex flex-col items-center justify-center text-center cursor-pointer hover:border-emerald-400 transition-colors relative">
                      <input type="file" accept="application/pdf,image/*" onChange={handleStatementFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <Database className="h-8 w-8 text-emerald-400 mb-1" />
                      <span className="text-xs font-bold text-slate-700">{statementFileName || 'Upload PDF Statement'}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">PDF, PNG, JPG (up to 5MB)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400">AI will parse every transaction row from the statement.</span>
                      <Button onClick={handleStatementParse} disabled={statementLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-1 h-8">
                        {statementLoading ? (
                          <>
                            <RefreshCcw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            Parsing...
                          </>
                        ) : 'Parse Statement'}
                      </Button>
                    </div>

                    {parsedStatements.length > 0 && (
                      <div className="pt-2 border-t border-emerald-100">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-bold text-slate-700">Parsed Transactions ({parsedStatements.length})</span>
                          <Button onClick={importStatements} disabled={importingStatements} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-1 h-8">
                            {importingStatements ? (
                              <>
                                <RefreshCcw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                Importing...
                              </>
                            ) : 'Import All'}
                          </Button>
                        </div>
                        <ScrollArea className="h-56 border border-slate-100 rounded-lg">
                          <table className="w-full text-xs">
                            <thead className="text-[10px] text-muted-foreground uppercase sticky top-0 bg-slate-50">
                              <tr className="border-b">
                                <th className="text-left py-1.5 px-2">Date</th>
                                <th className="text-left py-1.5 px-2">Description</th>
                                <th className="text-left py-1.5 px-2">Category</th>
                                <th className="text-left py-1.5 px-2">Type</th>
                                <th className="text-right py-1.5 px-2">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {parsedStatements.map((tx, i) => (
                                <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                                  <td className="py-1.5 px-2">{tx.date ? new Date(tx.date).toLocaleDateString('en-IN') : '—'}</td>
                                  <td className="py-1.5 px-2">{tx.description || '—'}</td>
                                  <td className="py-1.5 px-2">
                                    <Badge variant="secondary" className="text-[10px] font-normal">{tx.category || 'Other'}</Badge>
                                  </td>
                                  <td className="py-1.5 px-2">
                                    <Badge className={tx.type === 'income' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] font-normal' : 'bg-rose-100 text-rose-700 hover:bg-rose-100 text-[10px] font-normal'}>
                                      {tx.type || 'expense'}
                                    </Badge>
                                  </td>
                                  <td className={`py-1.5 px-2 text-right font-medium ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {inr(tx.amount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                )}
                {showReceiptScanner && (
                  <div className="mb-4 p-4 border border-indigo-100 bg-indigo-50/30 rounded-xl space-y-3">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-indigo-500" /> AI Receipt Extractor</h4>
                    <p className="text-xs text-slate-500 leading-normal mt-0.5">Upload a receipt image or PDF, or paste raw receipt copy. Gemini will read it, extract details, and pre-fill the transaction form below.</p>
                    <div className="grid md:grid-cols-2 gap-4 pt-2">
                      <div className="border-2 border-dashed border-indigo-200/60 rounded-xl p-4 bg-white flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-400 transition-colors relative">
                        <input type="file" accept="image/*,application/pdf" onChange={handleReceiptFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <UploadCloud className="h-8 w-8 text-indigo-400 mb-1" />
                        <span className="text-xs font-bold text-slate-700">Upload Receipt</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, JPEG, PDF (up to 5MB)</span>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-500 font-semibold">Or Paste Receipt Text</Label>
                        <textarea placeholder="e.g. STARBUCKS #1209 
TOTAL: INR 450.00
DATE: 2026-06-15" value={receiptText} onChange={(e) => setReceiptText(e.target.value)} className="w-full h-[88px] border border-slate-200 text-xs p-2 rounded-xl bg-white resize-none font-mono" />
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button onClick={handleReceiptParse} disabled={receiptLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-1 h-8">
                        {receiptLoading ? (
                          <>
                            <RefreshCcw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            Extracting...
                          </>
                        ) : 'Parse & Auto-Fill Form'}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <Label className="text-xs">Category</Label>
                      {aiSuggestingCategory && <span className="text-[9px] text-indigo-600 animate-pulse font-semibold">Analyzing...</span>}
                      {!aiSuggestingCategory && aiSuggestionSource && (
                        <Badge className="scale-75 origin-right bg-indigo-100 text-indigo-700 font-normal py-0 px-1 border-0">
                          {aiSuggestionSource === 'merchant_learning' ? 'Learned' : aiSuggestionSource === 'receipt' ? 'Receipt' : 'AI'}
                        </Badge>
                      )}
                    </div>
                    <Select value={form.category} onValueChange={(v) => {
                      setForm({ ...form, category: v })
                      setAiSuggestionSource('')
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Amount</Label>
                    <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
                  </div>
                  <div>
                    <Label className="text-xs">Date</Label>
                    <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Description</Label>
                    <Input 
                      value={form.description} 
                      onChange={(e) => setForm({ ...form, description: e.target.value })} 
                      onBlur={(e) => suggestCategoryForForm(e.target.value)}
                      placeholder="e.g. Zomato, Netflix" 
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <Button onClick={addTransaction} className="bg-gradient-to-r from-indigo-600 to-purple-600">Add</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader><CardTitle>All Transactions ({transactions.length})</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground uppercase">
                      <tr className="border-b">
                        <th className="text-left py-2">Date</th>
                        <th className="text-left py-2">Type</th>
                        <th className="text-left py-2">Category</th>
                        <th className="text-left py-2">Description</th>
                        <th className="text-right py-2">Amount</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(t => (
                        <tr key={t.id} className="border-b hover:bg-slate-50">
                          <td className="py-2">{new Date(t.date).toLocaleDateString('en-IN')}</td>
                          <td className="py-2">
                            <Badge variant={t.type === 'income' ? 'default' : 'secondary'} className={t.type === 'income' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-100 text-rose-700 hover:bg-rose-100'}>
                              {t.type}
                            </Badge>
                          </td>
                          <td className="py-2">
                            <select 
                              value={t.category}
                              onChange={(e) => changeTransactionCategory(t.id, e.target.value)}
                              className="bg-slate-50 border border-slate-200 text-xs rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans cursor-pointer hover:bg-slate-100"
                            >
                              {CATEGORIES.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 text-muted-foreground">{t.description || '—'}</td>
                          <td className={`py-2 text-right font-medium ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {t.type === 'income' ? '+' : '−'}{inr(t.amount)}
                          </td>
                          <td className="py-2 text-right">
                            <Button variant="ghost" size="icon" onClick={() => deleteTransaction(t.id)}>
                              <Trash2 className="h-4 w-4 text-slate-400" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {transactions.length === 0 && (
                        <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No transactions yet. Try "Load Demo Data".</td></tr>
                      )}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Budget */}
          <TabsContent value="budget" className="space-y-4">
            <Card className="border-0 shadow-md">
              <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" /> Set Budget Limits</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Category</Label>
                    <Select value={budgetForm.category} onValueChange={(v) => setBudgetForm({ ...budgetForm, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.filter(c => !['Salary', 'Business', 'Investment'].includes(c)).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Monthly Limit</Label>
                    <Input type="number" value={budgetForm.limit} onChange={(e) => setBudgetForm({ ...budgetForm, limit: e.target.value })} placeholder="0" />
                  </div>
                  <div className="flex items-end"><Button onClick={saveBudget}>Save Budget</Button></div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader><CardTitle>Budget vs Actual</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(analysis?.budgetAnalysis || []).map(b => (
                  <div key={b.category}>
                    <div className="flex justify-between text-sm mb-1">
                      <div className="font-medium">{b.category}
                        <span className="ml-2 text-xs text-muted-foreground">{inr(b.spent)} / {inr(b.budget)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={
                          b.status === 'over' ? 'bg-rose-100 text-rose-700 hover:bg-rose-100' :
                          b.status === 'warning' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' :
                          'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                        }>{b.usagePercent}%</Badge>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeBudget(b.category)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <Progress value={Math.min(100, b.usagePercent)} className={
                      b.status === 'over' ? '[&>div]:bg-rose-500' :
                      b.status === 'warning' ? '[&>div]:bg-amber-500' :
                      '[&>div]:bg-emerald-500'
                    } />
                  </div>
                ))}
                {(!analysis?.budgetAnalysis || analysis.budgetAnalysis.length === 0) && (
                  <div className="text-sm text-muted-foreground py-6 text-center">No budgets set. Add one above.</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Detection */}
          <TabsContent value="detection" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <DetectCard title="Large Transactions" icon={Zap} items={analysis?.detection?.largeTransactions} render={(t) => (
                <div className="flex justify-between">
                  <div><div className="font-medium">{t.description || t.category}</div><div className="text-xs text-muted-foreground">{t.category} · {t.date}</div></div>
                  <div className="font-semibold text-rose-600">{inr(t.amount)}</div>
                </div>
              )} />
              <DetectCard title="Duplicate Transactions" icon={Repeat} items={analysis?.detection?.duplicates} render={(d) => (
                <div className="flex justify-between">
                  <div><div className="font-medium">{d.description || d.category}</div><div className="text-xs text-muted-foreground">{d.dates?.join(', ')}</div></div>
                  <div className="font-semibold">{inr(d.amount)}</div>
                </div>
              )} />
              <DetectCard title="Recurring Subscriptions" icon={RefreshCcw} items={analysis?.detection?.recurringSubscriptions} render={(r) => (
                <div className="flex justify-between">
                  <div><div className="font-medium">{r.description}</div><div className="text-xs text-muted-foreground">{r.category} · {r.occurrences} months</div></div>
                  <div className="font-semibold">{inr(r.amount)}</div>
                </div>
              )} />
              <DetectCard title="Unusual Spending" icon={AlertOctagon} items={analysis?.detection?.unusualSpending} render={(u) => (
                <div className="flex justify-between">
                  <div><div className="font-medium">{u.description || u.category}</div><div className="text-xs text-muted-foreground">{u.date}</div></div>
                  <div className="font-semibold text-amber-600">{inr(u.amount)}</div>
                </div>
              )} />
            </div>

            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Sudden Spending Spike</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <MiniStat label="Last 7 Days" value={inr(analysis?.detection?.spendingSpike?.last7Days || 0)} />
                  <MiniStat label="Previous 7 Days" value={inr(analysis?.detection?.spendingSpike?.previous7Days || 0)} />
                  <MiniStat label="Change" value={`${analysis?.detection?.spendingSpike?.changePercent ?? 0}%`}
                    tone={analysis?.detection?.spendingSpike?.detected ? 'warn' : 'ok'} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Predictions */}
          <TabsContent value="predictions" className="space-y-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MiniStat label="End of Month Balance" value={inr(analysis?.predictions?.endOfMonthBalance || 0)} icon={Wallet} />
              <MiniStat label="Expected Monthly Expense" value={inr(analysis?.predictions?.expectedMonthlyExpense || 0)} icon={TrendingDown} />
              <MiniStat label="Expected Monthly Income" value={inr(analysis?.predictions?.expectedMonthlyIncome || 0)} icon={TrendingUp} />
              <MiniStat label="Expected Savings" value={inr(analysis?.predictions?.expectedSavings || 0)} icon={PiggyBank} />
            </div>

            <Card className="border-0 shadow-md">
              <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /> Risks Detected</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(analysis?.risks || []).map((r, i) => (
                  <div key={i} className={`rounded-lg border p-3 flex items-start gap-3 ${
                    r.severity === 'high' ? 'bg-rose-50 border-rose-200' :
                    r.severity === 'medium' ? 'bg-amber-50 border-amber-200' :
                    'bg-slate-50 border-slate-200'
                  }`}>
                    <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                      r.severity === 'high' ? 'text-rose-600' :
                      r.severity === 'medium' ? 'text-amber-600' : 'text-slate-500'
                    }`} />
                    <div>
                      <div className="font-medium text-sm">{r.type}</div>
                      <div className="text-sm text-muted-foreground">{r.message}</div>
                    </div>
                    <Badge variant="outline" className="ml-auto text-xs">{r.severity}</Badge>
                  </div>
                ))}
                {(!analysis?.risks || analysis.risks.length === 0) && (
                  <div className="flex items-center gap-2 text-emerald-600 text-sm">
                    <ShieldCheck className="h-4 w-4" /> No significant risks detected.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advice */}
          <TabsContent value="advice" className="space-y-4">
            <Card className="border-0 shadow-md">
              <CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-amber-500" /> Personalized Recommendations</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(analysis?.recommendations || []).map((r, i) => (
                  <div key={i} className="rounded-xl border bg-gradient-to-br from-white to-indigo-50/40 p-4">
                    <div className="font-semibold text-slate-900">{r.title}</div>
                    <div className="text-sm text-muted-foreground mt-1">{r.detail}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          {/* Subscriptions Detection */}
          <TabsContent value="subscriptions" className="space-y-4">
            <Card className="border-0 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2"><Repeat className="h-5 w-5 text-indigo-500" /> Subscription Detector</CardTitle>
                  <CardDescription>AI scan of recurring expenses, SaaS products, utilities, and memberships</CardDescription>
                </div>
                <Button size="sm" onClick={runSubscriptionDetection} disabled={subsLoading}>
                  <RefreshCcw className={`h-4 w-4 mr-1.5 ${subsLoading ? 'animate-spin' : ''}`} /> Scan Subscriptions
                </Button>
              </CardHeader>
              <CardContent>
                {subsLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                    <p className="text-sm text-slate-500">Checking expense frequencies and vendor patterns...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {detectedSubs.length > 0 && (
                      <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex justify-between items-center">
                        <div className="text-sm font-medium text-slate-700">Total Monthly Subscription Commitment:</div>
                        <div className="text-xl font-bold text-indigo-600">
                          {inr(detectedSubs.reduce((acc, curr) => acc + (curr.frequency === 'Yearly' ? curr.amount / 12 : curr.amount), 0))} / month
                        </div>
                      </div>
                    )}

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {detectedSubs.map((sub, i) => (
                        <Card key={i} className="border border-slate-100 hover:shadow-md transition-shadow">
                          <CardContent className="p-4 flex flex-col justify-between h-full">
                            <div>
                              <div className="flex justify-between items-start">
                                <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 text-[10px] font-normal">{sub.category}</Badge>
                                <Badge className={
                                  sub.confidence === 'high' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] font-normal' :
                                  sub.confidence === 'medium' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px] font-normal' :
                                  'bg-slate-100 text-slate-700 hover:bg-slate-100 text-[10px] font-normal'
                                }>{sub.confidence} confidence</Badge>
                              </div>
                              <h4 className="font-bold text-slate-800 mt-2 text-base">{sub.description}</h4>
                              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{sub.reason}</p>
                            </div>
                            <div className="mt-4 pt-3 border-t flex justify-between items-end">
                              <div>
                                <div className="text-[10px] text-slate-400 uppercase font-semibold">Billing Frequency</div>
                                <div className="text-xs font-semibold text-slate-600">{sub.frequency} · Next: {new Date(sub.nextBillingDate).toLocaleDateString('en-IN')}</div>
                              </div>
                              <div className="text-lg font-black text-slate-800">{inr(sub.amount)}</div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {detectedSubs.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                        <Activity className="h-10 w-10 text-slate-300 animate-pulse" />
                        <div className="text-sm font-semibold">No subscriptions cached yet.</div>
                        <Button variant="outline" size="sm" onClick={runSubscriptionDetection}>
                          Run AI Subscription Check
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Reports */}
          <TabsContent value="reports" className="space-y-4">
            <ReportsPanel />
          </TabsContent>

          {/* Affordability Checker */}
          <TabsContent value="affordability" className="space-y-4">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-indigo-500" /> AI Purchase Affordability Checker</CardTitle>
                <CardDescription>Determine if a major purchase is safe, tight, or risky based on balance projections, saving habits, and emergency buffers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 p-4 border border-slate-100 rounded-xl">
                  <div>
                    <Label className="text-xs font-semibold text-slate-600">Purchase Name</Label>
                    <Input placeholder="e.g. MacBook Pro, Bali Trip" value={affordabilityForm.purchaseName} onChange={(e) => setAffordabilityForm({...affordabilityForm, purchaseName: e.target.value})} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-600">Amount (₹)</Label>
                    <Input type="number" placeholder="e.g. 150000" value={affordabilityForm.amount} onChange={(e) => setAffordabilityForm({...affordabilityForm, amount: e.target.value})} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-600">Months to Save (Timeline)</Label>
                    <Select value={affordabilityForm.monthsToSave} onValueChange={(v) => setAffordabilityForm({...affordabilityForm, monthsToSave: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select months" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Immediate Purchase (0 months)</SelectItem>
                        <SelectItem value="1">1 Month</SelectItem>
                        <SelectItem value="3">3 Months</SelectItem>
                        <SelectItem value="6">6 Months</SelectItem>
                        <SelectItem value="12">12 Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-full flex justify-end">
                    <Button onClick={checkAffordability} disabled={affordabilityLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5">
                      {affordabilityLoading && <RefreshCcw className="h-4 w-4 animate-spin" />}
                      Check Purchase Affordability
                    </Button>
                  </div>
                </div>

                {affordabilityLoading && (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                    <p className="text-sm text-slate-500">Projecting cash flow and auditing emergency savings buffers...</p>
                  </div>
                )}

                {affordabilityResult && !affordabilityLoading && (
                  <div className="space-y-4 mt-6">
                    <div className="grid md:grid-cols-3 gap-4">
                      <Card className="border border-slate-100 md:col-span-1 p-4 flex flex-col justify-between bg-gradient-to-br from-white to-slate-50/50">
                        <div>
                          <div className="text-xs uppercase text-slate-400 font-semibold tracking-wider">Verdict Status</div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`h-3 w-3 rounded-full ${
                              affordabilityResult.status === 'Highly Affordable' ? 'bg-emerald-500' :
                              affordabilityResult.status === 'Affordable' ? 'bg-teal-500' :
                              affordabilityResult.status === 'Tight' ? 'bg-amber-500' : 'bg-rose-500'
                            }`} />
                            <h3 className="text-xl font-bold text-slate-800">{affordabilityResult.status}</h3>
                          </div>
                        </div>
                        <div className="mt-8">
                          <div className="text-xs uppercase text-slate-400 font-semibold tracking-wider mb-2">Fund Allocation</div>
                          <Progress value={Math.min(100, affordabilityResult.percentageOfSavings)} className={
                            affordabilityResult.status === 'Highly Affordable' ? '[&>div]:bg-emerald-500' :
                            affordabilityResult.status === 'Affordable' ? '[&>div]:bg-teal-500' :
                            affordabilityResult.status === 'Tight' ? '[&>div]:bg-amber-500' : '[&>div]:bg-rose-500'
                          } />
                          <div className="text-xs text-slate-500 mt-1 flex justify-between font-semibold">
                            <span>Consumes pool</span>
                            <span>{affordabilityResult.percentageOfSavings}%</span>
                          </div>
                        </div>
                      </Card>

                      <Card className="border border-slate-100 md:col-span-2 p-4 bg-indigo-50/10 flex flex-col justify-between">
                        <div>
                          <div className="text-xs uppercase text-slate-400 font-semibold tracking-wider">AI Impact Analysis</div>
                          <p className="text-slate-800 font-bold text-base mt-2 leading-relaxed">{affordabilityResult.verdict}</p>
                          <p className="text-slate-600 text-sm mt-2 leading-relaxed">{affordabilityResult.analysis}</p>
                        </div>
                        <div className="mt-6 pt-3 border-t border-slate-100">
                          <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide flex items-center gap-1"><Sparkle className="h-3 w-3 text-indigo-500" /> AI Action Checklist</h4>
                          <ul className="text-xs space-y-1.5 text-slate-600">
                            {affordabilityResult.actionSteps?.map((step, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <CheckCircle className="h-3.5 w-3.5 mt-0.5 text-emerald-500 shrink-0" />
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </Card>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

{/* Life Simulator */}
          <TabsContent value="simulator" className="space-y-4">
            <LifeSimulator api={api} analysis={analysis} transactions={transactions} budget={budget} user={user} defaultScenario={simulatorScenario} />
          </TabsContent>

          {/* AI Assistant Chat */}
          <TabsContent value="assistant" className="space-y-4">
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-indigo-500 animate-bounce" /> Conversational Financial Advisor</CardTitle>
                <CardDescription>Chat about your budgets, savings rate, duplicate payments, or general financial advice</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <ScrollArea className="h-96 border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                  <div className="space-y-4">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm whitespace-pre-wrap ${
                          msg.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-white border border-slate-100 text-slate-800 rounded-bl-none leading-relaxed'
                        }`}>
                          <div className="text-[9px] opacity-60 font-semibold mb-1 uppercase tracking-wider">
                            {msg.role === 'user' ? 'You' : 'FinWise AI'}
                          </div>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-slate-100 text-slate-800 rounded-2xl rounded-bl-none px-4 py-3 text-sm shadow-sm">
                          <div className="text-[9px] opacity-60 font-semibold mb-1 uppercase tracking-wider">FinWise AI</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#5A4EAB] animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-[#5A4EAB] animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-[#5A4EAB] animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div>
                  <Label className="text-xs font-semibold text-slate-500">Quick Questions:</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {[
                      "Am I spending too much on groceries?",
                      "Do I have any recurring subscriptions?",
                      "What is my savings rate?",
                      "Summarize my budget compliance this month"
                    ].map((q, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        disabled={chatLoading}
                        onClick={() => {
                          setChatInput(q);
                        }}
                        className="text-[11px] h-7 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-full py-1 px-3"
                      >
                        {q}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Ask about your financial status... (e.g. How much did I spend on Food?)"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !chatLoading) sendChatMessage()
                    }}
                    disabled={chatLoading}
                    className="bg-white border-slate-200"
                  />
                  <Button onClick={sendChatMessage} disabled={chatLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                    Send
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          </div>
        </Tabs>

        {/* Dialog for AI Health Audit */}
        <Dialog open={showAuditDialog} onOpenChange={setShowAuditDialog}>
          <DialogContent className="max-w-2xl bg-white border border-slate-200 shadow-2xl rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-800">
                <Brain className="h-6 w-6 text-indigo-600 animate-pulse" /> AI Financial Audit Report
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Personalized audit of your spending, saving patterns, and budget compliance.
              </DialogDescription>
            </DialogHeader>
            <Separator className="my-2" />
            <ScrollArea className="h-[400px] pr-4 mt-2">
              {auditLoading ? (
                <div className="flex flex-col items-center justify-center h-[300px] gap-4">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#5A4EAB] border-t-transparent"></div>
                  <div className="text-sm font-medium text-slate-500 font-sans">Analyzing your transactions, savings rates, and budget structures...</div>
                </div>
              ) : (
                <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                  {auditReport}
                </div>
              )}
            </ScrollArea>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
              <Button onClick={() => setShowAuditDialog(false)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm">
                Close Report
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* AI Welcome Showcase Popup Dialog */}
        <Dialog open={showAiWelcomePopup} onOpenChange={setShowAiWelcomePopup}>
          <DialogContent className="max-w-xl bg-slate-900 border border-indigo-500/30 text-white shadow-2xl rounded-3xl p-0 overflow-hidden sm:max-w-xl">
            <DialogTitle className="sr-only">AI Finance Management System</DialogTitle>
            <DialogDescription className="sr-only">
              Welcome modal introducing the AI-powered financial command center.
            </DialogDescription>
            <div className="relative w-full h-56 overflow-hidden bg-gradient-to-b from-indigo-950 to-slate-900">
              <img
                src="/images/ai_finance_popup.png"
                alt="AI Finance Management System"
                className="w-full h-full object-cover object-center opacity-90 transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
              <div className="absolute top-4 left-4">
                <Badge className="bg-indigo-600/90 backdrop-blur-md text-white border border-indigo-400/30 px-3 py-1 text-xs font-semibold tracking-wide shadow-lg flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-yellow-300 animate-spin" /> Next-Gen AI Engine
                </Badge>
              </div>
            </div>

            <div className="p-6 pt-2 space-y-4">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
                  AI Finance Management System
                </h2>
                <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                  Welcome to your AI-powered financial command center. Track spending in real-time, get autonomous budget insights, and scan bills & statements effortlessly.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 hover:border-indigo-500/40 transition-colors">
                  <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 mt-0.5">
                    <Brain className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">Autonomous Insights</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Real-time health score & anomaly alerts</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 hover:border-purple-500/40 transition-colors">
                  <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 mt-0.5">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">Smart Bill Scanner</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Scan receipts & PDF bank statements</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 hover:border-emerald-500/40 transition-colors">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 mt-0.5">
                    <Target className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">Affordability Checker</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Simulate major purchases & savings goals</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 hover:border-amber-500/40 transition-colors">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 mt-0.5">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">Private & Secure</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Stored in your isolated MongoDB database</div>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                <Button
                  onClick={() => setShowAiWelcomePopup(false)}
                  className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-200"
                >
                  Explore AI Dashboard <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
 
        {/* Stat Detail Popup Dialog */}
        <StatDetailDialog
          open={!!detailStat}
          onOpenChange={(o) => { if (!o) setDetailStat(null) }}
          stat={detailStat}
          summary={summary}
          spending={analysis?.spending}
          predictions={analysis?.predictions}
          health={health}
          transactions={transactions}
          budgetAnalysis={analysis?.budgetAnalysis || []}
        />

        {/* Receipt Scanner Dialog */}
        <ReceiptScanner
          open={showReceiptScanner}
          onOpenChange={setShowReceiptScanner}
          onConfirm={handleReceiptScannerConfirm}
          api={api}
        />

        <footer className="pt-8 pb-6 text-center text-xs text-muted-foreground">
          FinWise · Deterministic financial analysis engine · All data stays in your database.
        </footer>
      </main>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, tone = 'indigo', onClick }) {
  const toneClass = {
    emerald: 'from-emerald-500 to-teal-600',
    rose: 'from-rose-500 to-pink-600',
    indigo: 'from-indigo-500 to-blue-600',
    purple: 'from-purple-500 to-fuchsia-600',
    amber: 'from-amber-500 to-orange-600',
  }[tone]
  return (
    <Card className={`border-0 shadow-md overflow-hidden relative cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${onClick ? '' : 'cursor-default'}`} onClick={onClick}>
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${toneClass} opacity-20`} />
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="h-4 w-4" /> {title}
        </div>
        <div className="text-2xl font-bold mt-1 tracking-tight">{value}</div>
        {onClick && (
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground/50">
            Click for details
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatDetailDialog({ open, onOpenChange, stat, summary, spending, predictions, health, transactions, budgetAnalysis }) {
  const s = summary || {}
  const incomeTx = (transactions || []).filter(t => t.type === 'income')
  const expenseTx = (transactions || []).filter(t => t.type === 'expense')

  // Income by category
  const incomeCatMap = {}
  for (const t of incomeTx) incomeCatMap[t.category] = (incomeCatMap[t.category] || 0) + Number(t.amount)
  const incomeByCat = Object.entries(incomeCatMap)
    .map(([category, amount]) => ({ category, amount: round(amount) }))
    .sort((a, b) => b.amount - a.amount)

  // Expense by category (from spending.categoryBreakdown)
  const expenseByCat = (spending?.categoryBreakdown || [])

  // Monthly savings rate trend
  const monthlyTrend = spending?.monthlyTrend || []
  const monthlyRate = monthlyTrend.map(m => ({
    month: m.month,
    rate: m.income > 0 ? round((m.savings / m.income) * 100, 1) : 0,
  }))

  // Emergency fund months covered = balance / avg monthly expense
  const avgMonthlyExpense = monthlyTrend.length
    ? mean(monthlyTrend.map(m => m.expense))
    : (s.totalExpense || 0) / Math.max(1, monthlyTrend.length || 1)
  const monthsCovered = avgMonthlyExpense > 0 ? round((s.currentBalance || 0) / avgMonthlyExpense, 1) : 0

  // Helper rows
  const Row = ({ label, value, strong }) => (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm ${strong ? 'font-bold text-slate-800' : 'font-semibold text-slate-700'}`}>{value}</span>
    </div>
  )

  const Divider = () => <div className="my-1 h-px bg-slate-100" />

  const renderBody = () => {
    switch (stat) {
      case 'income':
        return (
          <>
            <Row label="Total Income" value={inr(s.totalIncome)} strong />
            <Row label="Income Transactions" value={incomeTx.length} />
            <Divider />
            {incomeByCat.length > 0 ? (
              incomeByCat.map((c) => (
                <Row key={c.category} label={c.category} value={inr(c.amount)} />
              ))
            ) : (
              <div className="py-2 text-xs text-slate-400 text-center">No income recorded yet.</div>
            )}
            <Divider />
            <Row label="Monthly Avg Income" value={monthlyTrend.length ? inr(round(mean(monthlyTrend.map(m => m.income)))) : inr(0)} />
            <Row label="Expected Monthly Income" value={inr(predictions?.expectedMonthlyIncome)} />
          </>
        )
      case 'expense':
        return (
          <>
            <Row label="Total Expense" value={inr(s.totalExpense)} strong />
            <Row label="Expense Transactions" value={expenseTx.length} />
            <Divider />
            {expenseByCat.length > 0 ? (
              expenseByCat.slice(0, 8).map((c) => (
                <Row key={c.category} label={c.category} value={inr(c.amount)} />
              ))
            ) : (
              <div className="py-2 text-xs text-slate-400 text-center">No expenses recorded yet.</div>
            )}
            <Divider />
            <Row label="Daily Average" value={inr(spending?.dailyAverage)} />
            <Row label="Weekly Average" value={inr(spending?.weeklyAverage)} />
            <Row label="Expected Monthly Expense" value={inr(predictions?.expectedMonthlyExpense)} />
          </>
        )
      case 'balance':
        return (
          <>
            <Row label="Total Income" value={inr(s.totalIncome)} />
            <Row label="Total Expense" value={inr(s.totalExpense)} />
            <Divider />
            <Row label="Current Balance" value={inr(s.currentBalance)} strong />
            <Divider />
            <Row label="Projected End-of-Month Balance" value={inr(predictions?.endOfMonthBalance)} />
            <Row label="Emergency Fund Months Covered" value={monthsCovered} />
          </>
        )
      case 'savings':
        return (
          <>
            <Row label="Total Savings" value={inr(s.savings)} strong />
            <Row label="Savings Rate" value={`${s.savingsRate ?? 0}%`} />
            <Divider />
            <Row label="Expected Savings (This Month)" value={inr(predictions?.expectedSavings)} />
            <Divider />
            <div className="py-1.5">
              <div className="text-xs text-slate-500 mb-1.5 font-medium">Monthly Savings Trend</div>
              {monthlyRate.length > 0 ? (
                <div className="space-y-1">
                  {monthlyRate.slice(-5).map((m) => (
                    <Row key={m.month} label={m.month} value={`${m.rate}%`} />
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 text-center py-1">No monthly data yet.</div>
              )}
            </div>
          </>
        )
      case 'savingsRate':
        return (
          <>
            <Row label="Savings Rate" value={`${s.savingsRate ?? 0}%`} strong />
            <Divider />
            <div className="py-1.5">
              <div className="text-xs text-slate-500 mb-1.5 font-medium">Benchmark</div>
              <div className="space-y-1">
                <Row label="≥ 30% — Excellent" value="✓" />
                <Row label="20 – 30% — Good" value="✓" />
                <Row label="10 – 20% — Fair" value="✓" />
                <Row label="Below 10% — Needs work" value="✓" />
              </div>
            </div>
            <Divider />
            <Row label="Expected Monthly Savings" value={inr(predictions?.expectedSavings)} />
          </>
        )
      default:
        return null
    }
  }

  const titleMap = {
    income: 'Total Income',
    expense: 'Total Expense',
    balance: 'Current Balance',
    savings: 'Savings',
    savingsRate: 'Savings Rate',
  }

  const iconMap = {
    income: TrendingUp,
    expense: TrendingDown,
    balance: Wallet,
    savings: PiggyBank,
    savingsRate: Activity,
  }

  const toneMap = {
    income: 'from-emerald-500 to-teal-600',
    expense: 'from-rose-500 to-pink-600',
    balance: 'from-indigo-500 to-blue-600',
    savings: 'from-purple-500 to-fuchsia-600',
    savingsRate: 'from-amber-500 to-orange-600',
  }

  const Icon = iconMap[stat] || Wallet

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${toneMap[stat] || toneMap.balance} text-white shadow-lg shrink-0`}>
              <Icon className="h-5 w-5" />
            </div>
            <DialogTitle className="text-lg font-bold tracking-tight text-slate-800">
              {titleMap[stat] || 'Details'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-400 pt-1">
            Quick breakdown of your {titleMap[stat] || ''} metric.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-3">{renderBody()}</div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button onClick={() => onOpenChange(false)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MiniStat({ label, value, icon: Icon, tone }) {
  const toneCls = tone === 'warn' ? 'text-amber-600' : tone === 'ok' ? 'text-emerald-600' : 'text-slate-900'
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{Icon ? <Icon className="h-4 w-4" /> : null} {label}</div>
        <div className={`text-xl font-bold mt-1 ${toneCls}`}>{value}</div>
      </CardContent>
    </Card>
  )
}

function DetectCard({ title, icon: Icon, items, render }) {
  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Icon className="h-4 w-4" /> {title} <Badge variant="secondary" className="ml-auto">{items?.length || 0}</Badge></CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-56 overflow-auto">
          {(items || []).slice(0, 20).map((it, i) => (
            <div key={i} className="text-sm border-b last:border-0 pb-2">{render(it)}</div>
          ))}
          {(!items || items.length === 0) && (
            <div className="text-xs text-muted-foreground py-4 text-center">None detected.</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
