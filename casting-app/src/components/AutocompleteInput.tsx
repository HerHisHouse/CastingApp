'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

interface Props {
    value: string
    onChange: (val: string) => void
    suggestions: string[]
    placeholder?: string
    className?: string
    style?: React.CSSProperties
}

export default function AutocompleteInput({
    value, onChange, suggestions, placeholder, className = 'form-input', style,
}: Props) {
    const [open, setOpen] = useState(false)
    const [highlighted, setHighlighted] = useState(-1)
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Filtrar sugerencias según lo escrito
    const filtered = value.trim().length > 0
        ? suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase())
        : suggestions.slice(0, 8)   // si campo vacío muestra los primeros 8

    // Cerrar al clicar fuera
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
                setHighlighted(-1)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const select = useCallback((val: string) => {
        onChange(val)
        setOpen(false)
        setHighlighted(-1)
    }, [onChange])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!open || filtered.length === 0) {
            if (e.key === 'ArrowDown' && filtered.length > 0) { setOpen(true); setHighlighted(0) }
            return
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlighted(h => Math.min(h + 1, filtered.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlighted(h => Math.max(h - 1, 0))
        } else if (e.key === 'Enter' && highlighted >= 0) {
            e.preventDefault()
            select(filtered[highlighted])
        } else if (e.key === 'Escape') {
            setOpen(false)
            setHighlighted(-1)
        }
    }

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            <input
                ref={inputRef}
                className={className}
                style={style}
                value={value}
                placeholder={placeholder}
                onChange={e => { onChange(e.target.value); setOpen(true); setHighlighted(-1) }}
                onFocus={() => { if (filtered.length > 0) setOpen(true) }}
                onKeyDown={handleKeyDown}
                autoComplete="off"
            />

            {open && filtered.length > 0 && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    zIndex: 9999,
                    maxHeight: '220px',
                    overflowY: 'auto',
                    padding: '4px',
                }}>
                    {filtered.map((s, i) => (
                        <div
                            key={s}
                            onMouseDown={() => select(s)}
                            onMouseEnter={() => setHighlighted(i)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                color: i === highlighted ? 'var(--accent-light)' : 'var(--text-primary)',
                                background: i === highlighted ? 'var(--accent-dim)' : 'transparent',
                                transition: 'background 0.1s ease',
                                userSelect: 'none',
                            }}
                        >
                            {s}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
