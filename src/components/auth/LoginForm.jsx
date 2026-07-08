import { useState } from 'react'
import { Mail, LogIn } from 'lucide-react'
import PasswordInput from './PasswordInput.jsx'
import TermsModal from './TermsModal.jsx'
import { authApi, storeSession } from '../../utils/api.js'

export default function LoginForm({ onLoggedIn, onNeedsPasswordChange, onSwitchToRegister, onSwitchToForgot }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('メールアドレスとパスワードを入力してください')
      return
    }
    if (!agreed) {
      setError('利用規約・免責事項への同意が必要です')
      return
    }

    setLoading(true)
    try {
      const res = await authApi.login(email.trim(), password, agreed)
      if (!res.success) {
        setError(res.error || 'ログインに失敗しました')
        return
      }
      if (res.mustChangePassword) {
        onNeedsPasswordChange(email.trim(), password)
        return
      }
      storeSession(res.sessionToken, res.nickname, email.trim())
      onLoggedIn({ sessionToken: res.sessionToken, nickname: res.nickname, email: email.trim() })
    } catch (err) {
      setError('通信に失敗しました。時間をおいて再度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs text-ink-500 dark:text-ink-400 mb-1">
          <Mail size={12} className="inline mr-1" />メールアドレス（ログインID）
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="username"
          className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 dark:border-ink-600
            bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-100
            focus:outline-none focus:ring-2 focus:ring-indigo-500
            placeholder:text-ink-300 dark:placeholder:text-ink-600"
        />
      </div>

      <div>
        <label className="block text-xs text-ink-500 dark:text-ink-400 mb-1">パスワード</label>
        <PasswordInput
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="パスワード"
          autoComplete="current-password"
        />
        <button
          type="button"
          onClick={onSwitchToForgot}
          className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline mt-1"
        >
          パスワードをお忘れの方はこちら
        </button>
      </div>

      <label className="flex items-start gap-2 text-[11px] text-ink-500 dark:text-ink-400 leading-relaxed">
        <input
          type="checkbox"
          checked={agreed}
          onChange={e => setAgreed(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          <button type="button" onClick={() => setShowTerms(true)} className="text-indigo-600 dark:text-indigo-400 hover:underline">
            利用規約・免責事項
          </button>
          （無料のボランティア運営であること、トラブルは利用者間で解決すること等を含みます）に同意します
        </span>
      </label>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium
          bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white transition-colors"
      >
        <LogIn size={14} />
        {loading ? 'ログイン中…' : 'ログイン'}
      </button>

      <p className="text-center text-xs text-ink-400 dark:text-ink-500">
        アカウントをお持ちでない方は
        <button type="button" onClick={onSwitchToRegister} className="text-indigo-600 dark:text-indigo-400 hover:underline ml-1">
          新規登録
        </button>
      </p>

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </form>
  )
}
