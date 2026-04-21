import { seedVideos } from './data'
import type { VideoItem } from './types'

const STORAGE_KEY = 'youtube-knowledge-hub-pro'

export function loadVideos(): VideoItem[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return seedVideos
  try {
    return JSON.parse(raw) as VideoItem[]
  } catch {
    return seedVideos
  }
}

export function saveVideos(videos: VideoItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(videos))
}

export function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function exportVideosAsCSV(rows: VideoItem[]) {
  const headers = [
    'Título', 'Canal', 'Categoria', 'Subcategoria', 'Status', 'Nota', 'Prioridade', 'Idioma', 'Tipo', 'URL',
    'Insight', 'Ideia para testar', 'Notas', 'Data assistido', 'Duração (min)', 'Tags'
  ]
  const csv = [
    headers.join(','),
    ...rows.map((row) => [
      row.title, row.channel, row.category, row.subcategory, row.status, row.rating, row.priority, row.language,
      row.type, row.url, row.insight, row.testIdea, row.notes, row.watchedAt, row.durationMinutes, row.tags.join('|')
    ].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n')

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.setAttribute('download', 'youtube-knowledge-hub-pro.csv')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
