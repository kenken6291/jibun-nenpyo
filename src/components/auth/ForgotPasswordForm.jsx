import { useState } from 'react'
import { Mail, KeyRound } from 'lucide-react'
import { authApi } from '../../utils/api.js'

export default function ForgotPasswordForm({ onSwitchToLogin }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!email.trim()) {
      setError('メールアドレスを入力してください')
      return
    }

    setLoading(true)
    try {
      const res = await authApi.forgotPassword(email.trim())
      setMessage(res.message || 'ご登録のメールアドレス宛にご案内をお送りしました。')
    } catch (err) {
      setError('通信に失敗しました。時間をおいて再度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-ink-500 dark:text-ink-400 leading-relaxed">
        ご登録のメールアドレスを入力してください。新しい仮パスワードをお送りします。
        ログイン後、忘れずに新しいパスワードへ変更してください。
      </p>

      <div>
        <label className="block text-xs text-ink-500 dark:text-ink-400 mb-1">
          <Mail size={12} className="inline mr-1" />メールアドレス
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 dark:border-ink-600
            bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-100
            focus:outline-none focus:ring-2 focus:ring-indigo-500
            placeholder:text-ink-300 dark:placeholder:text-ink-600"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {message && <p className="text-xs text-emerald-600 dark:text-emerald-400 leading-relaxed">{message}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium
          bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white transition-colors"
      >
        <KeyRound size={14} />
        {loading ? '送信中…' : '仮パスワードを再発行する'}
      </button>

      <p className="text-center text-xs text-ink-400 dark:text-ink-500">
        <button type="button" onClick={onSwitchToLogin} className="text-indigo-600 dark:text-indigo-400 hover:underline">
          ログイン画面に戻る
        </button>
      </p>
    </form>
  )
}
