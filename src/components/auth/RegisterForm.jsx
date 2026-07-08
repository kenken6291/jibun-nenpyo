import { useState } from 'react'
import { Mail, User, UserPlus } from 'lucide-react'
import { authApi } from '../../utils/api.js'

export default function RegisterForm({ onRegistered, onSwitchToLogin }) {
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !nickname.trim() || !fullName.trim()) {
      setError('すべての項目を入力してください')
      return
    }

    setLoading(true)
    try {
      const res = await authApi.register(email.trim(), nickname.trim(), fullName.trim())
      if (!res.success) {
        setError(res.error || '登録に失敗しました')
        return
      }
      setDone(true)
    } catch (err) {
      setError('通信に失敗しました。時間をおいて再度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="text-3xl">📩</div>
        <p className="text-sm text-ink-700 dark:text-ink-200 leading-relaxed">
          ご登録のメールアドレス宛に仮パスワードをお送りしました。<br />
          メールをご確認のうえ、ログイン画面から仮パスワードでログインしてください。
        </p>
        <button
          onClick={onSwitchToLogin}
          className="w-full py-2.5 rounded-lg text-sm font-medium bg-indigo-700 hover:bg-indigo-800 text-white transition-colors"
        >
          ログイン画面へ
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs text-ink-500 dark:text-ink-400 mb-1">
          <Mail size={12} className="inline mr-1" />メールアドレス（ログインIDになります）
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 dark:border-ink-600
            bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-100
            focus:outline-none focus:ring-2 focus:ring-indigo-500
            placeholder:text-ink-300 dark:placeholder:text-ink-600"
        />
      </div>

      <div>
        <label className="block text-xs text-ink-500 dark:text-ink-400 mb-1">
          <User size={12} className="inline mr-1" />ニックネーム（年表上の表示名）
        </label>
        <input
          type="text"
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          placeholder="たろう"
          className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 dark:border-ink-600
            bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-100
            focus:outline-none focus:ring-2 focus:ring-indigo-500
            placeholder:text-ink-300 dark:placeholder:text-ink-600"
        />
      </div>

      <div>
        <label className="block text-xs text-ink-500 dark:text-ink-400 mb-1">氏名</label>
        <input
          type="text"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          placeholder="山田 太郎"
          className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 dark:border-ink-600
            bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-100
            focus:outline-none focus:ring-2 focus:ring-indigo-500
            placeholder:text-ink-300 dark:placeholder:text-ink-600"
        />
        <p className="text-[11px] text-ink-400 dark:text-ink-500 mt-1">
          氏名は年表には表示されません（表示にはニックネームが使われます）
        </p>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium
          bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white transition-colors"
      >
        <UserPlus size={14} />
        {loading ? '送信中…' : '登録する（仮パスワードをメール送信）'}
      </button>

      <p className="text-center text-xs text-ink-400 dark:text-ink-500">
        すでにアカウントをお持ちの方は
        <button type="button" onClick={onSwitchToLogin} className="text-indigo-600 dark:text-indigo-400 hover:underline ml-1">
          ログイン
        </button>
      </p>
    </form>
  )
}
