import type { Menu } from '../types'
import { won } from '../lib/format'
import { useCart } from '../context/CartContext'

export default function MenuCard({ menu }: { menu: Menu }) {
  const { add } = useCart()
  return (
    <div className="card flex flex-col overflow-hidden" data-testid={`menu-card-${menu.id}`}>
      {menu.image_url ? (
        <img
          src={menu.image_url}
          alt={menu.name}
          className="h-32 w-full object-cover"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
      ) : (
        <div className="flex h-32 w-full items-center justify-center bg-slate-100 text-slate-300">
          <span className="text-3xl">🍽️</span>
        </div>
      )}
      <div className="flex flex-1 flex-col p-3">
        <h3 className="font-semibold">{menu.name}</h3>
        {menu.description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{menu.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="font-bold text-brand-600">{won(menu.price)}</span>
          <button
            className="btn-primary px-3 py-1.5 text-sm"
            onClick={() => add(menu)}
            data-testid={`menu-add-${menu.id}`}
          >
            담기
          </button>
        </div>
      </div>
    </div>
  )
}
