import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { APP_VERSION, BUILD_TIME } from '../config.js'
import { systemApi } from '../utils/api.js'

// サーバー版数は1回だけ取得して使い回す
let serverVersionPromise = null
function fetchServerVersion() {
  if (!serverVersionPromise) {
    serverVersionPromise = systemApi.getVersion()
      .then(res => (res && res.success ? res : { version: null, oldServer: true }))
      .catch(() => {
        serverVersionPromise = null // 通信失敗時は次回再取得
        return { version: null, error: true }
      })
  }
  return serverVersionPromise
}

/**
 * バージョン情報表示
 * - 画面（フロント）のバージョンとビルド日時
 * - サーバー（GAS）のバージョン
 * - 両者が食い違う場合は再デプロイ忘れの警告
 */
export default function VersionInfo({ className = '' }) {
  const [server, setServer] = useState(null) // null=読み込み中

  useEffect(() => {
    let alive = true
    fetchServerVersion().then(r => { if (alive) setServer(r) })
    return () => { alive = false }
  }, [])

  let serverLabel = '確認中…'
  if (server) {
    if (server.version) serverLabel = `v${server.version}`
    else if (server.oldServer) serverLabel = '旧版（v4.0以前）'
    else serverLabel = '取得できません'
  }

  const mismatch = server && !server.error && server.version !== APP_VERSION

  return (
    <div className={`text-[10px] leading-relaxed text-ink-400 dark:text-ink-500 ${className}`}>
      <div>
        画面 v{APP_VERSION}
        {BUILD_TIME && <span className="ml-1">（{BUILD_TIME} ビルド）</span>}
      </div>
      <div>サーバー {serverLabel}</div>
      {mismatch && (
        <div className="mt-1 flex items-start gap-1 text-amber-700 dark:text-amber-400">
          <AlertTriangle size={11} className="flex-shrink-0 mt-px" />
          <span>画面とサーバーのバージョンが一致しません。GASの再デプロイ（新バージョン）をご確認ください。</span>
        </div>
      )}
    </div>
  )
}
