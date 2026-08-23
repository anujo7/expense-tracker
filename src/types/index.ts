export interface Category {
  id: string
  user_id: string
  name: string
  color: string
  icon: string
  created_at: string
}

export type PaymentMode = 'online' | 'cash'

export interface Expense {
  id: string
  user_id: string
  amount: number
  category_id: string | null
  note: string
  expense_date: string
  payment_mode: PaymentMode
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
  payment_mode: PaymentMode
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

export interface SplitPerson {
  id: string
  name: string
  email?: string
}

export interface SplitPayment {
  id: string
  from_id: string
  to_id: string
  amount: number
  paid_on: string
}

export type SplitMode = 'equal' | 'exact'

export interface SplitItem {
  id: string
  label: string
  amount: number
  payer_id: string
  mode: SplitMode
  participant_ids: string[]
  exact: Record<string, number>
}

export interface SplitBill {
  id: string
  user_id: string
  title: string
  bill_date: string
  people: SplitPerson[]
  items: SplitItem[]
  payments: SplitPayment[]
  created_at: string
}

export interface SplitBalance {
  person_id: string
  paid: number
  owed: number
  net: number
}

export interface Settlement {
  from_id: string
  to_id: string
  amount: number
  paid: number
  remaining: number
}
