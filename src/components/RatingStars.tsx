import { Star } from 'lucide-react'

interface RatingStarsProps {
  rating: number
  onChange?: (value: number) => void
  readOnly?: boolean
}

export function RatingStars({ rating, onChange, readOnly = false }: RatingStarsProps) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => !readOnly && onChange?.(item)}
          className="transition hover:scale-110"
          disabled={readOnly}
        >
          <Star className={`h-4 w-4 ${item <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
        </button>
      ))}
    </div>
  )
}
