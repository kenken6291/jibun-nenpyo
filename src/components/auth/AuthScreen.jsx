import { useState } from 'react'
import LoginForm from './LoginForm.jsx'
import RegisterForm from './RegisterForm.jsx'
import ForgotPasswordForm from './ForgotPasswordForm.jsx'
import ChangePasswordForm from './ChangePasswordForm.jsx'

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login') // login | register | forgot | changePassword
  const [pendingEmail, setPendingEmail] = useState('')
  const [pendingPassword, setPendingPassword] = useState('')

  const handleNeedsPasswordChange = (email, password) => {
    setPendingEmail(email)
    setPendingPassword(password)
    setMode('changePassword')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-washi dark:bg-ink-900 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-xl font-display font-semibold text-ink-800 dark:text-ink-100">
            人生の棚卸し年表
          </h1>
          <p className="text-xs text-ink-400 dark:text-ink-500 mt-1">My Life Chronicle</p>
        </div>

        <div className="bg-white dark:bg-ink-800 rounded-xl border border-ink-200 dark:border-ink-700 shadow-sm p-5">
          {mode === 'login' && (
            <LoginForm
              onLoggedIn={onAuthenticated}
              onNeedsPasswordChange={handleNeedsPasswordChange}
              onSwitchToRegister={() => setMode('register')}
              onSwitchToForgot={() => setMode('forgot')}
            />
          )}
          {mode === 'register' && (
            <RegisterForm onSwitchToLogin={() => setMode('login')} />
          )}
          {mode === 'forgot' && (
            <ForgotPasswordForm onSwitchToLogin={() => setMode('login')} />
          )}
          {mode === 'changePassword' && (
            <ChangePasswordForm
              email={pendingEmail}
              currentPassword={pendingPassword}
              onChanged={onAuthenticated}
            />
          )}
        </div>

        <p className="text-center text-[11px] text-ink-300 dark:text-ink-600 mt-4 leading-relaxed">
          本サービスは無料の個人ボランティア運営です。
        </p>
      </div>
    </div>
  )
}
