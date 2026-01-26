'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { DiagramModal } from './diagram-modal'
import {
  BookOpen,
  Globe,
  FileText,
  ChevronRight,
  ExternalLink,
  ImageIcon,
  Sparkles,
  Bot,
  User
} from 'lucide-react'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  isLoading?: boolean
  meta?: {
    mode?: 'document_rag' | 'web_fallback' | 'llm_knowledge' | 'conversational'
    sources?: Array<Record<string, any>>
    urls?: string[]
    retrieval?: Record<string, any>
    diagrams?: Array<{ source: string; page: number; url: string }>
  }
}

export function ChatMessage({
  role,
  content,
  isLoading = false,
  meta,
}: ChatMessageProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedDiagramIndex, setSelectedDiagramIndex] = useState(0)

  const isUser = role === 'user'
  const showMeta = !isUser && !isLoading && !!meta
  const mode = meta?.mode
  const urls = meta?.urls || []
  const sources = meta?.sources || []
  const retrieval = meta?.retrieval
  const diagrams = meta?.diagrams || []

  const openDiagramModal = (index: number) => {
    setSelectedDiagramIndex(index)
    setModalOpen(true)
  }

  return (
    <>
      <div
        className={cn(
          'flex gap-4 mb-6 w-full',
          isUser ? 'flex-row-reverse animate-slide-in-right' : 'flex-row animate-slide-in-left',
        )}
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          <Avatar className={cn(
            "h-10 w-10 ring-2 ring-offset-2 ring-offset-background transition-all",
            isUser
              ? "ring-primary/50"
              : "ring-accent/50"
          )}>
            <AvatarImage
              src={isUser ? '/placeholder-user.jpg' : undefined}
              alt={isUser ? 'You' : 'Assistant'}
            />
            <AvatarFallback
              className={cn(
                'text-sm font-semibold',
                isUser
                  ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'
                  : 'bg-gradient-to-br from-accent to-accent/80 text-accent-foreground'
              )}
            >
              {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Message bubble */}
        <div
          className={cn(
            'relative max-w-[85%] md:max-w-2xl lg:max-w-3xl px-5 py-4 rounded-2xl shadow-premium',
            isUser
              ? 'message-user rounded-br-md'
              : 'message-assistant rounded-bl-md'
          )}
        >
          {/* Mode badge */}
          {showMeta && mode && (
            <div className="mb-3 flex items-center gap-2">
              <Badge
                variant="secondary"
                className={cn(
                  "gap-1.5 px-2.5 py-1",
                  mode === 'document_rag'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : mode === 'web_fallback'
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                      : mode === 'llm_knowledge'
                        ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20'
                        : 'bg-muted/40 text-muted-foreground border-border'
                )}
              >
                {mode === 'document_rag' ? (
                  <>
                    <BookOpen className="h-3 w-3" />
                    Document RAG
                  </>
                ) : mode === 'web_fallback' ? (
                  <>
                    <Globe className="h-3 w-3" />
                    Web Search
                  </>
                ) : mode === 'llm_knowledge' ? (
                  <>
                    <Sparkles className="h-3 w-3" />
                    General Knowledge
                  </>
                ) : (
                  <>
                    <Bot className="h-3 w-3" />
                    Conversational
                  </>
                )}
              </Badge>
            </div>
          )}

          {/* Message content */}
          <div className={cn(
            "text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words",
            isUser ? "text-white" : "text-foreground"
          )}>
            {isLoading ? (
              <div className="flex items-center gap-2 py-1">
                <span className="flex items-center gap-1.5">
                  <span className="typing-dot w-2 h-2 rounded-full bg-current" />
                  <span className="typing-dot w-2 h-2 rounded-full bg-current" />
                  <span className="typing-dot w-2 h-2 rounded-full bg-current" />
                </span>
                <span className="text-muted-foreground text-sm ml-2">Thinking...</span>
              </div>
            ) : (
              content
            )}
          </div>

          {/* Diagrams section */}
          {showMeta && diagrams.length > 0 && (
            <div className="mt-5 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">PDF Diagrams</span>
                <Badge variant="secondary" className="text-xs">
                  {diagrams.length}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {diagrams.map((d, i) => (
                  <button
                    key={`${d.source}:${d.page}:${i}`}
                    onClick={() => openDiagramModal(i)}
                    className="group relative diagram-thumb rounded-xl overflow-hidden border border-border bg-background/50"
                  >
                    <div className="aspect-[4/3] relative">
                      <img
                        src={`/api/pdf-page-image?source=${encodeURIComponent(d.source)}&page=${encodeURIComponent(String(d.page))}`}
                        alt={`${d.source} page ${d.page}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-sm font-medium flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4" />
                          View
                        </span>
                      </div>
                    </div>
                    <div className="p-2 text-left">
                      <p className="text-xs font-medium truncate">{d.source}</p>
                      <p className="text-xs text-muted-foreground">Page {d.page}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sources and metadata accordion */}
          {showMeta && (sources.length > 0 || urls.length > 0 || retrieval) && (
            <div className="mt-4 pt-3 border-t border-border/50">
              <Accordion type="single" collapsible className="w-full">
                {/* Document sources */}
                {sources.length > 0 && (
                  <AccordionItem value="sources" className="border-none">
                    <AccordionTrigger className="py-2 hover:no-underline">
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-emerald-500" />
                        <span>Sources</span>
                        <Badge variant="secondary" className="text-xs ml-1">
                          {sources.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pl-6">
                        {sources.map((s, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 text-sm text-muted-foreground"
                          >
                            <ChevronRight className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="font-medium text-foreground">
                                {s?.source || 'Document'}
                              </span>
                              {s?.page && (
                                <span className="text-muted-foreground"> — Page {s.page}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Web references */}
                {urls.length > 0 && (
                  <AccordionItem value="web" className="border-none">
                    <AccordionTrigger className="py-2 hover:no-underline">
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="h-4 w-4 text-blue-500" />
                        <span>Web References</span>
                        <Badge variant="secondary" className="text-xs ml-1">
                          {urls.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pl-6">
                        {urls.map((u, i) => (
                          <a
                            key={`${u}-${i}`}
                            href={u}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-start gap-2 text-sm text-primary hover:text-primary/80 transition-colors group"
                          >
                            <ExternalLink className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <span className="break-all underline-offset-2 group-hover:underline">
                              {u}
                            </span>
                          </a>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Debug info */}
                {retrieval && (
                  <AccordionItem value="debug" className="border-none">
                    <AccordionTrigger className="py-2 hover:no-underline">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        Debug Info
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <pre className="text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto">
                        {JSON.stringify({ retrieval }, null, 2)}
                      </pre>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </div>
          )}
        </div>
      </div>

      {/* Diagram modal */}
      {diagrams.length > 0 && (
        <DiagramModal
          diagrams={diagrams}
          initialIndex={selectedDiagramIndex}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}
