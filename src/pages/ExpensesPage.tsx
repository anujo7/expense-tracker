import { useState, useMemo } from 'react'
import { Download, Filter, Search } from 'lucide-react'
import { ExpenseList } from '../components/expenses/ExpenseList'
import { ListSkeleton } from '../components/ui/Skeleton'
import { Button } from '../components/ui/Button'
import { useExpenses } from '../hooks/useExpenses'
import { useCategories } from '../hooks/useCategories'
import { formatINR } from '../utils/format'

export function ExpensesPage() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const { expenses, loading, refetch } = useExpenses({
    startDate: startDate ? new Date(startDate).toISOString() : undefined,
    endDate: endDate ? new Date(endDate + 'T23:59:59').toISOString() : undefined,
    categoryId: categoryFilter || undefined,
  })
  const { categories } = useCategories()

  const filteredExpenses = useMemo(() => {
    if (!searchQuery.trim()) return expenses
    const query = searchQuery.toLowerCase()
    return expenses.filter(
      e =>
        e.note.toLowerCase().includes(query) ||
        (e.category?.name || '').toLowerCase().includes(query) ||
        e.amount.toString().includes(query)
    )
  }, [expenses, searchQuery])

  const total = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  )

  const clearFilters = () => {
    setStartDate('')
    setEndDate('')
    setCategoryFilter('')
    setSearchQuery('')
  }

  const handleExport = () => {
    if (filteredExpenses.length === 0) return

    const escape = (value: string) => {
      const str = value.replace(/"/g, '""')
      return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str
    }

    const rows = [
      ['Date', 'Category', 'Note', 'Amount'],
      ...filteredExpenses.map(e => [
        new Date(e.expense_date).toLocaleDateString('en-IN'),
        e.category?.name || 'Uncategorized',
        e.note || '',
        e.amount.toString(),
      ]),
    ]

    const csv = rows.map(row => row.map(escape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `expenses_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const hasFilters = startDate || endDate || categoryFilter || searchQuery

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Expenses</h1>
          <p className="text-sm text-gray-500">
            {filteredExpenses.length} of {expenses.length} expenses · {formatINR(total)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <Download size={14} />
            Export
          </Button>
          <Button
            variant={showFilters ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={14} />
            Filter
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search by note, category, or amount..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-dark-card border border-dark-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
        />
      </div>

      {showFilters && (
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      )}

      {loading ? <ListSkeleton count={8} /> : <ExpenseList expenses={filteredExpenses} onUpdate={refetch} />}
    </div>
  )
}
