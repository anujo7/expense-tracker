import { TrendingUp } from 'lucide-react'
import { formatINR } from '../../utils/format'

interface SpentCardProps {
  total: number
  label: string
}

export function SpentCard({ total, label }: SpentCardProps) {
  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={16} className="text-accent" />
        <h3 className="text-sm font-medium text-gray-400">{label}</h3>
      </div>
      <span className="text-2xl font-bold text-white">{formatINR(total)}</span>
    </div>
  )
}
