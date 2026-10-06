import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import PointerBubble from '@/components/PointerBubble'

export const metadata = {
  title: 'FinWise - Smart Personal Finance',
  description: 'Track expenses, set budgets, and get intelligent financial insights instantly.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <PointerBubble />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
