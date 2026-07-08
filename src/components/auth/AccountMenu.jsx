import { useState } from 'react'
import { UserCircle, LogOut, Pencil, Check, X } from 'lucide-react'
import { authApi } from '../../utils/api.js'

export default function AccountMenu({ session, onLogout, onNicknameChanged }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [nicknameInput, setNicknameInput] = useState(session.nickname)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSaveNickname = async () => {
    setError('')
    if (!nicknameInput.trim()) {
      setError('ニックネームを入力してください')
      return
    }
    setSaving(true)
    try {
      const res = await authApi.updateNickname(session.sessionToken, nicknameInput.trim())
      if (!res.success) {
        setError(res.error || '変更に失敗しました')
        return
      }
      onNicknameChanged(res.nickname)
      // localStorage の保存セッション情報も更新
      const stored = JSON.parse(localStorage.getItem('jibun-nenpyo-session') || '{}')
      localStorage.setItem('jibun-nenpyo-session', JSON.stringify({ ...stored, nickname: res.nickname }))
      setEditing(false)
    } catch {
      setError('通信に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-ink-600 dark:text-ink-300
          hover:bg-ink-100 dark:hover:bg-ink-700 rounded-lg transition-colors"
      >
        <UserCircle size={15} />
        <span className="hidden sm:inline max-w-[100px] truncate">{session.nickname}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-ink-800 border border-ink-200 dark:border-ink-600
          rounded-xl shadow-lg z-40 p-3">
          {!editing ? (
            <>
              <p className="text-xs text-ink-400 dark:text-ink-500 mb-2">{session.email}</p>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-ink-800 dark:text-ink-100">{session.nickname}</span>
                <button
                  onClick={() => setEditing(true)}
                  className="p-1 rounded-md text-ink-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
                  title="ニックネームを変更"
                >
                  <Pencil size={13} />
                </button>
              </div>
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs
                  text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800
                  hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
              >
                <LogOut size={13} />
                ログアウト
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <label className="block text-[11px] text-ink-500 dark:text-ink-400">ニックネーム</label>
              <input
                type="text"
                value={nicknameInput}
                onChange={e => setNicknameInput(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-ink-200 dark:border-ink-600
                  bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-100
                  focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {error && <p className="text-[11px] text-red-500">{error}</p>}
              <div className="flex gap-1.5">
                <button
                  onClick={handleSaveNickname}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs
                    bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white transition-colors"
                >
                  <Check size={12} />
                  保存
                </button>
                <button
                  onClick={() => { setEditing(false); setNicknameInput(session.nickname); setError('') }}
                  className="px-3 py-1.5 rounded-lg text-xs text-ink-600 dark:text-ink-300
                    border border-ink-200 dark:border-ink-600 hover:bg-ink-50 dark:hover:bg-ink-800 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
