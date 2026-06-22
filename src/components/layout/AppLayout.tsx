import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { FAB } from '../expenses/FAB'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-dark-bg relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full mix-blend-normal blur-[128px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-normal blur-[128px] animate-pulse" style={{ animationDelay: '700ms' }} />
        <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-fuchsia-500/8 rounded-full mix-blend-normal blur-[96px] animate-pulse" style={{ animationDelay: '1400ms' }} />
      </div>
      <Sidebar />
      <main className="sm:ml-64 pb-24 sm:pb-8 relative z-10">
        <Outlet />
      </main>
      <BottomNav />
      <FAB />
    </div>
  )
}
