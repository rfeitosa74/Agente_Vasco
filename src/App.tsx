import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Brain, CheckCircle2, Clock3, Download, Library, Search, Sparkles, Youtube, ShieldCheck, Database, ArrowUpDown } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { seedVideos, categoryOptions, statusOptions } from './data'
import { exportVideosAsCSV, loadVideos, saveVideos, uid } from './lib'
import { supabase } from './supabase'
import { StatCard } from './components/StatCard'
import { VideoForm } from './components/VideoForm'
import { VideoCard } from './components/VideoCard'
import { Toast } from './components/Toast'
import type { VideoItem, VideoStatus } from './types'

const COLORS = ['#2563eb', '#0f172a', '#94a3b8', '#38bdf8']
const PRIORITY_ORDER: Record<string, number> = { Alta: 3, Média: 2, Baixa: 1 }

type SortBy = 'newest' | 'oldest' | 'rating' | 'priority' | 'duration'

const emptyForm: Omit<VideoItem, 'id' | 'createdAt'> = {
  title: '', channel: '', category: 'IA', subcategory: '', status: 'Assistir',
  rating: 0, priority: 'Média', language: 'PT-BR', type: 'Tutorial',
  url: '', insight: '', testIdea: '', notes: '', watchedAt: '', durationMinutes: 0, tags: []
}

