import { useState, useEffect, useCallback } from 'react'
import historicalEvents from './data/historicalEvents.json'
import Editor from './components/Editor.jsx'
import Timeline from './components/Timeline.jsx'
import Header from './components/Header.jsx'
import { Sun, Moon, Edit3, BookOpen } from 'lucide-react'

const STORAGE_KEY = 'jibun-nenpyo-data'

const defaultProfile = {
  name: '',
  birthYear: '',
  birthMonth: '',
  birthDay: '',
}

const CATEGORIES = {
  work: { label: '仕事・学業', color: 'bg-indigo-700', textColor: 'text-indigo-700', borderColor: 'border-indigo-700', lightBg: 'bg-indigo-50', darkBg: 'dark:bg-indigo-950', icon: '💼' },
  family: { label: '家族・人間関係', color: 'bg-red-600', textColor: 'text-red-600', borderColor: 'border-red-600', lightBg: 'bg-red-50', darkBg: 'dark:bg-red-950', icon: '🏠' },
  hobby: { label: '趣味・旅行', color: 'bg-emerald-700', textColor: 'text-emerald-700', borderColor: 'border-emerald-700', lightBg: 'bg-emerald-50', darkBg: 'dark:bg-emerald-950', icon: '🎵' },
  general: { label: 'その他・一般', color: 'bg-slate-500', textColor: 'text-slate-500', borderColor: 'border-slate-500', lightBg: 'bg-slate-50', darkBg: 'dark:bg-slate-800', icon: '📌' },
}

export { CATEGORIES, historicalEvents }

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('jibun-nenpyo-dark') === 'true' ||
        window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  const [mobileTab, setMobileTab] = useState('editor') // 'editor' | 'preview'
  
  const [profile, setProfile] = useState(defaultProfile)
  const [entries, setEntries] = useState([])
  const [editingEntry, setEditingEntry] = useState(null)

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        if (data.profile) setProfile(data.profile)
        if (data.entries) setEntries(data.entries)
      }
    } catch (e) {
      console.error('データの読み込みに失敗しました', e)
    }
  }, [])

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile, entries }))
  }, [profile, entries])

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('jibun-nenpyo-dark', darkMode)
  }, [darkMode])

  const addEntry = useCallback((entry) => {
    const newEntry = { ...entry, id: Date.now().toString() }
    setEntries(prev => [...prev, newEntry].sort((a, b) => a.year - b.year || a.month - b.month))
  }, [])

  const updateEntry = useCallback((id, updatedEntry) => {
    setEntries(prev =>
      prev.map(e => e.id === id ? { ...e, ...updatedEntry } : e)
        .sort((a, b) => a.year - b.year || a.month - b.month)
    )
    setEditingEntry(null)
  }, [])

  const deleteEntry = useCallback((id) => {
    setEntries(prev => prev.filter(e => e.id !== id))
    if (editingEntry?.id === id) setEditingEntry(null)
  }, [editingEntry])

  const exportJSON = () => {
    const data = JSON.stringify({ profile, entries }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jibun-nenpyo-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJSON = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (data.profile) setProfile(data.profile)
        if (data.entries) setEntries(data.entries)
        alert('データを読み込みました')
      } catch {
        alert('JSONファイルの読み込みに失敗しました')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'dark' : ''}`}>
      <div className="min-h-screen flex flex-col bg-washi dark:bg-ink-900 text-ink-900 dark:text-ink-100 transition-colors duration-300">
        <Header
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(d => !d)}
          onExport={exportJSON}
          onImport={importJSON}
        />

        {/* Mobile tab bar */}
        <div className="md:hidden flex border-b border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 no-print sticky top-14 z-20">
          <button
            onClick={() => setMobileTab('editor')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
              mobileTab === 'editor'
                ? 'text-indigo-700 dark:text-indigo-400 border-b-2 border-indigo-700 dark:border-indigo-400'
                : 'text-ink-500 dark:text-ink-400'
            }`}
          >
            <Edit3 size={15} />
            編集
          </button>
          <button
            onClick={() => setMobileTab('preview')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
              mobileTab === 'preview'
                ? 'text-indigo-700 dark:text-indigo-400 border-b-2 border-indigo-700 dark:border-indigo-400'
                : 'text-ink-500 dark:text-ink-400'
            }`}
          >
            <BookOpen size={15} />
            年表プレビュー
          </button>
        </div>

        {/* Main layout */}
        <main className="flex-1 flex overflow-hidden">
          {/* Editor panel */}
          <div className={`
            w-full md:w-[42%] md:flex flex-col border-r border-ink-200 dark:border-ink-700
            overflow-y-auto custom-scroll
            ${mobileTab === 'editor' ? 'flex' : 'hidden'}
          `}>
            <Editor
              profile={profile}
              entries={entries}
              editingEntry={editingEntry}
              onProfileChange={setProfile}
              onAdd={addEntry}
              onUpdate={updateEntry}
              onDelete={deleteEntry}
              onEdit={setEditingEntry}
              categories={CATEGORIES}
            />
          </div>

          {/* Timeline preview panel */}
          <div className={`
            w-full md:w-[58%] md:flex flex-col
            overflow-y-auto custom-scroll
            ${mobileTab === 'preview' ? 'flex' : 'hidden'}
          `}>
            <Timeline
              profile={profile}
              entries={entries}
              categories={CATEGORIES}
              historicalEvents={historicalEvents}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
