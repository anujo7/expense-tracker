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
    <div className="backdrop-blur-xl bg-black/80 border border-white/[0.08] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-white/40">{label}</p>
      <p className="text-sm font-semibold text-white/90">₹{payload[0].value.toLocaleString('en-IN')}</p>
    </div>
  )
}

export function SpendingChart({ data, height = 250 }: SpendingChartProps) {
  if (data.length === 0) {
    return (
      <EmptyState
        title="No data to display"
        subtitle="Add expenses to see your spending trend"
        icon={<BarChart3 size={28} className="text-white/30" />}
      />
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => formatINRCompact(v as number)}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }} />
        <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}
