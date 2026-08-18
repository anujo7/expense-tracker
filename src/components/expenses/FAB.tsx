import { useState } from 'react'
import { Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { ExpenseModal } from './ExpenseModal'

export function FAB() {
  const [isOpen, setIsOpen] = useState(false)
  const { pathname } = useLocation()

  if (pathname.startsWith('/split')) return null

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed right-5 bottom-20 sm:bottom-8 z-50 w-14 h-14 bg-violet-500 hover:bg-violet-400 rounded-full flex items-center justify-center shadow-lg shadow-violet-500/30 transition-colors duration-200"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
      >
        <Plus size={24} className="text-white" />
      </motion.button>
      <ExpenseModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
