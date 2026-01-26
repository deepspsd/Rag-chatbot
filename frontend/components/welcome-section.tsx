'use client'

import { useEffect, useState } from 'react'
import { BookOpen, Globe, Quote, Sparkles, FileText, Zap, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'

const features = [
  {
    icon: Brain,
    label: 'RAG-Powered',
    description: 'Retrieval-augmented generation with your documents',
    gradient: 'from-violet-500 to-purple-600'
  },
  {
    icon: FileText,
    label: 'PDF Analysis',
    description: 'Extract text & diagrams from uploaded PDFs',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    icon: Quote,
    label: 'Source Citations',
    description: 'Every answer includes traceable sources',
    gradient: 'from-emerald-500 to-teal-500'
  },
  {
    icon: Globe,
    label: 'Web Fallback',
    description: 'Searches the web when needed',
    gradient: 'from-orange-500 to-amber-500'
  },
]

const floatingShapes = [
  { size: 80, top: '10%', left: '5%', delay: 0, duration: 8 },
  { size: 60, top: '70%', left: '10%', delay: 2, duration: 10 },
  { size: 100, top: '20%', right: '8%', delay: 1, duration: 9 },
  { size: 50, top: '60%', right: '15%', delay: 3, duration: 7 },
  { size: 70, top: '85%', left: '40%', delay: 4, duration: 11 },
]

export function WelcomeSection() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="relative flex flex-col items-center justify-center h-full text-center px-4 py-8 overflow-hidden">
      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {floatingShapes.map((shape, i) => (
          <div
            key={i}
            className={cn(
              "absolute rounded-full opacity-20 blur-xl",
              mounted && "animate-float-slow"
            )}
            style={{
              width: shape.size,
              height: shape.size,
              top: shape.top,
              left: shape.left,
              right: shape.right,
              background: `linear-gradient(135deg, var(--gradient-start), var(--gradient-end))`,
              animationDelay: `${shape.delay}s`,
              animationDuration: `${shape.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 grid-pattern opacity-30 pointer-events-none" />

      {/* Main content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto space-y-8">
        {/* Hero section */}
        <div className={cn(
          "space-y-4",
          mounted && "animate-fade-in-up"
        )}>
          {/* Title with gradient */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
            <span className="gradient-text">RAG Chatbot</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Your intelligent document assistant powered by <span className="text-foreground font-medium">RAG + AI</span>
          </p>

          {/* Sparkle decoration */}
          <div className="flex items-center justify-center gap-3 text-muted-foreground/50">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm">Ask anything about your documents</span>
            <Sparkles className="h-4 w-4" />
          </div>
        </div>

        {/* Feature cards */}
        <div className={cn(
          "w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch",
          mounted && "animate-fade-in-up delay-200"
        )}>
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.label}
                className={cn(
                  "group relative glass rounded-xl p-5 card-hover gradient-border overflow-hidden h-full min-h-[170px] flex flex-col",
                  mounted && "animate-fade-in-up"
                )}
                style={{ animationDelay: `${200 + index * 100}ms` }}
              >
                {/* Background glow on hover */}
                <div
                  className={cn(
                    "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br",
                    feature.gradient
                  )}
                />

                {/* Icon container */}
                <div className={cn(
                  "relative w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br shadow-lg",
                  feature.gradient
                )}>
                  <Icon className="h-6 w-6 text-white" />
                </div>

                {/* Text content */}
                <h3 className="font-semibold text-foreground mb-1.5 text-left">
                  {feature.label}
                </h3>
                <p className="text-sm text-muted-foreground text-left leading-relaxed">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>

        {/* Call to action hint */}
        <div className={cn(
          "flex flex-col items-center gap-3",
          mounted && "animate-fade-in-up delay-500"
        )}>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Zap className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm">Upload a PDF or start asking questions below</span>
          </div>

          {/* Animated arrow down */}
          <div className="animate-bounce-subtle">
            <svg
              className="h-6 w-6 text-muted-foreground/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
        </div>
      </div>
    </div >
  )
}
