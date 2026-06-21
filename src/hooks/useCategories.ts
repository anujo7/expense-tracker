import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { Category, CategoryFormData } from '../types'

export function useCategories() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCategories = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (!error && data) setCategories(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const addCategory = async (formData: CategoryFormData) => {
    if (!user) return { error: new Error('Not authenticated') }
    const { data, error } = await supabase
      .from('categories')
      .insert({ ...formData, user_id: user.id })
      .select()
      .single()

    if (!error && data) setCategories(prev => [...prev, data])
    return { data, error }
  }

  const updateCategory = async (id: string, formData: Partial<CategoryFormData>) => {
    const { data, error } = await supabase
      .from('categories')
      .update(formData)
      .eq('id', id)
      .select()
      .single()

    if (!error && data) {
      setCategories(prev => prev.map(c => (c.id === id ? data : c)))
    }
    return { data, error }
  }

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (!error) setCategories(prev => prev.filter(c => c.id !== id))
    return { error }
  }

  return { categories, loading, addCategory, updateCategory, deleteCategory, refetch: fetchCategories }
}
