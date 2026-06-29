import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { CategoryIcon } from '../ui/CategoryIcon'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { CategoryModal } from './CategoryModal'
import { useCategories } from '../../hooks/useCategories'
import type { Category } from '../../types'

export function CategoryManager() {
  const { categories, deleteCategory } = useCategories()
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleDelete = async () => {
    if (!deletingCategory) return
    setDeleteLoading(true)
    const { error } = await deleteCategory(deletingCategory.id)
    setDeleteLoading(false)
    if (error) toast.error('Failed to delete category')
    else toast.success('Category deleted')
    setDeletingCategory(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white/90">Categories</h3>
          <p className="text-sm text-white/30">Manage your expense categories</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus size={16} />
          Add
        </Button>
      </div>

      <div className="space-y-2">
        {categories.map((cat, index) => (
          <motion.div
            key={cat.id}
            className="flex items-center gap-3 p-3.5 backdrop-blur-xl bg-white/[0.05] rounded-xl border border-white/[0.09] hover:bg-white/[0.07] transition-all duration-200 group"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.03 }}
          >
            <CategoryIcon icon={cat.icon} color={cat.color} size={18} />
            <span className="text-sm font-medium text-white/90 flex-1">{cat.name}</span>
            <div
              className="w-4 h-4 rounded-full border border-white/[0.08]"
              style={{ backgroundColor: cat.color }}
            />
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setEditingCategory(cat)}
                className="p-1.5 rounded-lg text-white/30 hover:text-white/80 hover:bg-white/[0.05] transition-all duration-200"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => setDeletingCategory(cat)}
                className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <CategoryModal isOpen={showAdd} onClose={() => setShowAdd(false)} />

      <CategoryModal
        isOpen={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        category={editingCategory}
      />

      <ConfirmDialog
        isOpen={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleDelete}
        title="Delete Category"
        message={`Are you sure you want to delete "${deletingCategory?.name}"? Expenses in this category won't be deleted but will become uncategorized.`}
        loading={deleteLoading}
      />
    </div>
  )
}
