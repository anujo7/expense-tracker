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
      className="backdrop-blur-xl bg-white/[0.05] border border-white/[0.09] rounded-2xl p-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        {icon && <span className="text-violet-400/80">{icon}</span>}
        <h3 className="text-xs font-medium text-white/45">{label}</h3>
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-xl font-bold text-white">{formattedValue}</span>
        {change !== undefined && (
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${change >= 0 ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
    </motion.div>
  )
}
