import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AuthGate from './components/auth/AuthGate.jsx'
import './index.css'

// LINE・メール等で届いた閲覧用リンク（?view=ID）を、ログイン前に退避しておく。
// 会員登録やパスワード変更をはさんでも、ログイン後にその年表を自動で開くため。
const PENDING_VIEW_KEY = 'jibun-nenpyo-pending-view'
try {
  const params = new URLSearchParams(window.location.search)
  const viewId = params.get('view')
  if (viewId && /^[0-9a-f]{32}$/.test(viewId)) {
    localStorage.setItem(PENDING_VIEW_KEY, viewId)
  }
  if (params.has('view')) {
    params.delete('view')
    const qs = params.toString()
    window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash)
  }
} catch {
  // URLの解析に失敗しても通常どおり起動する
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthGate>
      {({ session, onLogout, onNicknameChanged }) => (
        <App session={session} onLogout={onLogout} onNicknameChanged={onNicknameChanged} />
      )}
    </AuthGate>
  </React.StrictMode>,
)
