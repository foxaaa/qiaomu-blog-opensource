'use client'

import { useState, useRef, useEffect, useSyncExternalStore } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  getClientThemePreference,
  subscribeToThemeChange,
  THEME_CHANGE_EVENT,
  THEME_OPTIONS,
  THEME_STORAGE_KEY,
  type Theme,
} from '@/lib/appearance'

export type { Theme }

export function dispatchThemeChange(theme: Theme) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme } }))
}

interface ThemeDropdownProps {
  // Optional style overrides for themed headers (B/C custom headers)
  buttonStyle?: React.CSSProperties
  dropdownStyle?: React.CSSProperties
  itemStyle?: React.CSSProperties
  activeItemStyle?: React.CSSProperties
  inlineMenu?: boolean
  fullWidth?: boolean
  initialTheme?: Theme
  onThemeChange?: (theme: Theme) => void
}

export function ThemeDropdown({
  buttonStyle,
  dropdownStyle,
  itemStyle,
  activeItemStyle,
  inlineMenu = false,
  fullWidth = false,
  initialTheme = 'default',
  onThemeChange,
}: ThemeDropdownProps = {}) {
  const theme = useSyncExternalStore(
    subscribeToThemeChange,
    () => getClientThemePreference(initialTheme),
    () => initialTheme,
  )
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleChange = (t: Theme) => {
    setOpen(false)
    localStorage.setItem(THEME_STORAGE_KEY, t)
    // Update data-theme on <html>
    if (t === 'default') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', t)
    }
    // Notify other listeners (HomeClient for layout switching)
    dispatchThemeChange(t)
    onThemeChange?.(t)
  }

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        width: fullWidth ? '100%' : undefined,
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: fullWidth ? 'space-between' : undefined,
          gap: 3,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          font: 'inherit',
          fontSize: 'inherit',
          color: 'inherit',
          width: fullWidth ? '100%' : undefined,
          ...buttonStyle,
        }}
      >
        主题
        <ChevronDown
          style={{
            width: 13,
            height: 13,
            transition: 'transform .15s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: inlineMenu ? 'static' : 'absolute',
            top: inlineMenu ? undefined : 'calc(100% + 8px)',
            left: inlineMenu ? undefined : 0,
            minWidth: inlineMenu ? '100%' : 120,
            width: inlineMenu ? '100%' : undefined,
            marginTop: inlineMenu ? 10 : undefined,
            borderRadius: 8,
            border: '1px solid var(--editor-line)',
            background: 'var(--background)',
            boxShadow: inlineMenu ? 'none' : '0 8px 24px rgba(0,0,0,0.12)',
            padding: '4px',
            zIndex: 50,
            ...dropdownStyle,
          }}
        >
          {THEME_OPTIONS.map(t => {
            const active = theme === t.id
            return (
              <button
                key={t.id}
                onClick={() => handleChange(t.id)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '7px 12px',
                  borderRadius: 5,
                  border: 'none',
                  background: active ? 'var(--editor-accent)' : 'transparent',
                  color: active ? 'var(--editor-accent-ink)' : 'var(--editor-ink)',
                  cursor: 'pointer',
                  font: 'inherit',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  transition: 'background .12s',
                  ...itemStyle,
                  ...(active ? activeItemStyle : {}),
                }}
                onMouseEnter={e => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--editor-panel)'
                }}
                onMouseLeave={e => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
