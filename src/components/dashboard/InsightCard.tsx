import type { ReactNode } from 'react'
import { formatINR } from '../../utils/format'

interface InsightCardProps {
  value: number | string
  label: string
  change?: number
  isCurrency?: boolean
  icon?: ReactNode
}

export function InsightCard({ value, label, change, isCurrency = true, icon }: InsightCardProps) {
  const formattedValue = isCurrency && typeof value === 'number' ? formatINR(value) : value

  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        {icon && <span className="text-accent">{icon}</span>}
        <h3 className="text-sm font-medium text-gray-400">{label}</h3>
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-2xl font-bold text-white">{formattedValue}</span>
        {change !== undefined && (
          <span className={`text-xs font-medium ${change >= 0 ? 'text-red-400' : 'text-green-400'}`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
}
