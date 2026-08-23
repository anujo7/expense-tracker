-- ============================================
-- Expense Tracker - Split Bills Migration Script
-- Run this SEPARATELY from migration.sql in the Supabase SQL Editor
-- (this is an additive migration, independent of migration.sql)
-- ============================================

-- Split bills table
create table public.split_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  bill_date date default current_date not null,
  people jsonb not null default '[]'::jsonb,
  items jsonb not null default '[]'::jsonb,
  payments jsonb not null default '[]'::jsonb,
  created_at timestamptz default now() not null
);

-- people: [{ "id": "uuid", "name": "text", "email": "text (optional)" }]
-- items:  [{ "id": "uuid", "label": "text", "amount": 123.45, "payer_id": "uuid", "mode": "equal" | "exact", "participant_ids": ["uuid"], "exact": { "uuid": 12.34 } }]

alter table public.split_bills enable row level security;

create policy "Users can view their own split bills"
  on public.split_bills for select
  using (auth.uid() = user_id);

create policy "Users can insert their own split bills"
  on public.split_bills for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own split bills"
  on public.split_bills for update
  using (auth.uid() = user_id);

create policy "Users can delete their own split bills"
  on public.split_bills for delete
  using (auth.uid() = user_id);

create index idx_split_bills_user_date on public.split_bills(user_id, bill_date desc);

-- ============================================
-- Payments (run this if split_bills already exists)
-- payments: [{ "id": "uuid", "from_id": "uuid", "to_id": "uuid", "amount": 500, "paid_on": "2026-08-24" }]
-- ============================================
alter table public.split_bills add column if not exists payments jsonb not null default '[]'::jsonb;
