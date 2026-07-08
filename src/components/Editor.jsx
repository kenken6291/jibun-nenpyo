import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, User, Calendar, Video, Image as ImageIcon, X, Loader2 } from 'lucide-react'
import { parseVideoUrl } from '../utils/video.js'
import VideoEmbed from './VideoEmbed.jsx'
import { resizeImageFile, formatFileSize } from '../utils/imageResize.js'
import { dataApi } from '../utils/api.js'

const MONTHS = ['', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

const emptyForm = {
  year: new Date().getFullYear(),
  month: '',
  title: '',
  category: 'general',
  memo: '',
  videoUrl: '',
  photoUrl: '',
}

export default function Editor({ profile, entries, editingEntry, onProfileChange, onAdd, onUpdate, onDelete, onEdit, categories, session }) {
  const [form, setForm] = useState(emptyForm)
  const [profileOpen, setProfileOpen] = useState(!profile.birthYear)
  const [errors, setErrors] = useState({})
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')

  useEffect(() => {
    if (editingEntry) {
      setForm({
        year: editingEntry.year,
        month: editingEntry.month || '',
        title: editingEntry.title,
        category: editingEntry.category,
        memo: editingEntry.memo || '',
        videoUrl: editingEntry.videoUrl || '',
        photoUrl: editingEntry.photoUrl || '',
      })
    }
  }, [editingEntry])

  const validate = () => {
    const e = {}
    if (!form.year || isNaN(form.year) || form.year < 1900 || form.year > 2100) {
      e.year = '有効な年を入力してください'
    }
    if (!form.title.trim()) e.title = '出来事を入力してください'
    if (form.videoUrl.trim() && !parseVideoUrl(form.videoUrl.trim())) {
      e.videoUrl = '有効なURLを入力してください'
    }
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
      videoUrl: form.videoUrl.trim(),
      photoUrl: form.photoUrl,
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
    setPhotoError('')
  }

  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return

    setPhotoError('')
    setPhotoUploading(true)
    try {
      const resized = await resizeImageFile(file)
      const res = await dataApi.uploadPhoto(
        session.sessionToken,
        file.name.replace(/\.[^.]+$/, '') + '.jpg',
        resized.mimeType,
        resized.base64Data
      )
      if (!res.success) {
        setPhotoError(res.error || 'アップロードに失敗しました')
        return
      }
      setForm(f => ({ ...f, photoUrl: res.photoUrl }))
    } catch (err) {
      setPhotoError(err.message || '画像の処理に失敗しました')
    } finally {
      setPhotoUploading(false)
    }
  }

  const handleRemovePhoto = () => {
    setForm(f => ({ ...f, photoUrl: '' }))
  }

  const calcAge = (year) => {
    if (!profile.birthYear || !year) return null
    const age = parseInt(year) - parseInt(profile.birthYear)
    return age >= 0 ? age : null
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-ink-900">
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
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 h-[38px]"
              >
                <option value="">—</option>
                {MONTHS.slice(1).map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            {profile.birthYear && form.year && calcAge(form.year) !== null && (
              <div className="self-end pb-1.5">
                <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium whitespace-nowrap">
                  {calcAge(form.year)}歳
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-ink-500 dark:text-ink-400 mb-1">カテゴリ</label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(categories).map(([key, cat]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, category: key }))}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    form.category === key
                      ? `${cat.color} text-white border-transparent`
                      : 'bg-white dark:bg-ink-800 text-ink-600 dark:text-ink-300 border-ink-200 dark:border-ink-600 hover:border-ink-400'
                  }`}
                >
                  <span>{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-ink-500 dark:text-ink-400 mb-1">出来事 *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="例：大学入学、結婚、転職…"
              className={`w-full px-3 py-2 text-sm rounded-lg border
                bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-100
                focus:outline-none focus:ring-2 focus:ring-indigo-500
                placeholder:text-ink-300 dark:placeholder:text-ink-600
                ${errors.title ? 'border-red-400' : 'border-ink-200 dark:border-ink-600'}`}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
            />
            {errors.title && <p className="text-xs text-red-500 mt-0.5">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-xs text-ink-500 dark:text-ink-400 mb-1">
              <Video size={12} className="inline mr-1" />動画URL（任意）
            </label>
            <input
              type="url"
              value={form.videoUrl}
              onChange={e => setForm(f => ({ ...f, videoUrl: e.target.value }))}
              placeholder="https://www.youtube.com/watch?v=..."
              className={`w-full px-3 py-2 text-sm rounded-lg border
                bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-100
                focus:outline-none focus:ring-2 focus:ring-indigo-500
                placeholder:text-ink-300 dark:placeholder:text-ink-600
                ${errors.videoUrl ? 'border-red-400' : 'border-ink-200 dark:border-ink-600'}`}
            />
            {errors.videoUrl && <p className="text-xs text-red-500 mt-0.5">{errors.videoUrl}</p>}
            <p className="text-[11px] text-ink-400 dark:text-ink-500 mt-1 leading-relaxed">
              YouTube・X・Instagram・TikTokなどの動画リンクを貼ると、年表からその時の映像を振り返れます
            </p>
            {form.videoUrl.trim() && parseVideoUrl(form.videoUrl.trim()) && (
              <div className="mt-2 max-w-[220px]">
                <VideoEmbed videoUrl={form.videoUrl.trim()} compact />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-ink-500 dark:text-ink-400 mb-1">
              <ImageIcon size={12} className="inline mr-1" />写真（任意）
            </label>

            {form.photoUrl ? (
              <div className="relative inline-block">
                <img
                  src={form.photoUrl}
                  alt="アップロードした写真"
                  className="max-w-[220px] max-h-[160px] rounded-lg border border-ink-200 dark:border-ink-600 object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  title="写真を削除"
                  className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center rounded-full
                    bg-ink-800 text-white shadow hover:bg-red-600 transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 w-full px-3 py-3 text-sm rounded-lg border border-dashed
                border-ink-300 dark:border-ink-600 text-ink-400 dark:text-ink-500
                hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer">
                {photoUploading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    アップロード中…
                  </>
                ) : (
                  <>
                    <ImageIcon size={14} />
                    写真を選択（自動で縮小してアップロードされます）
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={photoUploading}
                  onChange={handlePhotoSelect}
                />
              </label>
            )}
            {photoError && <p className="text-xs text-red-500 mt-1">{photoError}</p>}
            <p className="text-[11px] text-ink-400 dark:text-ink-500 mt-1 leading-relaxed">
              大きい写真も自動で縮小してからGoogleドライブに保存されます
            </p>
          </div>

          <div>
            <label className="block text-xs text-ink-500 dark:text-ink-400 mb-1">詳細メモ（任意）</label>
            <textarea
              value={form.memo}
              onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
              placeholder="その時の気持ちや状況を記録…"
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 dark:border-ink-600
                bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-100
                focus:outline-none focus:ring-2 focus:ring-indigo-500
                placeholder:text-ink-300 dark:placeholder:text-ink-600 resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium
                bg-indigo-700 hover:bg-indigo-800 text-white transition-colors"
            >
              {editingEntry ? (
                <>
                  <Pencil size={14} />
                  更新
                </>
              ) : (
                <>
                  <Plus size={14} />
                  追加
                </>
              )}
            </button>
            {editingEntry && (
              <button
                onClick={handleCancel}
                className="px-4 py-2.5 rounded-lg text-sm text-ink-600 dark:text-ink-300
                  border border-ink-200 dark:border-ink-600 hover:bg-ink-50 dark:hover:bg-ink-800 transition-colors"
              >
                キャンセル
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4">
            <div className="text-4xl mb-3 opacity-30">📖</div>
            <p className="text-sm text-ink-400 dark:text-ink-500">
              出来事を追加すると、ここにリストが表示されます
            </p>
          </div>
        ) : (
          <div className="divide-y divide-ink-100 dark:divide-ink-700/50">
            {entries.map(entry => {
              const cat = categories[entry.category] || categories.general
              const age = calcAge(entry.year)
              return (
                <div
                  key={entry.id}
                  className={`group flex items-start gap-3 px-4 py-3 hover:bg-ink-50 dark:hover:bg-ink-800/40 transition-colors ${
                    editingEntry?.id === entry.id ? 'bg-indigo-50 dark:bg-indigo-950/30' : ''
                  }`}
                >
                  <div
                    className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${cat.color} ring-2 ${cat.color.replace('bg-', 'ring-')}/20`}
                    style={{ marginTop: '6px' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-ink-400 dark:text-ink-500 font-display">
                        {entry.year}{entry.month ? `年${entry.month}月` : '年'}
                      </span>
                      {age !== null && (
                        <span className="text-[10px] text-ink-300 dark:text-ink-600">({age}歳)</span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${cat.lightBg} ${cat.darkBg} ${cat.textColor}`}>
                        {cat.icon} {cat.label}
                      </span>
                      {entry.videoUrl && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-ink-100 dark:bg-ink-700 text-ink-500 dark:text-ink-300 flex items-center gap-0.5">
                          <Video size={9} /> 動画
                        </span>
                      )}
                      {entry.photoUrl && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-ink-100 dark:bg-ink-700 text-ink-500 dark:text-ink-300 flex items-center gap-0.5">
                          <ImageIcon size={9} /> 写真
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-ink-800 dark:text-ink-200 font-medium leading-snug mt-0.5">
                      {entry.title}
                    </p>
                    {entry.memo && (
                      <p className="text-xs text-ink-400 dark:text-ink-500 mt-0.5 leading-relaxed line-clamp-2">
                        {entry.memo}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => onEdit(entry)}
                      className="p-1.5 rounded-md text-ink-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
                      title="編集"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => confirm('この出来事を削除しますか？') && onDelete(entry.id)}
                      className="p-1.5 rounded-md text-ink-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                      title="削除"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
