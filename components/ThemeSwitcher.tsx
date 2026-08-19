'use client'

import type { Theme } from '@/components/HomeClient'

const THEMES: { id: Theme; label: string; short: string }[] = [
  { id: 'default', label: '默认', short: '0' },
  { id: 'refined', label: '精致极简', short: 'A' },
  { id: 'editorial', label: '杂志编辑', short: 'B' },
  { id: 'terminal', label: 'AI 终端', short: 'C' },
]

interface ThemeSwitcherProps {
  theme: Theme
  onThemeChange: (t: Theme) => void
}

export function ThemeSwitcher({ theme, onThemeChange }: ThemeSwitcherProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 3,
        padding: '5px',
        background: 'rgba(20, 18, 16, 0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.09)',
        borderRadius: 999,
        zIndex: 200,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        userSelect: 'none',
      }}
    >
      {THEMES.map(t => {
        const active = theme === t.id
        return (
          <button
            key={t.id}
            onClick={() => onThemeChange(t.id)}
            title={`切换到${t.label}主题`}
            style={{
              padding: '7px 15px',
              borderRadius: 999,
              border: 'none',
              background: active ? 'rgba(245, 244, 237, 0.95)' : 'transparent',
              color: active ? '#141413' : 'rgba(200, 195, 188, 0.8)',
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              cursor: 'pointer',
              transition: 'all .18s',
              fontFamily: '"PingFang SC", system-ui, sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{
              fontSize: 9,
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
              opacity: active ? 0.5 : 0.35,
              padding: '1px 4px',
              borderRadius: 3,
              background: active ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
              letterSpacing: '0.04em',
            }}>
              {t.short}
            </span>
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
