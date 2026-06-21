import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  subtitle: string
  icon?: ReactNode
}

export function EmptyState({ title, subtitle, icon }: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-dark-card border border-dark-border mb-4">
        {icon || (
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-500"
          >
            <path d="M12 3v18" />
            <path d="M3 12h18" />
          </svg>
        )}
      </div>
      <p className="text-base font-medium text-white mb-1">{title}</p>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
  )
}
