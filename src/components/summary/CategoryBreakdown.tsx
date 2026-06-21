import { CategoryIcon } from '../ui/CategoryIcon'
import { formatINR } from '../../utils/format'
import type { Category } from '../../types'

interface CategoryBreakdownProps {
  data: {
    category: Category
    amount: number
    percentage: number
  }[]
}

export function CategoryBreakdown({ data }: CategoryBreakdownProps) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-6">No spending data</p>
  }

  return (
    <div className="space-y-3">
      {data.map(({ category, amount, percentage }) => (
        <div key={category.id} className="space-y-1.5">
          <div className="flex items-center gap-3">
            <CategoryIcon icon={category.icon} color={category.color} size={16} />
            <span className="text-sm text-gray-300 flex-1">{category.name}</span>
            <span className="text-sm font-medium text-white">{formatINR(amount)}</span>
            <span className="text-xs text-gray-500 w-10 text-right">
              {Math.round(percentage)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-dark-border rounded-full overflow-hidden ml-9">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${percentage}%`,
                backgroundColor: category.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
