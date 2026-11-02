import { useState, useEffect, useMemo } from 'react'
import { X, Plus, Trash2, Lock, Loader2, Check, ChevronDown, Eye, EyeOff } from 'lucide-react'
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

// 閲覧者の関係（一覧の絞り込み・まとめて切り替えに使う）
export const SHARE_GROUPS = [
  { key: 'family', label: '家族', icon: '👪' },
  { key: 'friend', label: '友人', icon: '🤝' },
  { key: 'other', label: 'その他', icon: '👤' },
]
const GROUP_MAP = Object.fromEntries(SHARE_GROUPS.map(g => [g.key, g]))

const DEFAULT_FIELDS = {
  name: true, age: true, month: true, memo: true, photo: true, video: true, link: true, pdf: true,
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

let uidSeq = 0
const nextUid = () => `s${++uidSeq}`

function newShare(categoryKeys, group) {
  return {
    uid: nextUid(),
    persisted: false,
    viewerEmail: '',
    label: '',
    group: group && group !== 'all' ? group : 'family',
    enabled: true,
    lastViewedAt: '',
    fields: { ...DEFAULT_FIELDS },
    categories: [...categoryKeys],
  }
}

function fromServer(s, categoryKeys) {
  return {
    uid: nextUid(),
    persisted: true,
    viewerEmail: s.viewerEmail || '',
    label: s.label || '',
    group: GROUP_MAP[s.group] ? s.group : 'other',
    enabled: s.enabled === undefined ? true : !!s.enabled,
    lastViewedAt: s.lastViewedAt || '',
    fields: { ...DEFAULT_FIELDS, ...(s.fields || {}), birthday: false },
    categories: Array.isArray(s.categories) ? s.categories : [...categoryKeys],
  }
}

// 「保存していない変更」があるかの比較用
function compareKey(s) {
  return JSON.stringify({
    label: s.label.trim(),
    group: s.group,
    enabled: !!s.enabled,
    fields: SHARE_FIELDS.map(f => !!s.fields[f.key]),
    categories: [...s.categories].sort(),
  })
}

function formatViewed(iso) {
  if (!iso) return '未閲覧'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '未閲覧'
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return `今日 ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')} に閲覧`
  const opts = d.getFullYear() === now.getFullYear()
    ? { month: 'numeric', day: 'numeric' }
    : { year: 'numeric', month: 'numeric', day: 'numeric' }
  return `${d.toLocaleDateString('ja-JP', opts)} に閲覧`
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

// 公開／非公開スイッチ
function Switch({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={checked ? '公開中（タップで非公開）' : '非公開（タップで公開）'}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors
        ${checked ? 'bg-emerald-600' : 'bg-ink-300 dark:bg-ink-600'} disabled:opacity-60`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform
          ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
      />
    </button>
  )
}

export default function ShareSettingsModal({ session, categories, onClose, onSaved }) {
  const categoryKeys = Object.keys(categories)
  const [shares, setShares] = useState([])
  const [savedMap, setSavedMap] = useState({}) // email -> compareKey（サーバーに保存済みの状態）
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busyUids, setBusyUids] = useState([])
  const [bulkBusy, setBulkBusy] = useState(false)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const rebuildSaved = (list) => {
    const map = {}
    list.forEach(s => { map[s.viewerEmail] = compareKey(s) })
    setSavedMap(map)
  }

  useEffect(() => {
    shareApi.getShareSettings(session.sessionToken)
      .then(res => {
        if (!res.success) {
          setError(res.error || '共有設定の読み込みに失敗しました')
          return
        }
        const list = (res.shares || []).map(s => fromServer(s, categoryKeys))
        setShares(list)
        rebuildSaved(list)
      })
      .catch(() => setError('通信に失敗しました。時間をおいて再度お試しください。'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.sessionToken])

  // ---- 集計・絞り込み ----
  const counts = useMemo(() => {
    const c = { all: shares.length, enabled: 0 }
    SHARE_GROUPS.forEach(g => { c[g.key] = 0 })
    shares.forEach(s => {
      c[s.group] = (c[s.group] || 0) + 1
      if (s.enabled) c.enabled++
    })
    return c
  }, [shares])

  const visible = filter === 'all' ? shares : shares.filter(s => s.group === filter)

  const isDirty = useMemo(() => {
    if (shares.length !== Object.keys(savedMap).length) return true
    return shares.some(s => !s.persisted || savedMap[s.viewerEmail] !== compareKey(s))
  }, [shares, savedMap])

  // ---- 編集操作（「保存する」で確定） ----
  const updateShare = (uid, patch) => {
    setMessage('')
    setShares(prev => prev.map(s => (s.uid === uid ? { ...s, ...patch } : s)))
  }

  const toggleField = (s, key) => updateShare(s.uid, { fields: { ...s.fields, [key]: !s.fields[key] } })

  const toggleCategory = (s, key) => {
    const has = s.categories.includes(key)
    updateShare(s.uid, { categories: has ? s.categories.filter(c => c !== key) : [...s.categories, key] })
  }

  const removeShare = (s) => {
    const name = s.label || s.viewerEmail || 'この閲覧者'
    if (s.persisted && !window.confirm(`${name} を共有一覧から削除しますか？\n（「保存する」を押すと確定します）\n\n一時的に見せたくないだけなら、削除せずスイッチで「非公開」にできます。`)) return
    setMessage('')
    setShares(prev => prev.filter(x => x.uid !== s.uid))
    if (expanded === s.uid) setExpanded(null)
  }

  const addShare = () => {
    setMessage('')
    setError('')
    const s = newShare(categoryKeys, filter)
    setShares(prev => [...prev, s])
    setExpanded(s.uid)
  }

  // ---- 公開／非公開の即時切り替え ----
  const markSavedEnabled = (emails, enabled) => {
    setSavedMap(prev => {
      const next = { ...prev }
      emails.forEach(email => {
        if (next[email]) next[email] = JSON.stringify({ ...JSON.parse(next[email]), enabled })
      })
      return next
    })
  }

  const toggleEnabled = async (s, enabled) => {
    setError('')
    setMessage('')
    // まだ保存していない閲覧者は、画面上の値だけ変える（「保存する」で反映）
    if (!s.persisted) {
      updateShare(s.uid, { enabled })
      return
    }
    setBusyUids(prev => [...prev, s.uid])
    updateShare(s.uid, { enabled })
    try {
      const res = await shareApi.setShareEnabled(session.sessionToken, [s.viewerEmail], enabled)
      if (!res.success) throw new Error(res.error)
      markSavedEnabled([s.viewerEmail], enabled)
      setMessage(`${s.label || s.viewerEmail} を${enabled ? '公開' : '非公開'}にしました`)
    } catch (e) {
      updateShare(s.uid, { enabled: !enabled })
      setError(e?.message || '切り替えに失敗しました。時間をおいて再度お試しください。')
    } finally {
      setBusyUids(prev => prev.filter(u => u !== s.uid))
    }
  }

  const bulkSet = async (enabled) => {
    setError('')
    setMessage('')
    const targets = visible.filter(s => s.enabled !== enabled)
    const scope = filter === 'all' ? '全員' : `「${GROUP_MAP[filter].label}」の全員`
    if (targets.length === 0) {
      setMessage(`${scope}がすでに${enabled ? '公開中' : '非公開'}です`)
      return
    }
    if (!window.confirm(`${scope}（${targets.length}人）を${enabled ? '公開' : '非公開'}にしますか？`)) return

    const persistedEmails = targets.filter(s => s.persisted).map(s => s.viewerEmail)
    const targetUids = new Set(targets.map(s => s.uid))
    setBulkBusy(true)
    try {
      if (persistedEmails.length > 0) {
        const res = await shareApi.setShareEnabled(session.sessionToken, persistedEmails, enabled)
        if (!res.success) throw new Error(res.error)
        markSavedEnabled(persistedEmails, enabled)
      }
      setShares(prev => prev.map(s => (targetUids.has(s.uid) ? { ...s, enabled } : s)))
      setMessage(`${scope}（${targets.length}人）を${enabled ? '公開' : '非公開'}にしました`)
    } catch (e) {
      setError(e?.message || '切り替えに失敗しました。時間をおいて再度お試しください。')
    } finally {
      setBulkBusy(false)
    }
  }

  // ---- 保存（追加・削除・見せる項目などの変更を確定） ----
  const handleSave = async () => {
    setError('')
    setMessage('')
    const myEmail = (session.email || '').trim().toLowerCase()
    const seen = new Set()
    for (const s of shares) {
      const email = s.viewerEmail.trim().toLowerCase()
      if (!EMAIL_RE.test(email)) {
        setExpanded(s.uid)
        setError(`メールアドレスの形式が正しくありません：${s.viewerEmail || '（未入力）'}`)
        return
      }
      if (email === myEmail) {
        setExpanded(s.uid)
        setError('自分自身のメールアドレスは指定できません')
        return
      }
      if (seen.has(email)) {
        setExpanded(s.uid)
        setError(`同じメールアドレスが重複しています：${email}`)
        return
      }
      seen.add(email)
      if (s.categories.length === 0) {
        setExpanded(s.uid)
        setError(`${email} に見せるカテゴリーを1つ以上選んでください`)
        return
      }
    }

    setSaving(true)
    try {
      const payload = shares.map(s => ({
        viewerEmail: s.viewerEmail.trim().toLowerCase(),
        label: s.label.trim(),
        group: s.group,
        enabled: s.enabled,
        fields: s.fields,
        categories: s.categories,
      }))
      const res = await shareApi.saveShareSettings(session.sessionToken, payload)
      if (!res.success) {
        setError(res.error || '保存に失敗しました')
        return
      }
      const viewedMap = {}
      ;(res.shares || []).forEach(r => { viewedMap[r.viewerEmail] = r.lastViewedAt || '' })
      const next = shares.map(s => {
        const email = s.viewerEmail.trim().toLowerCase()
        return { ...s, viewerEmail: email, label: s.label.trim(), persisted: true, lastViewedAt: viewedMap[email] ?? s.lastViewedAt }
      })
      setShares(next)
      rebuildSaved(next)
      setExpanded(null)
      setMessage('共有設定を保存しました')
      onSaved?.(payload)
    } catch {
      setError('通信に失敗しました。時間をおいて再度お試しください。')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (isDirty && !window.confirm('保存していない変更があります。保存せずに閉じますか？')) return
    onClose()
  }

  const tabs = [{ key: 'all', label: 'すべて', icon: '' }, ...SHARE_GROUPS]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40" onClick={handleClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-ink-800 rounded-2xl shadow-xl border border-ink-200 dark:border-ink-600"
        onClick={e => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-ink-200 dark:border-ink-700">
          <div className="flex items-center gap-2">
            <Lock size={15} className="text-indigo-700 dark:text-indigo-400" />
            <h2 className="text-sm font-semibold text-ink-800 dark:text-ink-100">年表の共有設定</h2>
          </div>
          <button onClick={handleClose} className="p-1 rounded-md text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-700">
            <X size={16} />
          </button>
        </div>

        {/* 概要・絞り込み・一括切り替え */}
        <div className="px-4 pt-3 pb-2 space-y-2 border-b border-ink-100 dark:border-ink-700">
          <p className="text-[11px] leading-relaxed text-ink-500 dark:text-ink-400">
            指定した<strong>登録会員</strong>（家族・友人など）だけが、ログイン後にあなたの年表を閲覧できます。
            スイッチで<strong>公開／非公開</strong>をすぐに切り替えられます（非公開にしても設定は残ります）。
          </p>

          {!loading && (
            <>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                  <Eye size={12} /> 公開中 {counts.enabled}人
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ink-100 dark:bg-ink-700 text-ink-500 dark:text-ink-300">
                  <EyeOff size={12} /> 非公開 {counts.all - counts.enabled}人
                </span>
              </div>

              <div className="flex gap-1 overflow-x-auto">
                {tabs.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setFilter(t.key)}
                    className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] border transition-colors
                      ${filter === t.key
                        ? 'bg-indigo-700 border-indigo-700 text-white'
                        : 'border-ink-200 dark:border-ink-600 text-ink-600 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-700'}`}
                  >
                    {t.icon} {t.label}（{counts[t.key] || 0}）
                  </button>
                ))}
              </div>

              {visible.length > 0 && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => bulkSet(true)}
                    disabled={bulkBusy}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] border
                      border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400
                      hover:bg-emerald-50 dark:hover:bg-emerald-950 disabled:opacity-50"
                  >
                    {bulkBusy ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
                    {filter === 'all' ? '全員' : GROUP_MAP[filter].label}を公開
                  </button>
                  <button
                    onClick={() => bulkSet(false)}
                    disabled={bulkBusy}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] border
                      border-ink-200 dark:border-ink-600 text-ink-600 dark:text-ink-300
                      hover:bg-ink-50 dark:hover:bg-ink-700 disabled:opacity-50"
                  >
                    {bulkBusy ? <Loader2 size={12} className="animate-spin" /> : <EyeOff size={12} />}
                    {filter === 'all' ? '全員' : GROUP_MAP[filter].label}を非公開
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* 一覧 */}
        <div className="flex-1 overflow-y-auto custom-scroll px-4 py-3 space-y-2">
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
              {shares.length > 0 && visible.length === 0 && (
                <p className="text-xs text-center text-ink-400 dark:text-ink-500 py-4">
                  「{GROUP_MAP[filter]?.label}」の閲覧者はまだいません
                </p>
              )}

              {visible.map(s => {
                const open = expanded === s.uid
                const busy = busyUids.includes(s.uid) || bulkBusy
                const g = GROUP_MAP[s.group] || GROUP_MAP.other
                const changed = s.persisted && savedMap[s.viewerEmail] !== compareKey(s)
                return (
                  <div
                    key={s.uid}
                    className={`rounded-xl border transition-colors
                      ${s.enabled
                        ? 'border-emerald-200 dark:border-emerald-900 bg-white dark:bg-ink-900/40'
                        : 'border-ink-200 dark:border-ink-600 bg-ink-50 dark:bg-ink-900/70'}`}
                  >
                    {/* 一覧の1行 */}
                    <div className="flex items-center gap-2.5 px-3 py-2.5">
                      <Switch
                        checked={s.enabled}
                        disabled={busy}
                        label={`${s.label || s.viewerEmail || '新しい閲覧者'}への公開`}
                        onChange={v => toggleEnabled(s, v)}
                      />
                      <button
                        onClick={() => setExpanded(open ? null : s.uid)}
                        className="flex-1 min-w-0 flex items-center gap-2 text-left"
                      >
                        <span className="text-base leading-none" title={g.label}>{g.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium truncate ${s.enabled ? 'text-ink-800 dark:text-ink-100' : 'text-ink-400 dark:text-ink-500'}`}>
                            {s.label || s.viewerEmail || '（新しい閲覧者）'}
                          </p>
                          <p className="text-[10px] text-ink-400 dark:text-ink-500 truncate">
                            {s.label && s.viewerEmail ? `${s.viewerEmail}・` : ''}
                            {s.persisted ? formatViewed(s.lastViewedAt) : '未保存'}
                          </p>
                        </div>
                        <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded
                          ${s.enabled ? 'text-emerald-700 dark:text-emerald-400' : 'text-ink-400 dark:text-ink-500'}`}>
                          {busy && busyUids.includes(s.uid) ? <Loader2 size={11} className="animate-spin" /> : (s.enabled ? '公開中' : '非公開')}
                        </span>
                        {(changed || !s.persisted) && (
                          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500" title="未保存の変更あり" />
                        )}
                        <ChevronDown size={14} className={`flex-shrink-0 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {/* 詳細設定 */}
                    {open && (
                      <div className="px-3 pb-3 pt-1 space-y-2.5 border-t border-ink-100 dark:border-ink-700">
                        {s.persisted ? (
                          <p className="text-[11px] text-ink-500 dark:text-ink-400 pt-1.5">{s.viewerEmail}</p>
                        ) : (
                          <input
                            type="email"
                            inputMode="email"
                            autoComplete="off"
                            placeholder="閲覧者のメールアドレス（会員登録済み）"
                            value={s.viewerEmail}
                            onChange={e => updateShare(s.uid, { viewerEmail: e.target.value })}
                            className="w-full mt-1.5 px-2.5 py-1.5 text-sm rounded-lg border border-ink-200 dark:border-ink-600
                              bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        )}
                        <input
                          type="text"
                          placeholder="呼び名（自分用メモ・例：長男、同級生の山田さん）"
                          value={s.label}
                          maxLength={30}
                          onChange={e => updateShare(s.uid, { label: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-ink-200 dark:border-ink-600
                            bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />

                        <div>
                          <p className="text-[10px] font-semibold text-ink-500 dark:text-ink-400 mb-1">関係</p>
                          <div className="flex flex-wrap gap-1.5">
                            {SHARE_GROUPS.map(gr => (
                              <Toggle key={gr.key} checked={s.group === gr.key} onChange={() => updateShare(s.uid, { group: gr.key })}>
                                {gr.icon} {gr.label}
                              </Toggle>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold text-ink-500 dark:text-ink-400 mb-1">見せるプロフィール</p>
                          <div className="flex flex-wrap gap-1.5">
                            {SHARE_FIELDS.filter(f => f.group === 'profile').map(f => (
                              <Toggle key={f.key} checked={!!s.fields[f.key]} onChange={() => toggleField(s, f.key)}>
                                {f.label}
                              </Toggle>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold text-ink-500 dark:text-ink-400 mb-1">見せる出来事の内容（年・タイトルは常に表示）</p>
                          <div className="flex flex-wrap gap-1.5">
                            {SHARE_FIELDS.filter(f => f.group === 'entry').map(f => (
                              <Toggle key={f.key} checked={!!s.fields[f.key]} onChange={() => toggleField(s, f.key)}>
                                {f.label}
                              </Toggle>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold text-ink-500 dark:text-ink-400 mb-1">見せるカテゴリー</p>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(categories).map(([key, cat]) => (
                              <Toggle key={key} checked={s.categories.includes(key)} onChange={() => toggleCategory(s, key)}>
                                {cat.icon} {cat.label}
                              </Toggle>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => removeShare(s)}
                          className="flex items-center gap-1 text-[11px] text-ink-400 hover:text-red-600"
                        >
                          <Trash2 size={12} />
                          この人を共有一覧から削除
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}

              <button
                onClick={addShare}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs border border-dashed
                  border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950"
              >
                <Plus size={13} />
                閲覧者を追加
              </button>
            </>
          )}
        </div>

        {/* フッター */}
        <div className="px-4 py-3 border-t border-ink-200 dark:border-ink-700 space-y-2">
          {error && <p className="text-[11px] text-red-500">{error}</p>}
          {message && !error && <p className="text-[11px] text-emerald-700 dark:text-emerald-400">{message}</p>}
          {isDirty && !loading && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              追加・削除・見せる項目の変更は「保存する」で確定します
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={loading || saving || !isDirty}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm
                bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white transition-colors"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              保存する
            </button>
            <button
              onClick={handleClose}
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
