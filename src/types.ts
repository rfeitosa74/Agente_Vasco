export type VideoStatus = 'Assistir' | 'Assistido' | 'Revisar' | 'Arquivado'

export interface VideoItem {
  id: string
  title: string
  channel: string
  category: string
  subcategory: string
  status: VideoStatus
  rating: number
  priority: 'Alta' | 'Média' | 'Baixa'
  language: string
  type: string
  url: string
  insight: string
  testIdea: string
  notes: string
  watchedAt: string
  durationMinutes: number
  createdAt: string
  tags: string[]
}
