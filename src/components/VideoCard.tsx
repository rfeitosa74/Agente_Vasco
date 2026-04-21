import { useState } from 'react'
import { ExternalLink, Trash2, Clock3, Pencil } from 'lucide-react'
import { RatingStars } from './RatingStars'
import type { VideoItem, VideoStatus } from '../types'
import { statusOptions } from '../data'

interface VideoCardProps {
  video: VideoItem
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: VideoStatus) => void
  onEdit: (id: string) => void
}

export function VideoCard({ video, onDelete, onStatusChange, onEdit }: VideoCardProps) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex-1 min-w-0">
          <div className="mb-2 flex flex-wrap gap-2">
            <span className="badge">{video.category}</span>
            <span className="badge badge-outline">{video.subcategory || 'Geral'}</span>
            <span className="badge badge-outline">{video.priority}</span>
            <span className="badge badge-dark">{video.status}</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900">{video.title}</h3>
          <p className="mt-1 text-sm text-slate-500">{video.channel} • {video.type} • {video.language}</p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="panel-muted">
              <p className="text-sm font-medium text-slate-800">Insight principal</p>
              <p className="mt-2 text-sm text-slate-600">{video.insight || '—'}</p>
            </div>
            <div className="panel-muted">
              <p className="text-sm font-medium text-slate-800">Ideia para testar</p>
              <p className="mt-2 text-sm text-slate-600">{video.testIdea || '—'}</p>
            </div>
          </div>

          {video.notes ? (
            <p className="mt-4 text-sm text-slate-600">
              <span className="font-medium text-slate-800">Notas:</span> {video.notes}
            </p>
          ) : null}
          {video.tags.length ? (
            <p className="mt-3 text-sm text-slate-500">Tags: {video.tags.join(', ')}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4" /> {video.durationMinutes || 0} min
            </div>
            <div>{video.watchedAt || 'Sem data'}</div>
            <div className="flex items-center gap-2">
              <RatingStars rating={video.rating} readOnly />
            </div>
            {video.url ? (
              <a href={video.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-brand-600 hover:underline">
                <ExternalLink className="h-4 w-4" /> Abrir
              </a>
            ) : null}
          </div>
        </div>

        <div className="flex gap-2 xl:w-40 xl:flex-col">
          <select
            className="field"
            value={video.status}
            onChange={(e) => onStatusChange(video.id, e.target.value as VideoStatus)}
          >
            {statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>

          <button className="btn-secondary" onClick={() => onEdit(video.id)}>
            <Pencil className="mr-2 inline h-4 w-4" /> Editar
          </button>

          {confirming ? (
            <div className="flex gap-2 xl:flex-col">
              <button className="btn-danger flex-1" onClick={() => onDelete(video.id)}>
                Confirmar
              </button>
              <button className="btn-secondary flex-1" onClick={() => setConfirming(false)}>
                Cancelar
              </button>
            </div>
          ) : (
            <button className="btn-secondary" onClick={() => setConfirming(true)}>
              <Trash2 className="mr-2 inline h-4 w-4" /> Excluir
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
