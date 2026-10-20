import { useState, useEffect } from 'react'
import { X, Users, Loader2, ChevronRight } from 'lucide-react'
import { shareApi } from '../../utils/api.js'

export default function SharedListModal({ session, onClose, onOpen }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    shareApi.listSharedWithMe(session.sessionToken)
      .then(res => {
        if (!res.success) {
          setError(res.error || '読み込みに失敗しました')
          return
        }
        setItems(res.items || [])
      })
      .catch(() => setError('通信に失敗しました。時間をおいて再度お試しください。'))
      .finally(() => setLoading(false))
  }, [session.sessionToken])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[85vh] flex flex-col bg-white dark:bg-ink-800 rounded-2xl shadow-xl border border-ink-200 dark:border-ink-600"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-ink-200 dark:border-ink-700">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-indigo-700 dark:text-indigo-400" />
            <h2 className="text-sm font-semibold text-ink-800 dark:text-ink-100">共有された年表</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-700">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll p-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-ink-400">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : error ? (
            <p className="text-xs text-red-500 text-center py-4">{error}</p>
          ) : items.length === 0 ? (
            <p className="text-xs text-ink-400 dark:text-ink-500 text-center py-6 leading-relaxed">
              あなたに共有されている年表はまだありません。<br />
              相手の方に、あなたの登録メールアドレス<br />
              （{session.email}）を伝えてください。
            </p>
          ) : (
            items.map(item => (
              <button
                key={item.ownerId}
                onClick={() => onOpen(item)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left
                  border border-ink-200 dark:border-ink-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-800 dark:text-ink-100 truncate">
                    {item.ownerNickname || '会員'}さんの年表
                  </p>
                  <p className="text-[10px] text-ink-400 dark:text-ink-500">
                    {item.entryCount}件の記録
                  </p>
                </div>
                <ChevronRight size={15} className="text-ink-400 flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
