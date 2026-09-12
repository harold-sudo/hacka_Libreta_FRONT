import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export interface TabItem<T extends string> {
  id: T
  label: string
  description: string
  content: ReactNode
}

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: TabItem<T>[]
  active: T
  onChange: (id: T) => void
}) {
  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {tabs.map((tab) => {
          const isActive = tab.id === active
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                'rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60',
                isActive
                  ? 'border-violet-400/40 bg-violet-500/10 text-violet-100'
                  : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-slate-200',
              )}
            >
              <span className="block text-sm font-semibold">{tab.label}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{tab.description}</span>
            </button>
          )
        })}
      </div>
      <div className="mt-5">{tabs.find((t) => t.id === active)?.content}</div>
    </div>
  )
}
