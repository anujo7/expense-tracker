import { TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'
import { formatINR } from '../../utils/format'

interface SpentCardProps {
  total: number
  label: string
}

export function SpentCard({ total, label }: SpentCardProps) {
  return (
    <motion.div
      className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={16} className="text-violet-400" />
        <h3 className="text-sm font-medium text-white/40">{label}</h3>
      </div>
      <span className="text-2xl font-bold text-white/90">{formatINR(total)}</span>
    </motion.div>
  )
}
