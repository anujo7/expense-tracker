# Expense Tracker PWA

A mobile-first personal expense tracking Progressive Web App built with React, TypeScript, Tailwind CSS, and Supabase. Dark mode design inspired by Vercel's aesthetic.

## Features

- **Expense Entry** — Quick-add with floating action button, category selection, notes, and custom date/time
- **Custom Categories** — Create, edit, and delete expense categories with custom colors and icons
- **Spending Summaries** — Weekly, monthly, and yearly views with bar charts and category breakdowns
- **Budget Management** — Set monthly overall and per-category budgets with visual progress tracking
- **Dashboard** — Overview with budget status, recent transactions, and spending totals
- **Authentication** — Secure email/password auth via Supabase
- **Real-time Sync** — Data persists and syncs across devices
- **PWA** — Installable on mobile devices, works offline for cached data
- **INR Currency** — All amounts in Indian Rupees with proper Indian number formatting (₹1,20,000)

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 (dark mode first)
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Charts**: Recharts
- **Icons**: Lucide React
- **PWA**: vite-plugin-pwa
- **Hosting**: Vercel (free tier)

## Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (choose any region, set a database password)
3. Wait for the project to finish setting up

### 2. Run the Database Migration

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Paste the contents of `supabase/migration.sql`
4. Click **Run** to execute the migration
5. This creates all tables, RLS policies, indexes, and a trigger to auto-create default categories for new users

### 3. Get Your API Keys

1. In Supabase dashboard, go to **Settings** > **API**
2. Copy the **Project URL** and **anon/public key**

### 4. Local Development

```bash
# Clone and install
git clone <your-repo-url>
cd expense-app
npm install

# Create environment file
cp .env.example .env

# Edit .env with your Supabase credentials
# VITE_SUPABASE_URL=https://your-project-id.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key

# Start dev server
npm run dev
```

The app will be running at `http://localhost:5173`

### 5. Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add environment variables in the Vercel project settings:
   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — your Supabase anon key
4. Deploy — Vercel auto-detects Vite and configures the build

### 6. Install as PWA on Mobile

1. Open the deployed URL in your mobile browser
2. **iOS (Safari)**: Tap the Share button > "Add to Home Screen"
3. **Android (Chrome)**: Tap the menu > "Install app" or "Add to Home Screen"

## Project Structure

```
src/
├── components/
│   ├── auth/          # Login/signup form
│   ├── budget/        # Budget settings
│   ├── categories/    # Category management
│   ├── dashboard/     # Dashboard cards
│   ├── expenses/      # Expense list, modal, FAB
│   ├── layout/        # App layout, sidebar, bottom nav
│   ├── summary/       # Charts and breakdowns
│   └── ui/            # Reusable UI components
├── hooks/             # Custom React hooks (auth, expenses, categories, budgets)
├── lib/               # Supabase client
├── pages/             # Page components
├── types/             # TypeScript interfaces
└── utils/             # Formatting, constants
```

## Cost

**$0/month** — entirely runs on free tiers:
- Supabase Free: 500MB database, 50K monthly active users, unlimited API requests
- Vercel Free: 100GB bandwidth, automatic deployments
