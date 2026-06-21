import { BarChart3 } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { EmptyState } from '../ui/EmptyState'
import { formatINRCompact } from '../../utils/format'

interface SpendingChartProps {
  data: { label: string; amount: number }[]
  height?: number
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-dark-card border border-dark-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-white">₹{payload[0].value.toLocaleString('en-IN')}</p>
    </div>
  )
}

export function SpendingChart({ data, height = 250 }: SpendingChartProps) {
  if (data.length === 0) {
    return (
      <EmptyState
        title="No data to display"
        subtitle="Add expenses to see your spending trend"
        icon={<BarChart3 size={28} className="text-gray-500" />}
      />
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#6b7280', fontSize: 11 }}
          axisLine={{ stroke: '#1e1e1e' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#6b7280', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => formatINRCompact(v as number)}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} />
        <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}
