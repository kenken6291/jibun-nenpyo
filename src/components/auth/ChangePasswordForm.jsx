import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import PasswordInput from './PasswordInput.jsx'
import { authApi, storeSession } from '../../utils/api.js'

export default function ChangePasswordForm({ email, currentPassword, onChanged }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 8) {
      setError('パスワードは8文字以上で設定してください')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('新しいパスワードが一致しません')
      return
    }
    if (newPassword === currentPassword) {
      setError('現在の仮パスワードとは異なるパスワードを設定してください')
      return
    }

    setLoading(true)
    try {
      const res = await authApi.changePassword(email, currentPassword, newPassword)
      if (!res.success) {
        setError(res.error || 'パスワードの変更に失敗しました')
        return
      }
      storeSession(res.sessionToken, res.nickname, email)
      onChanged({ sessionToken: res.sessionToken, nickname: res.nickname, email })
    } catch (err) {
      setError('通信に失敗しました。時間をおいて再度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 px-3 py-2">
        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          初回ログイン、またはパスワード再発行後のため、新しいパスワードの設定が必要です。
        </p>
      </div>

      <div>
        <label className="block text-xs text-ink-500 dark:text-ink-400 mb-1">新しいパスワード（8文字以上）</label>
        <PasswordInput
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          placeholder="新しいパスワード"
          autoComplete="new-password"
        />
      </div>

      <div>
        <label className="block text-xs text-ink-500 dark:text-ink-400 mb-1">新しいパスワード（確認）</label>
        <PasswordInput
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          placeholder="もう一度入力"
          autoComplete="new-password"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium
          bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white transition-colors"
      >
        <ShieldCheck size={14} />
        {loading ? '変更中…' : 'パスワードを変更してログイン'}
      </button>
    </form>
  )
}
