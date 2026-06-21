import { useState } from 'react'
import { Plus } from 'lucide-react'
import { ExpenseModal } from './ExpenseModal'

export function FAB() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-5 bottom-20 sm:bottom-8 z-50 w-14 h-14 bg-accent hover:bg-accent-hover rounded-full flex items-center justify-center shadow-lg shadow-accent/25 transition-all duration-200 active:scale-90"
      >
        <Plus size={24} className="text-white" />
      </button>
      <ExpenseModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
