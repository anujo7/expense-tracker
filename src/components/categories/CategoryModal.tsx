import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { CategoryIcon } from '../ui/CategoryIcon'
import { useCategories } from '../../hooks/useCategories'
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../../utils/constants'
import type { Category, CategoryFormData } from '../../types'

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  category?: Category | null
}

export function CategoryModal({ isOpen, onClose, category }: CategoryModalProps) {
  const { addCategory, updateCategory } = useCategories()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<CategoryFormData>({
    name: '',
    color: CATEGORY_COLORS[0],
    icon: CATEGORY_ICONS[0],
  })

  useEffect(() => {
    if (isOpen) {
      if (category) {
        setForm({ name: category.name, color: category.color, icon: category.icon })
      } else {
        setForm({ name: '', color: CATEGORY_COLORS[0], icon: CATEGORY_ICONS[0] })
      }
    }
  }, [isOpen, category])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Please enter a category name')
      return
    }

    setLoading(true)
    const { error } = category
      ? await updateCategory(category.id, form)
      : await addCategory(form)

    setLoading(false)
    if (error) {
      toast.error(`Failed to ${category ? 'update' : 'create'} category`)
    } else {
      toast.success(`Category ${category ? 'updated' : 'created'}`)
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={category ? 'Edit Category' : 'New Category'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Name"
          type="text"
          placeholder="e.g. Groceries"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          autoFocus
        />

        <div>
          <label className="block text-sm font-medium text-white/50 mb-2">Color</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setForm(f => ({ ...f, color }))}
                className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                  form.color === color ? 'border-white scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/50 mb-2">Icon</label>
          <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto">
            {CATEGORY_ICONS.map(icon => (
              <button
                key={icon}
                type="button"
                onClick={() => setForm(f => ({ ...f, icon }))}
                className={`flex items-center justify-center p-2 rounded-xl border transition-all duration-200 ${
                  form.icon === icon
                    ? 'border-violet-500/50 bg-violet-500/10'
                    : 'border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                <CategoryIcon icon={icon} color={form.color} size={18} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            {category ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
