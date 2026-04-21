import type { VideoItem } from './types'

export const seedVideos: VideoItem[] = [
  {
    id: '1',
    title: 'How AI Agents Actually Work',
    channel: 'AI Explained',
    category: 'IA',
    subcategory: 'Agents',
    status: 'Assistido',
    rating: 5,
    priority: 'Alta',
    language: 'EN',
    type: 'Análise',
    url: 'https://youtube.com/watch?v=demo1',
    insight: 'Arquitetura com planner, executor e memória.',
    testIdea: 'Criar um agente para pesquisa automática de notícias técnicas.',
    notes: 'Bom vídeo para visão estratégica e linguagem clara.',
    watchedAt: '2026-03-05',
    durationMinutes: 18,
    createdAt: '2026-03-05T14:00:00Z',
    tags: ['agentes', 'arquitetura', 'ia']
  },
  {
    id: '2',
    title: 'Build AI Workflows with Python',
    channel: 'Tech With Tim',
    category: 'Programação',
    subcategory: 'Python',
    status: 'Assistir',
    rating: 0,
    priority: 'Média',
    language: 'EN',
    type: 'Tutorial',
    url: 'https://youtube.com/watch?v=demo2',
    insight: '',
    testIdea: '',
    notes: 'Aparenta ser útil para automações futuras.',
    watchedAt: '',
    durationMinutes: 42,
    createdAt: '2026-03-05T15:00:00Z',
    tags: ['python', 'workflow']
  },
  {
    id: '3',
    title: 'Panorama das IAs em 2026',
    channel: 'Canal Tech BR',
    category: 'IA',
    subcategory: 'Ferramentas',
    status: 'Revisar',
    rating: 4,
    priority: 'Baixa',
    language: 'PT-BR',
    type: 'Panorama',
    url: 'https://youtube.com/watch?v=demo3',
    insight: 'Comparativo útil entre ferramentas generativas.',
    testIdea: 'Testar um fluxo de resumo automatizado com vídeos longos.',
    notes: 'Bom para visão de mercado e seleção rápida de ferramentas.',
    watchedAt: '2026-03-01',
    durationMinutes: 27,
    createdAt: '2026-03-02T10:00:00Z',
    tags: ['ferramentas', 'benchmark']
  }
]

export const categoryOptions = ['IA', 'Programação', 'Tecnologia', 'Produtividade', 'Cursos', 'Papers', 'Outros']
export const statusOptions = ['Assistir', 'Assistido', 'Revisar', 'Arquivado']
export const priorityOptions = ['Alta', 'Média', 'Baixa']
export const languageOptions = ['PT-BR', 'EN', 'ES', 'Outro']
export const typeOptions = ['Tutorial', 'Análise', 'Panorama', 'Curso', 'Review', 'Paper', 'Outro']
