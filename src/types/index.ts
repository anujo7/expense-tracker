export interface Category {
  id: string
  user_id: string
  name: string
  color: string
  icon: string
  created_at: string
}

export interface Expense {
  id: string
  user_id: string
  amount: number
  category_id: string | null
  note: string
  expense_date: string
  created_at: string
  category?: Category | null
}

export interface Budget {
  id: string
  user_id: string
  month: string
  total_budget: number
  created_at: string
}

export interface CategoryBudget {
  id: string
  user_id: string
  category_id: string
  month: string
  budget_amount: number
  created_at: string
}

export interface ExpenseFormData {
  amount: string
  category_id: string
  note: string
  expense_date: string
}

export interface CategoryFormData {
  name: string
  color: string
  icon: string
}

export type TimeRange = 'week' | 'month' | 'year'

export interface SpendingSummary {
  total: number
  byCategory: {
    category: Category
    amount: number
    percentage: number
  }[]
  dailyTrend: {
    date: string
    amount: number
  }[]
  monthlyTrend: {
    month: string
    amount: number
  }[]
}
