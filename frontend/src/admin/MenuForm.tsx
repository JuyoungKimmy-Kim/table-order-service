import { useState } from 'react'
import Modal from '../components/Modal'
import type { Category, Menu } from '../types'

export interface MenuFormValues {
  category_id: number
  name: string
  price: number
  description?: string
  image_url?: string
}

interface MenuFormProps {
  categories: Category[]
  initial?: Menu
  onSubmit: (values: MenuFormValues) => Promise<void>
  onClose: () => void
}

// US-A7: 메뉴 등록/수정 폼. 검증: name 필수, price 정수 ≥ 0 (BR-6).
export default function MenuForm({ categories, initial, onSubmit, onClose }: MenuFormProps) {
  const [categoryId, setCategoryId] = useState<number>(initial?.category_id ?? categories[0]?.id ?? 0)
  const [name, setName] = useState(initial?.name ?? '')
  const [price, setPrice] = useState<string>(initial ? String(initial.price) : '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('메뉴명을 입력하세요.')
    const priceNum = Number(price)
    if (!Number.isInteger(priceNum) || priceNum < 0) return setError('가격은 0 이상의 정수여야 합니다.')
    if (!categoryId) return setError('카테고리를 선택하세요.')

    setSaving(true)
    try {
      await onSubmit({
        category_id: categoryId,
        name: name.trim(),
        price: priceNum,
        description: description.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={initial ? '메뉴 수정' : '메뉴 등록'} testId="menu-form">
      <form onSubmit={submit}>
        <div className="mb-3">
          <label className="label">카테고리</label>
          <select
            className="input"
            value={categoryId}
            onChange={(e) => setCategoryId(Number(e.target.value))}
            data-testid="menu-form-category"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="label">메뉴명</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} data-testid="menu-form-name" />
        </div>
        <div className="mb-3">
          <label className="label">가격 (원)</label>
          <input
            className="input"
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            data-testid="menu-form-price"
          />
        </div>
        <div className="mb-3">
          <label className="label">설명 (선택)</label>
          <textarea
            className="input"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            data-testid="menu-form-description"
          />
        </div>
        <div className="mb-4">
          <label className="label">이미지 URL (선택)</label>
          <input
            className="input"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            data-testid="menu-form-image"
          />
        </div>

        {error && (
          <p className="mb-3 text-sm text-red-600" data-testid="menu-form-error">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            취소
          </button>
          <button type="submit" className="btn-primary" disabled={saving} data-testid="menu-form-submit">
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
