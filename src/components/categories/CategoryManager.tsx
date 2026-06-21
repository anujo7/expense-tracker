import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
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
          <h3 className="text-lg font-semibold text-white">Categories</h3>
          <p className="text-sm text-gray-500">Manage your expense categories</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus size={16} />
          Add
        </Button>
      </div>

      <div className="space-y-2">
        {categories.map(cat => (
          <div
            key={cat.id}
            className="flex items-center gap-3 p-3.5 bg-dark-card rounded-xl border border-dark-border group"
          >
            <CategoryIcon icon={cat.icon} color={cat.color} size={18} />
            <span className="text-sm font-medium text-white flex-1">{cat.name}</span>
            <div
              className="w-4 h-4 rounded-full border border-dark-border"
              style={{ backgroundColor: cat.color }}
            />
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setEditingCategory(cat)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-dark-hover transition-colors"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => setDeletingCategory(cat)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
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