export default function App() {
  const [videos, setVideos] = useState<VideoItem[]>(seedVideos)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todos')
  const [status, setStatus] = useState('Todos')
  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => { setVideos(loadVideos()) }, [])
  useEffect(() => { saveVideos(videos) }, [videos])

  const showToast = (msg: string) => setToast(msg)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const result = videos.filter((video) => {
      const matchQuery = !q || [video.title, video.channel, video.subcategory, video.insight, video.notes, video.tags.join(' ')].join(' ').toLowerCase().includes(q)
      const matchCategory = category === 'Todos' || video.category === category
      const matchStatus = status === 'Todos' || video.status === status
      return matchQuery && matchCategory && matchStatus
    })
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'oldest':   return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'rating':   return b.rating - a.rating
        case 'priority': return (PRIORITY_ORDER[b.priority] ?? 0) - (PRIORITY_ORDER[a.priority] ?? 0)
        case 'duration': return b.durationMinutes - a.durationMinutes
        default:         return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })
  }, [videos, query, category, status, sortBy])

  const stats = useMemo(() => {
    const total = videos.length
    const watched = videos.filter((v) => v.status === 'Assistido').length
    const toWatch = videos.filter((v) => v.status === 'Assistir').length
    const reviewing = videos.filter((v) => v.status === 'Revisar').length
    const archived = videos.filter((v) => v.status === 'Arquivado').length
    const rated = videos.filter((v) => v.rating > 0)
    const avg = rated.length ? (rated.reduce((sum, v) => sum + v.rating, 0) / rated.length).toFixed(1) : '0.0'
    const minutes = videos.reduce((sum, v) => sum + (v.durationMinutes || 0), 0)
    return { total, watched, toWatch, reviewing, archived, avg, minutes }
  }, [videos])

  const pieData = [
    { name: 'Assistidos', value: stats.watched },
    { name: 'Na fila', value: stats.toWatch },
    { name: 'Revisar', value: stats.reviewing },
    { name: 'Arquivado', value: stats.archived },
  ]

  const categoryData = categoryOptions
    .map((item) => ({ name: item, total: videos.filter((v) => v.category === item).length }))
    .filter((item) => item.total > 0)

  const topInsights = useMemo(() => videos.filter((v) => v.insight).slice(0, 4), [videos])

  const startEdit = (id: string) => {
    const video = videos.find((v) => v.id === id)
    if (!video) return
    const { id: _id, createdAt: _createdAt, ...rest } = video
    setForm(rest)
    setEditingId(id)
    document.getElementById('form-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  const saveVideo = () => {
    if (!form.title.trim() || !form.channel.trim()) return
    if (editingId) {
      setVideos((prev) => prev.map((v) => v.id === editingId ? { ...v, ...form } : v))
      setEditingId(null)
      showToast('Vídeo atualizado com sucesso!')
    } else {
      const item: VideoItem = { id: uid(), createdAt: new Date().toISOString(), ...form }
      setVideos((prev) => [item, ...prev])
      showToast('Vídeo adicionado!')
    }
    setForm(emptyForm)
  }

  const resetForm = () => { setForm(emptyForm); setEditingId(null) }
  const deleteVideo = (id: string) => { setVideos((prev) => prev.filter((v) => v.id !== id)); showToast('Vídeo excluído.') }
  const updateStatus = (id: string, nextStatus: VideoStatus) =>
    setVideos((prev) => prev.map((v) => v.id === id ? { ...v, status: nextStatus } : v))

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="hero-bg border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm text-slate-700 backdrop-blur">
                <Sparkles className="h-4 w-4" /> Versão robusta para crescimento real
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 lg:text-6xl">
                Seu hub pessoal para organizar vídeos, cursos e referências de IA.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Interface moderna, filtros rápidos, dashboards visuais, exportação CSV e base preparada para sincronização com Supabase.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button className="btn-primary" onClick={() => exportVideosAsCSV(videos)}>
                  <Download className="mr-2 inline h-4 w-4" /> Exportar CSV
                </button>
                <a href="#catalogo" className="btn-secondary">Explorar catálogo</a>
              </div>
            </div>
            <div className="rounded-[32px] border border-white/70 bg-white/85 p-6 shadow-soft backdrop-blur">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="panel-muted">
                  <p className="text-sm text-slate-500">Itens cadastrados</p>
                  <p className="mt-1 text-3xl font-semibold">{stats.total}</p>
                </div>
                <div className="panel-muted">
                  <p className="text-sm text-slate-500">Horas mapeadas</p>
                  <p className="mt-1 text-3xl font-semibold">{(stats.minutes / 60).toFixed(1)}h</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                {videos.slice(0, 3).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.channel} • {item.category}/{item.subcategory || 'Geral'}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Acervo" value={stats.total} helper="Itens no hub" icon={Library} />
          <StatCard label="Assistidos" value={stats.watched} helper="Já processados" icon={CheckCircle2} />
          <StatCard label="Pendentes" value={stats.toWatch} helper="Fila de estudo" icon={Clock3} />
          <StatCard label="Revisar" value={stats.reviewing} helper="Voltar com calma" icon={Brain} />
          <StatCard label="Nota média" value={stats.avg} helper="Qualidade percebida" icon={BarChart3} />
          <StatCard label="Supabase" value={supabase ? 'Conectado' : 'Pronto'} helper="Camada preparada" icon={Database} />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="grid gap-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Visão analítica</h2>
                  <p className="text-sm text-slate-500">Distribuição por status e por categoria.</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-700">
                  <ShieldCheck className="h-4 w-4" /> Pronto para evoluir com login
                </div>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} innerRadius={45}>
                        {pieData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={11} interval={0} angle={-20} textAnchor="end" height={40} />
                      <YAxis allowDecimals={false} fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="total" radius={[8, 8, 0, 0]} fill="#2563eb" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
              <div className="mb-4 flex flex-wrap gap-3">
                <div className="search-wrap flex-1 min-w-[240px]">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input className="search-input" placeholder="Buscar por título, canal, notas, insight ou tags" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
                <select className="field max-w-[160px]" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="Todos">Todas categorias</option>
                  {categoryOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <select className="field max-w-[150px]" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="Todos">Todos status</option>
                  {statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <div className="search-wrap gap-2 min-w-[160px]">
                  <ArrowUpDown className="h-4 w-4 text-slate-400 shrink-0" />
                  <select className="search-input" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
                    <option value="newest">Mais recentes</option>
                    <option value="oldest">Mais antigos</option>
                    <option value="rating">Melhor nota</option>
                    <option value="priority">Prioridade</option>
                    <option value="duration">Duração</option>
                  </select>
                </div>
              </div>
              <div id="catalogo" className="space-y-4">
                {filtered.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                    Nenhum item encontrado com os filtros atuais.
                  </div>
                ) : filtered.map((video) => (
                  <VideoCard key={video.id} video={video} onDelete={deleteVideo} onStatusChange={updateStatus} onEdit={startEdit} />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <VideoForm form={form} setForm={setForm} onSave={saveVideo} onReset={resetForm} isEditing={!!editingId} />
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
              <div className="mb-4 flex items-center gap-2">
                <Youtube className="h-5 w-5 text-red-500" />
                <h3 className="text-lg font-semibold">Insights recentes</h3>
              </div>
              <div className="space-y-3">
                {topInsights.length === 0 ? (
                  <p className="text-sm text-slate-500">Ainda não há insights registrados.</p>
                ) : topInsights.map((item) => (
                  <div key={item.id} className="panel-muted">
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="mt-2 text-sm text-slate-600">{item.insight}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
