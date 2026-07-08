import { useState, useEffect, useCallback, useRef } from 'react'
import historicalEvents from './data/historicalEvents.json'
import Editor from './components/Editor.jsx'
import Timeline from './components/Timeline.jsx'
import Header from './components/Header.jsx'
import { dataApi } from './utils/api.js'

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

export default function App({ session, onLogout, onNicknameChanged }) {
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
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')

  const profileLoadedRef = useRef(false)
  const profileSaveTimer = useRef(null)

  // 初回ロード: サーバー（スプレッドシート）から年表データを取得
  const loadData = useCallback(() => {
    setLoading(true)
    setLoadError('')
    dataApi.getData(session.sessionToken)
      .then(res => {
        if (!res.success) {
          setLoadError(res.error || 'データの読み込みに失敗しました')
          return
        }
        profileLoadedRef.current = false
        setProfile({ ...defaultProfile, ...res.profile })
        setEntries(res.entries || [])
        // setProfileの直後にprofileLoadedRefをtrueにして、
        // 読み込み直後のuseEffectによる誤った自動保存を防ぐ
        setTimeout(() => { profileLoadedRef.current = true }, 0)
      })
      .catch(() => setLoadError('通信に失敗しました。時間をおいて再度お試しください。'))
      .finally(() => setLoading(false))
  }, [session.sessionToken])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('jibun-nenpyo-dark', darkMode)
  }, [darkMode])

  // プロフィール変更をデバウンスしてサーバーに保存（読み込み直後の初回発火は無視）
  useEffect(() => {
    if (!profileLoadedRef.current) return
    if (profileSaveTimer.current) clearTimeout(profileSaveTimer.current)
    profileSaveTimer.current = setTimeout(() => {
      dataApi.updateProfile(session.sessionToken, profile).catch(() => {
        setSaveError('プロフィールの保存に失敗しました')
      })
    }, 800)
    return () => clearTimeout(profileSaveTimer.current)
  }, [profile, session.sessionToken])

  const addEntry = useCallback(async (entry) => {
    setSaveError('')
    try {
      const res = await dataApi.addEntry(session.sessionToken, entry)
      if (!res.success) {
        setSaveError(res.error || '追加に失敗しました')
        return
      }
      setEntries(prev => [...prev, res.entry].sort((a, b) => a.year - b.year || (a.month || 0) - (b.month || 0)))
    } catch {
      setSaveError('通信に失敗しました。時間をおいて再度お試しください。')
    }
  }, [session.sessionToken])

  const updateEntry = useCallback(async (id, updatedEntry) => {
    setSaveError('')
    try {
      const res = await dataApi.updateEntry(session.sessionToken, id, updatedEntry)
      if (!res.success) {
        setSaveError(res.error || '更新に失敗しました')
        return
      }
      setEntries(prev =>
        prev.map(e => e.id === id ? res.entry : e)
          .sort((a, b) => a.year - b.year || (a.month || 0) - (b.month || 0))
      )
      setEditingEntry(null)
    } catch {
      setSaveError('通信に失敗しました。時間をおいて再度お試しください。')
    }
  }, [session.sessionToken])

  const deleteEntry = useCallback(async (id) => {
    setSaveError('')
    try {
      const res = await dataApi.deleteEntry(session.sessionToken, id)
      if (!res.success) {
        setSaveError(res.error || '削除に失敗しました')
        return
      }
      setEntries(prev => prev.filter(e => e.id !== id))
      setEditingEntry(prev => (prev?.id === id ? null : prev))
    } catch {
      setSaveError('通信に失敗しました。時間をおいて再度お試しください。')
    }
  }, [])

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

  // JSONファイルから読み込んだ内容は、クラウド（スプレッドシート）に
  // 新しいデータとして追加保存されます（既存データは上書きされません）
  const importJSON = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (data.profile) {
          const merged = { ...defaultProfile, ...data.profile }
          setProfile(merged)
          await dataApi.updateProfile(session.sessionToken, merged)
        }
        if (Array.isArray(data.entries) && data.entries.length > 0) {
          for (const entry of data.entries) {
            const res = await dataApi.addEntry(session.sessionToken, entry)
            if (res.success) {
              setEntries(prev => [...prev, res.entry].sort((a, b) => a.year - b.year || (a.month || 0) - (b.month || 0)))
            }
          }
        }
        alert('データを読み込みました（既存のデータに追加されました）')
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
          session={session}
          onLogout={onLogout}
          onNicknameChanged={onNicknameChanged}
        />

        {saveError && (
          <div className="no-print bg-red-50 dark:bg-red-950 border-b border-red-200 dark:border-red-800 px-4 py-1.5 text-xs text-red-600 dark:text-red-300 flex items-center justify-between">
            <span>{saveError}</span>
            <button onClick={() => setSaveError('')} className="text-red-400 hover:text-red-600">×</button>
          </div>
        )}

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
            年表プレビュー
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-ink-400 dark:text-ink-500">年表データを読み込み中…</p>
          </div>
        ) : loadError ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-sm text-red-500">{loadError}</p>
            <button
              onClick={loadData}
              className="px-4 py-2 rounded-lg text-sm bg-indigo-700 hover:bg-indigo-800 text-white transition-colors"
            >
              再読み込み
            </button>
          </div>
        ) : (
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
                session={session}
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
        )}
      </div>
    </div>
  )
}
