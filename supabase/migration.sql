-- ============================================
-- Expense Tracker - Supabase Migration Script
-- Run this in the Supabase SQL Editor
-- ============================================

-- 1. Categories table
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text not null default '#6366f1',
  icon text not null default 'tag',
  created_at timestamptz default now() not null
);

alter table public.categories enable row level security;

create policy "Users can view their own categories"
  on public.categories for select
  using (auth.uid() = user_id);

create policy "Users can insert their own categories"
  on public.categories for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own categories"
  on public.categories for update
  using (auth.uid() = user_id);

create policy "Users can delete their own categories"
  on public.categories for delete
  using (auth.uid() = user_id);

-- 2. Expenses table
create table public.expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  amount numeric(12, 2) not null check (amount > 0),
  category_id uuid references public.categories(id) on delete set null,
  note text default '',
  expense_date timestamptz default now() not null,
  created_at timestamptz default now() not null
);

alter table public.expenses enable row level security;

create policy "Users can view their own expenses"
  on public.expenses for select
  using (auth.uid() = user_id);

create policy "Users can insert their own expenses"
  on public.expenses for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own expenses"
  on public.expenses for update
  using (auth.uid() = user_id);

create policy "Users can delete their own expenses"
  on public.expenses for delete
  using (auth.uid() = user_id);

-- 3. Budgets table (monthly overall budget)
create table public.budgets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  month text not null, -- format: YYYY-MM
  total_budget numeric(12, 2) not null check (total_budget >= 0),
  created_at timestamptz default now() not null,
  unique(user_id, month)
);

alter table public.budgets enable row level security;

create policy "Users can view their own budgets"
  on public.budgets for select
  using (auth.uid() = user_id);

create policy "Users can insert their own budgets"
  on public.budgets for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own budgets"
  on public.budgets for update
  using (auth.uid() = user_id);

create policy "Users can delete their own budgets"
  on public.budgets for delete
  using (auth.uid() = user_id);

-- 4. Category budgets table (per-category monthly budget)
create table public.category_budgets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete cascade not null,
  month text not null, -- format: YYYY-MM
  budget_amount numeric(12, 2) not null check (budget_amount >= 0),
  created_at timestamptz default now() not null,
  unique(user_id, category_id, month)
);

alter table public.category_budgets enable row level security;

create policy "Users can view their own category budgets"
  on public.category_budgets for select
  using (auth.uid() = user_id);

create policy "Users can insert their own category budgets"
  on public.category_budgets for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own category budgets"
  on public.category_budgets for update
  using (auth.uid() = user_id);

create policy "Users can delete their own category budgets"
  on public.category_budgets for delete
  using (auth.uid() = user_id);

-- 5. Indexes for performance
create index idx_expenses_user_date on public.expenses(user_id, expense_date desc);
create index idx_expenses_category on public.expenses(category_id);
create index idx_categories_user on public.categories(user_id);
create index idx_budgets_user_month on public.budgets(user_id, month);
create index idx_category_budgets_user_month on public.category_budgets(user_id, month);

-- 6. Function to create default categories for new users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.categories (user_id, name, color, icon) values
    (new.id, 'Food', '#ef4444', 'utensils-crossed'),
    (new.id, 'Transport', '#3b82f6', 'car'),
    (new.id, 'Bills', '#f59e0b', 'receipt'),
    (new.id, 'Entertainment', '#8b5cf6', 'gamepad-2'),
    (new.id, 'Shopping', '#ec4899', 'shopping-bag'),
    (new.id, 'Health', '#10b981', 'heart-pulse'),
    (new.id, 'Other', '#6b7280', 'ellipsis');
  return new;
end;
$$ language plpgsql security definer;

-- 7. Trigger to auto-create categories on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
