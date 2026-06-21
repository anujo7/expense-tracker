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
    <div className="bg-dark-card border border-dark-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400">Monthly Budget</h3>
        {budget > 0 && (
          <span className={`text-xs font-medium ${getStatusColor()}`}>
            {Math.round(percentage)}% used
          </span>
        )}
      </div>

      {budget > 0 ? (
        <>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-2xl font-bold text-white">{formatINR(spent)}</span>
            <span className="text-sm text-gray-500">of {formatINR(budget)}</span>
          </div>
          <ProgressBar value={spent} max={budget} />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-gray-500">Remaining</span>
            <span className={`text-sm font-semibold ${remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {remaining >= 0 ? formatINR(remaining) : `-${formatINR(Math.abs(remaining))}`}
            </span>
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-500">No budget set for this month</p>
      )}
    </div>
  )
}
