import { useState } from 'react'
import { Youtube, Video, ExternalLink, PlayCircle, Instagram, Facebook } from 'lucide-react'
import { parseVideoUrl } from '../utils/video.js'

const PLATFORM_STYLE = {
  x: { icon: Video, color: 'text-ink-900 dark:text-ink-50', bg: 'bg-ink-100 dark:bg-ink-700' },
  instagram: { icon: Instagram, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-950' },
  tiktok: { icon: Video, color: 'text-ink-900 dark:text-ink-50', bg: 'bg-ink-100 dark:bg-ink-700' },
  facebook: { icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950' },
  other: { icon: ExternalLink, color: 'text-ink-500 dark:text-ink-400', bg: 'bg-ink-100 dark:bg-ink-700' },
}

// YouTube: サムネイル＋再生ボタンをクリックすると埋め込みプレーヤーに切り替わる
function YouTubeEmbed({ embedId, compact }) {
  const [playing, setPlaying] = useState(false)

  if (playing) {
    return (
      <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
        <iframe
          src={`https://www.youtube.com/embed/${embedId}?autoplay=1`}
          title="YouTube video"
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group relative w-full rounded-lg overflow-hidden bg-ink-900 block"
      style={{ aspectRatio: '16/9' }}
      title="動画を再生"
    >
      <img
        src={`https://img.youtube.com/vi/${embedId}/hqdefault.jpg`}
        alt="動画サムネイル"
        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
        loading="lazy"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
        <PlayCircle size={compact ? 32 : 44} className="text-white drop-shadow-lg" />
      </div>
      <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 text-[10px] font-medium text-white bg-black/60 px-1.5 py-0.5 rounded">
        <Youtube size={10} /> YouTube
      </span>
    </button>
  )
}

// YouTube以外: リンクカード（新しいタブで開く）
function LinkCard({ platform, url, label }) {
  const cfg = PLATFORM_STYLE[platform] || PLATFORM_STYLE.other
  const Icon = cfg.icon
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-ink-200 dark:border-ink-600
        ${cfg.bg} hover:opacity-80 transition-opacity no-underline`}
    >
      <Icon size={14} className={`flex-shrink-0 ${cfg.color}`} />
      <span className="text-xs font-medium text-ink-600 dark:text-ink-300 truncate flex-1">
        {label}で動画を見る
      </span>
      <ExternalLink size={12} className="text-ink-400 flex-shrink-0" />
    </a>
  )
}

export default function VideoEmbed({ videoUrl, compact = false }) {
  const parsed = parseVideoUrl(videoUrl)
  if (!parsed) return null

  if (parsed.platform === 'youtube') {
    return <YouTubeEmbed embedId={parsed.embedId} compact={compact} />
  }
  return <LinkCard platform={parsed.platform} url={parsed.url} label={parsed.label} />
}
