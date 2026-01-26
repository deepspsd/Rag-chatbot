'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChatMessage } from '@/components/chat-message'
import { ChatInput } from '@/components/chat-input'
import { WelcomeSection } from '@/components/welcome-section'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Trash2,
  Upload,
  FileText,
  X,
  BookOpen,
  Globe,
  Sparkles,
  Menu,
  ChevronRight,
  Zap,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  meta?: {
    mode?: 'document_rag' | 'web_fallback' | 'llm_knowledge' | 'conversational'
    sources?: Array<Record<string, any>>
    urls?: string[]
    retrieval?: Record<string, any>
    diagrams?: Array<{ source: string; page: number; url: string }>
  }
}

const quickPrompts = [
  { icon: '📄', label: 'Summarize Document', q: 'Can you summarize the main points of this document?' },
  { icon: '🔍', label: 'Key Insights', q: 'What are the key insights from this document?' },
  { icon: '💡', label: 'Explain Concept', q: 'Can you explain the main concept discussed in this document?' },
  { icon: '📊', label: 'Important Details', q: 'What are the most important details I should know?' },
  { icon: '❓', label: 'Ask Questions', q: 'What questions can I ask about this document?' },
]

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syllabusOnly, setSyllabusOnly] = useState(false)
  const [activeSource, setActiveSource] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedPdfName, setUploadedPdfName] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'error'>('idle')
  const [isDragOver, setIsDragOver] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      ) as HTMLElement
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }, [messages])

  const handleUploadPdf = async (file: File) => {
    setError(null)
    setIsUploading(true)
    setUploadedPdfName(file.name)
    setUploadProgress('uploading')

    try {
      const fd = new FormData()
      fd.append('file', file)

      setUploadProgress('processing')
      const resp = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: fd,
      })
      const data = await resp.json().catch(() => null)

      if (!resp.ok) {
        throw new Error(data?.error || 'Failed to upload PDF')
      }

      setActiveSource(data?.source || file.name)
      setUploadProgress('done')

      // Reset progress after delay
      setTimeout(() => setUploadProgress('idle'), 3000)
    } catch (e: any) {
      setError(e?.message || 'Upload failed')
      setUploadedPdfName(null)
      setUploadProgress('error')
      setTimeout(() => setUploadProgress('idle'), 3000)
    } finally {
      setIsUploading(false)
    }
  }

  const clearActivePdf = () => {
    setActiveSource(null)
    setUploadedPdfName(null)
    setUploadProgress('idle')
  }

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
    }

    setMessages((prev: Message[]) => [...prev, userMessage])
    setIsLoading(true)
    setError(null)

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: content,
          allow_web_fallback: !syllabusOnly,
          source: activeSource,
        }),
      })

      const data = await resp.json().catch(() => null)
      if (!resp.ok) {
        throw new Error(data?.error || 'Failed to get response')
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data?.answer || '',
        meta: data?.meta || data?.debug || {},
      }
      setMessages((prev: Message[]) => [...prev, assistantMessage])
    } catch (e: any) {
      setError(e?.message || 'Something went wrong')
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I could not reach the backend. Please make sure the FastAPI server is running.',
      }
      setMessages((prev: Message[]) => [...prev, assistantMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearChat = () => {
    setMessages([])
    setError(null)
  }

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    const pdfFile = files.find(f => f.type === 'application/pdf')

    if (pdfFile) {
      handleUploadPdf(pdfFile)
    }
  }, [])

  return (
    <div
      className="h-screen flex flex-col bg-background overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="glass rounded-3xl p-12 gradient-border animate-pulse-glow">
            <Upload className="h-16 w-16 text-primary mx-auto mb-4" />
            <p className="text-xl font-semibold gradient-text">Drop your PDF here</p>
            <p className="text-muted-foreground mt-2">Upload and start asking questions</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="relative z-20 border-b border-border/50 glass">
        <div className="px-4 py-3 md:px-6 md:py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
          {/* Logo and title */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 blur-lg bg-primary/30 rounded-xl" />
                <div className="relative glass rounded-xl p-2 gradient-border">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold">
                  <span className="gradient-text">RAG Chatbot</span>
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Powered by AI
                </p>
              </div>
            </div>
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-3">
            {/* Active PDF indicator */}
            {activeSource && (
              <Badge variant="secondary" className="gap-2 px-3 py-1.5 hidden sm:flex">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span className="max-w-[120px] truncate">{activeSource}</span>
                <button
                  onClick={clearActivePdf}
                  className="ml-1 hover:text-destructive transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </Badge>
            )}

            {/* Mode indicator */}
            <Badge
              variant="outline"
              className={cn(
                "gap-1.5 px-3 py-1.5 hidden md:flex transition-colors",
                syllabusOnly
                  ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "border-blue-500/30 text-blue-600 dark:text-blue-400"
              )}
            >
              {syllabusOnly ? (
                <>
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>RAG Only</span>
                </>
              ) : (
                <>
                  <Globe className="h-3.5 w-3.5" />
                  <span>Web Enabled</span>
                </>
              )}
            </Badge>

            {/* Clear button */}
            <Button
              onClick={handleClearChat}
              disabled={messages.length === 0}
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Sidebar */}
        <aside className={cn(
          "w-72 border-r border-border/50 glass flex flex-col transition-all duration-300",
          "absolute lg:relative inset-y-0 left-0 z-30 lg:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
          {/* Mobile close button */}
          <div className="lg:hidden flex justify-end p-4">
            <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 p-4 space-y-6 overflow-auto">
            {/* Upload section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Document
              </h3>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleUploadPdf(f)
                  e.currentTarget.value = ''
                }}
                disabled={isUploading || isLoading}
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={cn(
                  "w-full p-6 rounded-xl border-2 border-dashed transition-all",
                  "flex flex-col items-center justify-center gap-2",
                  "hover:border-primary/50 hover:bg-primary/5",
                  isUploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                  uploadProgress === 'done' && "border-emerald-500/50 bg-emerald-500/5",
                  uploadProgress === 'error' && "border-destructive/50 bg-destructive/5"
                )}
              >
                {uploadProgress === 'idle' && (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-sm font-medium">Click or drag PDF</span>
                    <span className="text-xs text-muted-foreground">Max 50MB</span>
                  </>
                )}
                {(uploadProgress === 'uploading' || uploadProgress === 'processing') && (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse">
                      <Zap className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-sm font-medium">
                      {uploadProgress === 'uploading' ? 'Uploading...' : 'Processing...'}
                    </span>
                  </>
                )}
                {uploadProgress === 'done' && (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-emerald-500" />
                    </div>
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Upload complete!</span>
                  </>
                )}
                {uploadProgress === 'error' && (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                      <AlertCircle className="h-6 w-6 text-destructive" />
                    </div>
                    <span className="text-sm font-medium text-destructive">Upload failed</span>
                  </>
                )}
              </button>

              {/* Active document */}
              {activeSource && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-sm truncate flex-1">{activeSource}</span>
                  <button onClick={clearActivePdf} className="p-1 hover:text-destructive">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Settings</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Document-only mode</div>
                    <div className="text-xs text-muted-foreground">
                      Disable web search and search only from provided source
                    </div>
                  </div>
                  <Switch
                    checked={syllabusOnly}
                    onCheckedChange={setSyllabusOnly}
                  />
                </div>
              </div>
            </div>

            {/* Quick prompts */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Quick Questions</h3>
              <div className="space-y-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt.label}
                    onClick={() => {
                      handleSendMessage(prompt.q)
                      setSidebarOpen(false)
                    }}
                    disabled={isLoading}
                    className="w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-muted/50 transition-colors group"
                  >
                    <span className="text-lg">{prompt.icon}</span>
                    <span className="text-sm flex-1">{prompt.label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Chat area */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-start pt-8 p-4 gradient-bg-animated overflow-auto">
              <WelcomeSection />
            </div>
          ) : (
            <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
              <div className="p-4 md:p-8 max-w-4xl mx-auto w-full">
                {error && (
                  <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive flex items-start gap-3 animate-fade-in">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Error</p>
                      <p className="text-destructive/80">{error}</p>
                    </div>
                  </div>
                )}
                {messages.map((message: Message) => (
                  <ChatMessage
                    key={message.id}
                    role={message.role}
                    content={message.content}
                    meta={message.meta}
                  />
                ))}

                {isLoading && (
                  <ChatMessage role="assistant" content="" isLoading={true} />
                )}
              </div>
            </ScrollArea>
          )}

          {/* Input Area */}
          <div className="border-t border-border/50 p-4 md:p-6 glass">
            <div className="max-w-4xl mx-auto w-full">
              <ChatInput
                onSubmit={handleSendMessage}
                disabled={isLoading}
                placeholder={
                  activeSource
                    ? `Ask about ${activeSource}...`
                    : "Ask anything about your documents..."
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
