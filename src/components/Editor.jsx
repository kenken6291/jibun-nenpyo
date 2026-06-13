import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, User, Calendar } from 'lucide-react'

const MONTHS = ['', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

const emptyForm = {
  year: new Date().getFullYear(),
  month: '',
  title: '',
  category: 'general',
  memo: '',
}

export default function Editor({ profile, entries, editingEntry, onProfileChange, onAdd, onUpdate, onDelete, onEdit, categories }) {
  const [form, setForm] = useState(emptyForm)
  const [profileOpen, setProfileOpen] = useState(!profile.birthYear)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (editingEntry) {
      setForm({
        year: editingEntry.year,
        month: editingEntry.month || '',
        title: editingEntry.title,
        category: editingEntry.category,
        memo: editingEntry.memo || '',
      })
    }
  }, [editingEntry])

  const validate = () => {
    const e = {}
    if (!form.year || isNaN(form.year) || form.year < 1900 || form.year > 2100) {
      e.year = '有効な年を入力してください'
    }
    if (!form.title.trim()) e.title = '出来事を入力してください'
    return e
  }

  const handleSubmit = () => {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length > 0) return

    const entryData = {
      year: parseInt(form.year),
      month: form.month ? parseInt(form.month) : null,
      title: form.title.trim(),
      category: form.category,
      memo: form.memo.trim(),
    }

    if (editingEntry) {
      onUpdate(editingEntry.id, entryData)
    } else {
      onAdd(entryData)
    }
    setForm(emptyForm)
    setErrors({})
  }

  const handleCancel = () => {
    onEdit(null)
    setForm(emptyForm)
    setErrors({})
  }

  const calcAge = (year) => {
    if (!profile.birthYear || !year) return null
    const age = parseInt(year) - parseInt(profile.birthYear)
    return age >= 0 ? age : null
  }

  return (
    <div className="flex flex-col bg-white dark:bg-ink-900 min-h-full">
      <div className="border-b border-ink-100 dark:border-ink-700">
        <button
          onClick={() => setProfileOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium
            text-ink-700 dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <User size={15} className="text-ink-400" />
            <span>プロフィール設定</span>
            {profile.name && (
              <span className="text-xs text-ink-400 font-normal">— {profile.name}</span>
            )}
          </div>
          {profileOpen ? <ChevronUp size={15} className="text-ink-400" /> : <ChevronDown size={15} className="text-ink-400" />}
        </button>

        {profileOpen && (
          <div className="px-4 pb-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-ink-500 dark:text-ink-400 mb-1">お名前（任意）</label>
              <input
                type="text"
                value={profile.name}
                onChange={e => onProfileChange({ ...profile, name: e.target.value })}
                placeholder="山田 太郎"
                className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 dark:border-ink-600
                  bg-washi dark:bg-ink-800 text-ink-900 dark:text-ink-100
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400
                  placeholder:text-ink-300 dark:placeholder:text-ink-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-500 dark:text-ink-400 mb-1">
                <Calendar size={12} className="inline mr-1" />生年月日（年齢自動計算に使用）
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={profile.birthYear}
                  onChange={e => onProfileChange({ ...profile, birthYear: e.target.value })}
                  placeholder="1980"
                  className="w-24 px-3 py-2 text-sm rounded-lg border border-ink-200 dark:border-ink-600
                    bg-washi dark:bg-ink-800 text-ink-900 dark:text-ink-100
                    focus:outline-none focus:ring-2 focus:ring-indigo-500
                    placeholder:text-ink-300 dark:placeholder:text-ink-600"
                />
                <span className="self-center text-sm text-ink-500">年</span>
                <select
                  value={profile.birthMonth}
                  onChange={e => onProfileChange({ ...profile, birthMonth: e.target.value })}
                  className="px-2 py-2 text-sm rounded-lg border border-ink-200 dark:border-ink-600
                    bg-washi dark:bg-ink-800 text-ink-900 dark:text-ink-100
                    focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">月</option>
                  {MONTHS.slice(1).map((m, i) => (
                    <option key={i + 1} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-4 border-b border-ink-100 dark:border-ink-700 bg-ink-50/50 dark:bg-ink-800/40">
        <h2 className="text-xs font-semibold text-ink-500 dark:text-ink-400 uppercase tracking-wider mb-3">
          {editingEntry ? '📝 出来事を編集' : '＋ 出来事を追加'}
        </h2>

        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-ink-500 dark:text-ink-400 mb-1">年 *</label>
              <input
                type="number"
                value={form.year}
                onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                placeholder="2000"
                className={`w-full px-3 py-2 text-sm rounded-lg border
                  bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-100
                  focus:outline-none focus:ring-2 focus:ring-indigo-500
                  placeholder:text-ink-300 dark:placeholder:text-ink-600
                  ${errors.year ? 'border-red-400' : 'border-ink-200 dark:border-ink-600'}`}
              />
              {errors.year && <p className="text-xs text-red-500 mt-0.5">{errors.year}</p>}
            </div>
            <div>
              <label className="block text-xs text-ink-500 dark:text-ink-400 mb-1">月（任意）</label>
              <select
                value={form.month}
                onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
                className="px-2 py-2 text-sm rounded-lg border border-ink-200 dark:border-ink-600
                  bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-100
                  focus:outline-none focus:ring-2