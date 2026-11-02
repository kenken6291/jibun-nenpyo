import { useState } from 'react'
import { Globe, FileText, ExternalLink, Maximize2 } from 'lucide-react'
import MediaViewer from './MediaViewer.jsx'

// URLから表示用のドメイン名を取り出す
export function linkHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

/**
 * 出来事に登録されたホームページURL・PDFファイルの表示
 * - 行をクリック → アプリ内で拡大表示
 * - 右端の ↗ → 新しいタブで開く
 */
export default function EntryAttachments({ entry, className = 'mt-2' }) {
  const [media, setMedia] = useState(null)
  const links = Array.isArray(entry.links) ? entry.links : []
  const files = Array.isArray(entry.files) ? entry.files : []
  if (links.length === 0 && files.length === 0) return null

  const rowBase = 'flex min-w-0 items-stretch rounded-lg text-[11px] border border-ink-200 dark:border-ink-600 bg-ink-50/60 dark:bg-ink-900/40 overflow-hidden'

  return (
    <div className={`space-y-1 min-w-0 ${className}`}>
      {links.map((link, i) => (
        <div key={`l${i}`} className={`${rowBase} text-indigo-700 dark:text-indigo-300`}>
          <button
            type="button"
            onClick={() => setMedia({ type: 'url', src: link.url, title: link.title || linkHost(link.url), openUrl: link.url })}
            className="flex flex-1 min-w-0 items-center gap-1.5 px-2 py-1.5 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
            title="拡大表示"
          >
            <Globe size={12} className="flex-shrink-0" />
            <span className="truncate flex-1 min-w-0">{link.title || linkHost(link.url)}</span>
            {link.title && <span className="hidden sm:inline text-[10px] text-ink-400 truncate max-w-[40%] flex-shrink">{linkHost(link.url)}</span>}
            <Maximize2 size={10} className="flex-shrink-0 opacity-60" />
          </button>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center px-2 border-l border-ink-200 dark:border-ink-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
            title="新しいタブで開く"
          >
            <ExternalLink size={10} className="opacity-60" />
          </a>
        </div>
      ))}
      {files.map((file, i) => (
        <div key={`f${i}`} className={`${rowBase} text-vermillion`}>
          <button
            type="button"
            onClick={() => setMedia({ type: 'pdf', src: file.url, title: file.name, openUrl: file.url })}
            className="flex flex-1 min-w-0 items-center gap-1.5 px-2 py-1.5 text-left hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            title="拡大表示"
          >
            <FileText size={12} className="flex-shrink-0" />
            <span className="truncate flex-1 min-w-0">{file.name}</span>
            {file.size > 0 && <span className="text-[10px] text-ink-400 flex-shrink-0">{formatBytes(file.size)}</span>}
            <Maximize2 size={10} className="flex-shrink-0 opacity-60" />
          </button>
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center px-2 border-l border-ink-200 dark:border-ink-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            title="新しいタブで開く"
          >
            <ExternalLink size={10} className="opacity-60" />
          </a>
        </div>
      ))}
      <MediaViewer media={media} onClose={() => setMedia(null)} />
    </div>
  )
}
