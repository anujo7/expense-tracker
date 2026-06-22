import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
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
    <motion.div
      className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon && <span className="text-violet-400">{icon}</span>}
        <h3 className="text-sm font-medium text-white/40">{label}</h3>
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-2xl font-bold text-white/90">{formattedValue}</span>
        {change !== undefined && (
          <span className={`text-xs font-medium ${change >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
    </motion.div>
  )
}
