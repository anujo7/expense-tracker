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

  const getStatusBadgeBg = () => {
    if (percentage > 100) return 'bg-red-500/15 text-red-400 border border-red-500/20'
    if (percentage > 80) return 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
    return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
  }

  return (
    <motion.div
      className="relative overflow-hidden backdrop-blur-xl bg-white/[0.05] border border-white/[0.09] rounded-2xl p-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.07] via-transparent to-transparent pointer-events-none" />

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-white/55">Monthly Budget</h3>
          {budget > 0 && (
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${getStatusBadgeBg()}`}>
              {Math.round(percentage)}% used
            </span>
          )}
        </div>

        {budget > 0 ? (
          <>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-bold text-white">{formatINR(spent)}</span>
              <span className="text-sm text-white/35">of {formatINR(budget)}</span>
            </div>
            <ProgressBar value={spent} max={budget} />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-white/40">Remaining</span>
              <span className={`text-sm font-semibold ${remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {remaining >= 0 ? formatINR(remaining) : `-${formatINR(Math.abs(remaining))}`}
              </span>
            </div>
          </>
        ) : (
          <p className="text-sm text-white/40">No budget set for this month</p>
        )}
      </div>
    </motion.div>
  )
}
