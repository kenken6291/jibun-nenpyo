import { useState, useEffect } from 'react'
import AuthScreen from './AuthScreen.jsx'
import { authApi, getStoredSession, clearStoredSession } from '../../utils/api.js'

export default function AuthGate({ children }) {
  const [status, setStatus] = useState('checking') // checking | authed | guest
  const [session, setSession] = useState(null)

  useEffect(() => {
    const stored = getStoredSession()
    if (!stored?.sessionToken) {
      setStatus('guest')
      return
    }
    authApi.validateSession(stored.sessionToken)
      .then(res => {
        if (res.valid) {
          setSession({ sessionToken: stored.sessionToken, nickname: res.nickname, email: res.email })
          setStatus('authed')
        } else {
          clearStoredSession()
          setStatus('guest')
        }
      })
      .catch(() => {
        // 通信できない場合は安全側に倒してログイン画面へ
        setStatus('guest')
      })
  }, [])

  const handleAuthenticated = (s) => {
    setSession(s)
    setStatus('authed')
  }

  const handleLogout = () => {
    if (session?.sessionToken) authApi.logout(session.sessionToken).catch(() => {})
    clearStoredSession()
    setSession(null)
    setStatus('guest')
  }

  const handleNicknameChanged = (newNickname) => {
    setSession(s => (s ? { ...s, nickname: newNickname } : s))
  }

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-washi dark:bg-ink-900">
        <p className="text-sm text-ink-400 dark:text-ink-500">読み込み中…</p>
      </div>
    )
  }

  if (status === 'guest') {
    return <AuthScreen onAuthenticated={handleAuthenticated} />
  }

  return children({ session, onLogout: handleLogout, onNicknameChanged: handleNicknameChanged })
}
