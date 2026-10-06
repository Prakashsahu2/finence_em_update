'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Camera,
  Upload,
  FileText,
  CheckCircle,
  Edit3,
  X,
  Loader2,
  AlertCircle,
  Receipt,
  Store,
  Calendar,
  Clock,
  CreditCard,
  Tag,
  Package,
  Eye,
  RotateCcw,
} from 'lucide-react'

const CATEGORIES = ['Food', 'Shopping', 'Travel', 'Bills', 'Entertainment', 'Education', 'Medical', 'Other']

function inr(n) {
  if (n === undefined || n === null || isNaN(n)) return '₹0'
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  try {
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  } catch {
    return timeStr
  }
}

export default function ReceiptScanner({
  open,
  onOpenChange,
  onConfirm,
  api,
  processing: externalProcessing = false
}) {
  const [step, setStep] = useState('upload') // upload, processing, review, success
  const [uploadMethod, setUploadMethod] = useState(null) // 'file', 'camera'
  const [filePreview, setFilePreview] = useState(null)
  const [extractedData, setExtractedData] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState(null)
  const [error, setError] = useState(null)
  const [incompleteFields, setIncompleteFields] = useState([])

  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  const resetState = () => {
    setStep('upload')
    setUploadMethod(null)
    setFilePreview(null)
    setExtractedData(null)
    setIsEditing(false)
    setEditedData(null)
    setError(null)
    setIncompleteFields([])
  }

  useEffect(() => {
    if (!open) {
      resetState()
    }
  }, [open])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a JPG, PNG, JPEG, or PDF file')
      return
    }

    const MAX_SIZE = 5 * 1024 * 1024 // 5MB
    if (file.size > MAX_SIZE) {
      toast.error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 5MB.`)
      return
    }

    setUploadMethod('file')
    setError(null)

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => {
        setFilePreview({
          type: 'image',
          url: reader.result,
          name: file.name
        })
      }
      reader.readAsDataURL(file)
    } else {
      setFilePreview({
        type: 'pdf',
        name: file.name
      })
    }

    processFile(file)
  }

  const processFile = async (file) => {
    setStep('processing')
    setIsProcessing(true)
    setError(null)

    try {
      // Convert file to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result.split(',')[1]
          resolve(result)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Call API to parse receipt
      const response = await api('/receipts/parse', {
        method: 'POST',
        body: JSON.stringify({
          fileData: base64,
          mimeType: file.type,
          rawText: ''
        })
      })

      // Process extracted data
      const data = {
        merchant: response.merchant || response.description || '',
        amount: response.amount || 0,
        date: response.date || new Date().toISOString().slice(0, 10),
        time: response.time || '',
        items: response.items || [],
        category: response.category || 'Other',
        paymentMethod: response.paymentMethod || '',
        rawText: response.rawText || ''
      }

      // Check for incomplete fields
      const incomplete = []
      if (!data.merchant) incomplete.push('merchant')
      if (!data.amount || data.amount === 0) incomplete.push('amount')
      if (!data.date) incomplete.push('date')
      if (!data.category || data.category === 'Other') incomplete.push('category')

      setExtractedData(data)
      setEditedData({ ...data })
      setIncompleteFields(incomplete)
      setStep('review')

      if (incomplete.length > 0) {
        toast.warning('Some information could not be detected. Please review before saving.')
      }
    } catch (err) {
      console.error('Receipt processing error:', err)
      setError(err.message || 'Failed to process receipt. Please try again.')
      setStep('upload')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfirm = async () => {
    if (!editedData) return

    const dataToSave = isEditing ? editedData : extractedData

    // Validate required fields
    if (!dataToSave.amount || dataToSave.amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setIsProcessing(true)
    try {
      await onConfirm({
        type: 'expense',
        category: dataToSave.category,
        amount: Number(dataToSave.amount),
        date: dataToSave.date,
        description: dataToSave.merchant,
        items: dataToSave.items,
        time: dataToSave.time,
        paymentMethod: dataToSave.paymentMethod
      })

      setStep('success')
      setTimeout(() => {
        onOpenChange(false)
      }, 1500)
    } catch (err) {
      toast.error(err.message || 'Failed to save transaction')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleEditChange = (field, value) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 mb-2">
          <Receipt className="h-8 w-8 text-purple-300" />
        </div>
        <h3 className="text-lg font-bold text-white">Scan Receipt</h3>
        <p className="text-sm text-slate-400">
          Upload a receipt image or take a photo to extract transaction details
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Upload File Option */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="group relative flex flex-col items-center justify-center p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-purple-500/40 transition-all duration-300"
        >
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Upload className="h-7 w-7 text-indigo-300" />
          </div>
          <span className="font-semibold text-white">Upload Receipt</span>
          <span className="text-xs text-slate-400 mt-1">JPG, PNG, JPEG, PDF</span>
          <span className="text-[10px] text-slate-500 mt-0.5">Max 5MB</span>
        </button>

        {/* Camera Option */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="group relative flex flex-col items-center justify-center p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-cyan-500/40 transition-all duration-300"
        >
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Camera className="h-7 w-7 text-cyan-300" />
          </div>
          <span className="font-semibold text-white">Take Photo</span>
          <span className="text-xs text-slate-400 mt-1">Use device camera</span>
          <span className="text-[10px] text-slate-500 mt-0.5">Real-time capture</span>
        </button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,application/pdf"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
        <Eye className="h-3.5 w-3.5" />
        <span>AI will extract: merchant, amount, date, items & category</span>
      </div>
    </div>
  )

  const renderProcessingStep = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="relative">
        <div className="w-24 h-24 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Receipt className="h-10 w-10 text-purple-300 animate-pulse" />
        </div>
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-lg font-bold text-white">Analyzing Receipt</h3>
        <p className="text-sm text-slate-400">AI is extracting transaction details...</p>
      </div>

      <div className="flex flex-col items-center gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Detecting merchant name...</span>
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ animationDelay: '100ms' }} />
          <span>Extracting amount & items...</span>
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ animationDelay: '200ms' }} />
          <span>Categorizing expense...</span>
        </div>
      </div>
    </div>
  )

  const renderReviewStep = () => {
    const data = isEditing ? editedData : extractedData
    if (!data) return null

    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-white">Receipt Detected</h3>
              <p className="text-xs text-slate-400">Review extracted information</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className={`text-xs ${isEditing ? 'bg-purple-500/20 text-purple-300' : 'text-slate-400 hover:text-white'}`}
          >
            <Edit3 className="h-3.5 w-3.5 mr-1" />
            {isEditing ? 'Editing' : 'Edit'}
          </Button>
        </div>

        {/* Incomplete Fields Warning */}
        {incompleteFields.length > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-amber-300 font-medium">Some information could not be detected</p>
              <p className="text-amber-200/70 text-xs mt-1">
                Missing: {incompleteFields.join(', ')}. Please edit before saving.
              </p>
            </div>
          </div>
        )}

        {/* Extracted Data Display */}
        <div className="space-y-3">
          {/* Merchant */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
            <Store className="h-4 w-4 text-slate-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-500">Merchant</div>
              {isEditing ? (
                <Input
                  value={data.merchant}
                  onChange={(e) => handleEditChange('merchant', e.target.value)}
                  className="h-7 text-sm bg-white/5 border-white/10 text-white mt-1"
                  placeholder="Enter merchant name"
                />
              ) : (
                <div className="text-sm font-medium text-white truncate">{data.merchant || '—'}</div>
              )}
            </div>
          </div>

          {/* Amount & Category Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <CreditCard className="h-4 w-4 text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500">Amount</div>
                {isEditing ? (
                  <Input
                    type="number"
                    value={data.amount}
                    onChange={(e) => handleEditChange('amount', e.target.value)}
                    className="h-7 text-sm bg-white/5 border-white/10 text-white mt-1"
                    placeholder="0"
                  />
                ) : (
                  <div className="text-lg font-bold text-emerald-400">{inr(data.amount)}</div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <Tag className="h-4 w-4 text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500">Category</div>
                {isEditing ? (
                  <Select value={data.category} onValueChange={(v) => handleEditChange('category', v)}>
                    <SelectTrigger className="h-7 text-sm bg-white/5 border-white/10 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 mt-1">
                    {data.category}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500">Date</div>
                {isEditing ? (
                  <Input
                    type="date"
                    value={data.date}
                    onChange={(e) => handleEditChange('date', e.target.value)}
                    className="h-7 text-sm bg-white/5 border-white/10 text-white mt-1"
                  />
                ) : (
                  <div className="text-sm font-medium text-white">{formatDate(data.date)}</div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <Clock className="h-4 w-4 text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500">Time</div>
                {isEditing ? (
                  <Input
                    type="time"
                    value={data.time || ''}
                    onChange={(e) => handleEditChange('time', e.target.value)}
                    className="h-7 text-sm bg-white/5 border-white/10 text-white mt-1"
                    placeholder="--:--"
                  />
                ) : (
                  <div className="text-sm font-medium text-white">
                    {data.time ? formatTime(data.time) : '—'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items (if available) */}
          {data.items && data.items.length > 0 && (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-slate-400" />
                <span className="text-xs text-slate-500">Items ({data.items.length})</span>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {data.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 truncate flex-1">{item.name || item.description}</span>
                    <span className="text-slate-400 ml-2">{item.quantity ? `×${item.quantity}` : ''}</span>
                    {item.price && <span className="text-white ml-2">{inr(item.price)}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Method */}
          {data.paymentMethod && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <CreditCard className="h-4 w-4 text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500">Payment Method</div>
                <div className="text-sm text-white">{data.paymentMethod}</div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => {
              resetState()
            }}
            className="flex-1 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Rescan
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm & Save
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  const renderSuccessStep = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center animate-pulse">
        <CheckCircle className="h-10 w-10 text-emerald-400" />
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-white">Transaction Saved!</h3>
        <p className="text-sm text-slate-400">Your receipt has been added to your transactions</p>
      </div>

      {extractedData && (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="text-center">
            <div className="text-xs text-slate-500">Amount</div>
            <div className="text-lg font-bold text-emerald-400">{inr(extractedData.amount)}</div>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="text-center">
            <div className="text-xs text-slate-500">Category</div>
            <Badge className="bg-purple-500/20 text-purple-300 mt-1">{extractedData.category}</Badge>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#0D1117] border border-white/10 text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Receipt className="h-5 w-5 text-purple-400" />
            Scan Receipt
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {step === 'upload' && 'Upload or capture a receipt to extract transaction details'}
            {step === 'processing' && 'AI is analyzing your receipt'}
            {step === 'review' && 'Review and confirm the extracted information'}
            {step === 'success' && 'Transaction successfully saved'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          {step === 'upload' && renderUploadStep()}
          {step === 'processing' && renderProcessingStep()}
          {step === 'review' && renderReviewStep()}
          {step === 'success' && renderSuccessStep()}
        </div>
      </DialogContent>
    </Dialog>
  )
}
