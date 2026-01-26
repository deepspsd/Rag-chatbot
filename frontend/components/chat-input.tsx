'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Send, Sparkles } from 'lucide-react'

interface ChatInputProps {
  onSubmit: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({
  onSubmit,
  disabled = false,
  placeholder = 'Ask anything about your documents...',
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    if (input.trim() && !disabled) {
      onSubmit(input)
      setInput('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    autoResize()
  }

  const autoResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(
        textareaRef.current.scrollHeight,
        160
      ) + 'px'
    }
  }

  useEffect(() => {
    autoResize()
  }, [input])

  const canSubmit = input.trim() && !disabled

  return (
    <div
      className={cn(
        "relative rounded-2xl transition-all duration-300",
        "glass gradient-border",
        isFocused && "glow-sm"
      )}
    >
      {/* Animated border gradient when focused */}
      {isFocused && (
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-shimmer opacity-50 -z-10" />
      )}

      <div className="flex items-end gap-3 p-3">
        {/* AI indicator */}
        <div className={cn(
          "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all",
          "bg-gradient-to-br from-primary/20 to-accent/20",
          isFocused && "from-primary/30 to-accent/30"
        )}>
          <Sparkles className={cn(
            "h-5 w-5 transition-colors",
            isFocused ? "text-primary" : "text-muted-foreground"
          )} />
        </div>

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              "w-full resize-none bg-transparent border-none outline-none",
              "text-foreground placeholder:text-muted-foreground/60",
              "text-sm md:text-base leading-relaxed",
              "max-h-40 py-2.5",
              "scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          />
        </div>

        {/* Submit button */}
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          size="icon"
          className={cn(
            'flex-shrink-0 h-10 w-10 rounded-xl transition-all duration-300 btn-ripple',
            canSubmit
              ? 'bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl hover:scale-105'
              : 'bg-muted text-muted-foreground'
          )}
        >
          <Send className={cn(
            "h-4 w-4 transition-transform",
            canSubmit && "translate-x-0.5"
          )} />
        </Button>
      </div>

      {/* Helper text */}
      <div className="px-4 pb-2 flex items-center justify-between text-xs text-muted-foreground/60">
        <span>
          Press <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-[10px]">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-[10px]">Shift+Enter</kbd> for new line
        </span>
        {input.length > 0 && (
          <span className={cn(
            input.length > 4000 && "text-destructive"
          )}>
            {input.length} / 4000
          </span>
        )}
      </div>
    </div>
  )
}
