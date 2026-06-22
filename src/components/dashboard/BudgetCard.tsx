import { motion } from 'framer-motion'
import { ProgressBar } from '../ui/ProgressBar'
import { formatINR } from '../../utils/format'

interface BudgetCardProps {
  spent: number
  budget: number
}

export function BudgetCard({ spent, budget }: BudgetCardProps) {
  const remaining = budget - spent
  const percentage = budget > 0 ? (spent / budget) * 100 : 0

  const getStatusColor = () => {
    if (percentage > 100) return 'text-red-400'
    if (percentage > 80) return 'text-amber-400'
    return 'text-emerald-400'
  }

  return (
    <motion.div
      className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white/40">Monthly Budget</h3>
        {budget > 0 && (
          <span className={`text-xs font-medium ${getStatusColor()}`}>
            {Math.round(percentage)}% used
          </span>
        )}
      </div>

      {budget > 0 ? (
        <>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-2xl font-bold text-white/90">{formatINR(spent)}</span>
            <span className="text-sm text-white/30">of {formatINR(budget)}</span>
          </div>
          <ProgressBar value={spent} max={budget} />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-white/30">Remaining</span>
            <span className={`text-sm font-semibold ${remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {remaining >= 0 ? formatINR(remaining) : `-${formatINR(Math.abs(remaining))}`}
            </span>
          </div>
        </>
      ) : (
        <p className="text-sm text-white/30">No budget set for this month</p>
      )}
    </motion.div>
  )
}
