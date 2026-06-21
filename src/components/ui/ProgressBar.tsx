interface ProgressBarProps {
  value: number
  max: number
  className?: string
  showLabel?: boolean
}

export function ProgressBar({ value, max, className = '', showLabel = false }: ProgressBarProps) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const overBudget = value > max && max > 0

  const getColor = () => {
    if (overBudget) return 'bg-red-500'
    if (percentage > 80) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  return (
    <div className={className}>
      <div className="w-full h-2 bg-dark-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1.5 text-xs text-gray-500">
          <span>{Math.round(percentage)}% used</span>
          {overBudget && <span className="text-red-400 font-medium">Over budget!</span>}
        </div>
      )}
    </div>
  )
}
