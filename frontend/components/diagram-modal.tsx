'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Download, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Diagram {
    source: string
    page: number
    url: string
}

interface DiagramModalProps {
    diagrams: Diagram[]
    initialIndex?: number
    isOpen: boolean
    onClose: () => void
}

export function DiagramModal({ diagrams, initialIndex = 0, isOpen, onClose }: DiagramModalProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex)
    const [zoom, setZoom] = useState(1)
    const [isLoading, setIsLoading] = useState(true)

    const currentDiagram = diagrams[currentIndex]

    const handlePrev = useCallback(() => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : diagrams.length - 1))
        setZoom(1)
        setIsLoading(true)
    }, [diagrams.length])

    const handleNext = useCallback(() => {
        setCurrentIndex((prev) => (prev < diagrams.length - 1 ? prev + 1 : 0))
        setZoom(1)
        setIsLoading(true)
    }, [diagrams.length])

    const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3))
    const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5))
    const handleResetZoom = () => setZoom(1)

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'Escape':
                    onClose()
                    break
                case 'ArrowLeft':
                    handlePrev()
                    break
                case 'ArrowRight':
                    handleNext()
                    break
                case '+':
                case '=':
                    handleZoomIn()
                    break
                case '-':
                    handleZoomOut()
                    break
                case '0':
                    handleResetZoom()
                    break
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose, handlePrev, handleNext])

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex)
            setZoom(1)
            setIsLoading(true)
        }
    }, [isOpen, initialIndex])

    if (!isOpen || !currentDiagram) return null

    const imageUrl = `/api/pdf-page-image?source=${encodeURIComponent(currentDiagram.source)}&page=${encodeURIComponent(String(currentDiagram.page))}`

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay animate-fade-in">
            {/* Backdrop */}
            <div className="absolute inset-0" onClick={onClose} />

            {/* Modal content */}
            <div className="relative z-10 w-full max-w-6xl mx-4 animate-fade-in-scale">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="glass rounded-lg px-4 py-2">
                        <h3 className="text-sm font-medium text-foreground">
                            {currentDiagram.source}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            Page {currentDiagram.page} • {currentIndex + 1} of {diagrams.length}
                        </p>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                        <div className="glass rounded-lg flex items-center gap-1 p-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handleZoomOut}
                                disabled={zoom <= 0.5}
                            >
                                <ZoomOut className="h-4 w-4" />
                            </Button>
                            <span className="text-xs font-medium px-2 min-w-[4rem] text-center">
                                {Math.round(zoom * 100)}%
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handleZoomIn}
                                disabled={zoom >= 3}
                            >
                                <ZoomIn className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handleResetZoom}
                            >
                                <Maximize2 className="h-4 w-4" />
                            </Button>
                        </div>

                        <a
                            href={imageUrl}
                            download={`${currentDiagram.source}-page-${currentDiagram.page}.png`}
                            className="glass rounded-lg p-2 hover:bg-muted transition-colors"
                        >
                            <Download className="h-4 w-4" />
                        </a>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="glass rounded-lg"
                            onClick={onClose}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Image container */}
                <div className="relative glass rounded-xl overflow-hidden">
                    <div
                        className="flex items-center justify-center min-h-[60vh] max-h-[75vh] overflow-auto p-4"
                        style={{ cursor: zoom > 1 ? 'grab' : 'default' }}
                    >
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                                <div className="flex gap-1">
                                    <span className="typing-dot w-2 h-2 rounded-full bg-primary" />
                                    <span className="typing-dot w-2 h-2 rounded-full bg-primary" />
                                    <span className="typing-dot w-2 h-2 rounded-full bg-primary" />
                                </div>
                            </div>
                        )}
                        <img
                            src={imageUrl}
                            alt={`${currentDiagram.source} page ${currentDiagram.page}`}
                            className={cn(
                                "max-w-full max-h-full object-contain transition-all duration-300",
                                isLoading && "opacity-0"
                            )}
                            style={{ transform: `scale(${zoom})` }}
                            onLoad={() => setIsLoading(false)}
                            onError={() => setIsLoading(false)}
                        />
                    </div>

                    {/* Navigation arrows */}
                    {diagrams.length > 1 && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full glass opacity-80 hover:opacity-100"
                                onClick={handlePrev}
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full glass opacity-80 hover:opacity-100"
                                onClick={handleNext}
                            >
                                <ChevronRight className="h-6 w-6" />
                            </Button>
                        </>
                    )}
                </div>

                {/* Thumbnail strip */}
                {diagrams.length > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-4 overflow-x-auto pb-2">
                        {diagrams.map((d, i) => (
                            <button
                                key={`${d.source}-${d.page}-${i}`}
                                onClick={() => {
                                    setCurrentIndex(i)
                                    setZoom(1)
                                    setIsLoading(true)
                                }}
                                className={cn(
                                    "flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                                    i === currentIndex
                                        ? "border-primary glow-sm"
                                        : "border-transparent opacity-60 hover:opacity-100"
                                )}
                            >
                                <img
                                    src={`/api/pdf-page-image?source=${encodeURIComponent(d.source)}&page=${encodeURIComponent(String(d.page))}`}
                                    alt={`Thumbnail ${i + 1}`}
                                    className="w-full h-full object-cover"
                                />
                            </button>
                        ))}
                    </div>
                )}

                {/* Keyboard hints */}
                <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
                    <span>← → Navigate</span>
                    <span>+ - Zoom</span>
                    <span>Esc Close</span>
                </div>
            </div>
        </div>
    )
}
