import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { FAB } from '../expenses/FAB'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-dark-bg">
      <Sidebar />
      <main className="sm:ml-64 pb-24 sm:pb-8">
        <Outlet />
      </main>
      <BottomNav />
      <FAB />
    </div>
  )
}
