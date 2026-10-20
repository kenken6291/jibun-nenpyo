import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Lock, Loader2, Check } from 'lucide-react'
import { shareApi } from '../../utils/api.js'

// 閲覧者に見せる項目の定義
export const SHARE_FIELDS = [
  { key: 'name', label: '名前', group: 'profile' },
  { key: 'age', label: '年齢', group: 'profile', note: '年齢表示のため生まれ年が伝わります' },
  { key: 'month', label: '出来事の月', group: 'entry' },
  { key: 'memo', label: 'メモ', group: 'entry' },
  { key: 'photo', label: '写真', group: 'entry' },
  { key: 'video', label: '動画', group: 'entry' },
  { key: 'link', label: 'ホームページ', group: 'entry' },
  { key: 'pdf', label: 'PDF', group: 'entry' },
]

const DEFAULT_FIELDS = {
  name: true, age: true, month: true, memo: true, photo: true, video: true, link: true, pdf: true,
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function newShare(categoryKeys) {
  return {
    viewerEmail: '',
    label: '',
    fields: { ...DEFAULT_FIELDS },
    categories: [...categoryKeys],
  }
}

function Toggle({ checked, onChange, children }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] border transition-colors
        ${checked
          ? 'bg-indigo-700 border-indigo-700 text-white'
          : 'bg-white dark:bg-ink-900 border-ink-200 dark:border-ink-600 text-ink-400 dark:text-ink-500 line-through'
        }`}
    >
      {checked && <Check size={10} />}
      {children}
    </button>
  )
}

export default function ShareSettingsModal({ session, categories, onClose, onSaved }) {
  const categoryKeys = Object.keys(categories)
  const [shares, setShares] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    shareApi.getShareSettings(session.sessionToken)
      .then(res => {
        if (!res.success) {
          setError(res.error || '共有設定の読み込みに失敗しました')
          return
        }
        setShares((res.shares || []).map(s => ({
          viewerEmail: s.viewerEmail || '',
          label: s.label || '',
          fields: { ...DEFAULT_FIELDS, ...(s.fields || {}), birthday: false },
          categories: Array.isArray(s.categories) ? s.categories : [...categoryKeys],
        })))
      })
      .catch(() => setError('通信に失敗しました。時間をおいて再度お試しください。'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.sessionToken])

  const updateShare = (idx, patch) => {
    setMessage('')
    setShares(prev => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
  }

  const toggleField = (idx, key) => {
    const s = shares[idx]
    updateShare(idx, { fields: { ...s.fields, [key]: !s.fields[key] } })
  }

  const toggleCategory = (idx, key) => {
    const s = shares[idx]
    const has = s.categories.includes(key)
    updateShare(idx, { categories: has ? s.categories.filter(c => c !== key) : [...s.categories, key] })
  }

  const removeShare = (idx) => {
    setMessage('')
    setShares(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSave = async () => {
    setError('')
    setMessage('')
    const myEmail = (session.email || '').trim().toLowerCase()
    const seen = new Set()
    for (const s of shares) {
      const email = s.viewerEmail.trim().toLowerCase()
      if (!EMAIL_RE.test(email)) {
        setError(`メールアドレスの形式が正しくありません：${s.viewerEmail || '（未入力）'}`)
        return
      }
      if (email === myEmail) {
        setError('自分自身のメールアドレスは指定できません')
        return
      }
      if (seen.has(email)) {
        setError(`同じメールアドレスが重複しています：${email}`)
        return
      }
      seen.add(email)
      if (s.categories.length === 0) {
        setError(`${email} に見せるカテゴリーを1つ以上選んでください`)
        return
      }
    }

    setSaving(true)
    try {
      const payload = shares.map(s => ({ ...s, viewerEmail: s.viewerEmail.trim().toLowerCase(), label: s.label.trim() }))
      const res = await shareApi.saveShareSettings(session.sessionToken, payload)
      if (!res.success) {
        setError(res.error || '保存に失敗しました')
        return
      }
      setShares(prev => prev.map(s => ({ ...s, viewerEmail: s.viewerEmail.trim().toLowerCase() })))
      setMessage('共有設定を保存しました')
      onSaved?.(payload)
    } catch {
      setError('通信に失敗しました。時間をおいて再度お試しください。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-ink-800 rounded-2xl shadow-xl border border-ink-200 dark:border-ink-600"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-ink-200 dark:border-ink-700">
          <div className="flex items-center gap-2">
            <Lock size={15} className="text-indigo-700 dark:text-indigo-400" />
            <h2 className="text-sm font-semibold text-ink-800 dark:text-ink-100">年表の共有設定</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-700">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll px-4 py-3 space-y-3">
          <p className="text-[11px] leading-relaxed text-ink-500 dark:text-ink-400">
            指定した<strong>登録会員</strong>（相手が会員登録に使ったメールアドレス）だけが、ログイン後に
            あなたの年表を閲覧できます。閲覧者ごとに見せる項目を選べます。閲覧専用で、編集はできません。
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-8 text-ink-400">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : (
            <>
              {shares.length === 0 && (
                <p className="text-xs text-center text-ink-400 dark:text-ink-500 py-4">
                  まだ誰にも共有していません（年表は自分だけが見られます）
                </p>
              )}

              {shares.map((s, idx) => (
                <div key={idx} className="rounded-xl border border-ink-200 dark:border-ink-600 p-3 space-y-2.5 bg-ink-50/50 dark:bg-ink-900/40">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-1.5">
                      <input
                        type="email"
                        inputMode="email"
                        autoComplete="off"
                        placeholder="閲覧者のメールアドレス（会員登録済み）"
                        value={s.viewerEmail}
                        onChange={e => updateShare(idx, { viewerEmail: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-ink-200 dark:border-ink-600
                          bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        type="text"
                        placeholder="呼び名（自分用メモ・例：長男、同級生の山田さん）"
                        value={s.label}
                        maxLength={30}
                        onChange={e => updateShare(idx, { label: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-ink-200 dark:border-ink-600
                          bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <button
                      onClick={() => removeShare(idx)}
                      title="この閲覧者の共有をやめる"
                      className="p-1.5 rounded-md text-ink-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold text-ink-500 dark:text-ink-400 mb-1">見せるプロフィール</p>
                    <div className="flex flex-wrap gap-1.5">
                      {SHARE_FIELDS.filter(f => f.group === 'profile').map(f => (
                        <Toggle key={f.key} checked={!!s.fields[f.key]} onChange={() => toggleField(idx, f.key)}>
                          {f.label}
                        </Toggle>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold text-ink-500 dark:text-ink-400 mb-1">見せる出来事の内容（年・タイトルは常に表示）</p>
                    <div className="flex flex-wrap gap-1.5">
                      {SHARE_FIELDS.filter(f => f.group === 'entry').map(f => (
                        <Toggle key={f.key} checked={!!s.fields[f.key]} onChange={() => toggleField(idx, f.key)}>
                          {f.label}
                        </Toggle>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold text-ink-500 dark:text-ink-400 mb-1">見せるカテゴリー</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(categories).map(([key, cat]) => (
                        <Toggle key={key} checked={s.categories.includes(key)} onChange={() => toggleCategory(idx, key)}>
                          {cat.icon} {cat.label}
                        </Toggle>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={() => { setMessage(''); setShares(prev => [...prev, newShare(categoryKeys)]) }}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs border border-dashed
                  border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950"
              >
                <Plus size={13} />
                閲覧者を追加
              </button>
            </>
          )}
        </div>

        <div className="px-4 py-3 border-t border-ink-200 dark:border-ink-700 space-y-2">
          {error && <p className="text-[11px] text-red-500">{error}</p>}
          {message && <p className="text-[11px] text-emerald-700 dark:text-emerald-400">{message}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={loading || saving}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm
                bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white transition-colors"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              保存する
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-ink-600 dark:text-ink-300 border border-ink-200 dark:border-ink-600
                hover:bg-ink-50 dark:hover:bg-ink-700"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
