import { Globe, FileText, ExternalLink } from 'lucide-react'

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

/** 出来事に登録されたホームページURL・PDFファイルの表示 */
export default function EntryAttachments({ entry, className = 'mt-2' }) {
  const links = Array.isArray(entry.links) ? entry.links : []
  const files = Array.isArray(entry.files) ? entry.files : []
  if (links.length === 0 && files.length === 0) return null

  return (
    <div className={`space-y-1 min-w-0 ${className}`}>
      {links.map((link, i) => (
        <a
          key={`l${i}`}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-w-0 items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] border border-ink-200 dark:border-ink-600
            bg-ink-50/60 dark:bg-ink-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
        >
          <Globe size={12} className="flex-shrink-0" />
          <span className="truncate flex-1 min-w-0">{link.title || linkHost(link.url)}</span>
          {link.title && <span className="hidden sm:inline text-[10px] text-ink-400 truncate max-w-[40%] flex-shrink">{linkHost(link.url)}</span>}
          <ExternalLink size={10} className="flex-shrink-0 opacity-60" />
        </a>
      ))}
      {files.map((file, i) => (
        <a
          key={`f${i}`}
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-w-0 items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] border border-ink-200 dark:border-ink-600
            bg-ink-50/60 dark:bg-ink-900/40 text-vermillion hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
        >
          <FileText size={12} className="flex-shrink-0" />
          <span className="truncate flex-1 min-w-0">{file.name}</span>
          {file.size > 0 && <span className="text-[10px] text-ink-400 flex-shrink-0">{formatBytes(file.size)}</span>}
          <ExternalLink size={10} className="flex-shrink-0 opacity-60" />
        </a>
      ))}
    </div>
  )
}
