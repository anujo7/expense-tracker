import { PieChart } from 'lucide-react'
import { CategoryIcon } from '../ui/CategoryIcon'
import { EmptyState } from '../ui/EmptyState'
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
    return (
      <EmptyState
        title="No spending data"
        subtitle="Add expenses to see your category breakdown"
        icon={<PieChart size={28} className="text-gray-500" />}
      />
    )
  }

  return (
    <div className="space-y-3 overflow-hidden">
      {data.map(({ category, amount, percentage }) => (
        <div key={category.id} className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="shrink-0">
              <CategoryIcon icon={category.icon} color={category.color} size={16} />
            </div>
            <span className="text-sm text-gray-300 flex-1 truncate">{category.name}</span>
            <span className="text-sm font-medium text-white shrink-0">{formatINR(amount)}</span>
            <span className="text-xs text-gray-500 w-10 text-right shrink-0">
              {Math.round(percentage)}%
            </span>
          </div>
          <div className="h-1.5 bg-dark-border rounded-full overflow-hidden">
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
