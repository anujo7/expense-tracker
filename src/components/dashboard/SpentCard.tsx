import { motion } from 'framer-motion'
import { formatINR } from '../../utils/format'

interface SpentCardProps {
  total: number
  label: string
  prominent?: boolean
}

export function SpentCard({ total, label, prominent }: SpentCardProps) {
  return (
    <motion.div
      className={`backdrop-blur-xl bg-white/[0.05] border border-white/[0.09] rounded-2xl transition-colors duration-200 ${prominent ? 'p-5' : 'p-4'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h3 className="text-xs font-medium text-white/45 mb-2">{label}</h3>
      <span className={`font-bold text-white ${prominent ? 'text-2xl' : 'text-xl'}`}>{formatINR(total)}</span>
    </motion.div>
  )
}
