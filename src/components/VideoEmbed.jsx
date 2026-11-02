import { useState } from 'react'
import { Youtube, Video, ExternalLink, PlayCircle, Instagram, Facebook, Maximize2 } from 'lucide-react'
import { parseVideoUrl } from '../utils/video.js'
import MediaViewer from './MediaViewer.jsx'

const PLATFORM_STYLE = {
  x: { icon: Video, color: 'text-ink-900 dark:text-ink-50', bg: 'bg-ink-100 dark:bg-ink-700' },
  instagram: { icon: Instagram, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-950' },
  tiktok: { icon: Video, color: 'text-ink-900 dark:text-ink-50', bg: 'bg-ink-100 dark:bg-ink-700' },
  facebook: { icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950' },
  other: { icon: ExternalLink, color: 'text-ink-500 dark:text-ink-400', bg: 'bg-ink-100 dark:bg-ink-700' },
}

// 拡大ボタン（右上）
function ExpandButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1 text-[10px] font-medium text-white
        bg-black/60 hover:bg-black/80 px-1.5 py-1 rounded transition-colors"
      title="拡大表示"
    >
      <Maximize2 size={11} /> 拡大
    </button>
  )
}

// YouTube: サムネイル＋再生ボタンをクリックすると埋め込みプレーヤーに切り替わる
// 右上の「拡大」で画面いっぱいの大きなプレーヤーで再生
function YouTubeEmbed({ embedId, url, title, compact }) {
  const [playing, setPlaying] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const openExpanded = () => {
    setPlaying(false) // 小さいプレーヤーと二重再生にならないよう停止
    setExpanded(true)
  }

  const viewer = (
    <MediaViewer
      media={expanded ? { type: 'youtube', src: embedId, title: title || 'YouTube', openUrl: url } : null}
      onClose={() => setExpanded(false)}
    />
  )

  if (playing) {
    return (
      <>
        <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
          <iframe
            src={`https://www.youtube.com/embed/${embedId}?autoplay=1`}
            title="YouTube video"
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
          <ExpandButton onClick={openExpanded} />
        </div>
        {viewer}
      </>
    )
  }

  return (
    <>
      <div className="relative w-full rounded-lg overflow-hidden bg-ink-900" style={{ aspectRatio: '16/9' }}>
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 w-full h-full block"
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
        <ExpandButton onClick={openExpanded} />
      </div>
      {viewer}
    </>
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

export default function VideoEmbed({ videoUrl, title, compact = false }) {
  const parsed = parseVideoUrl(videoUrl)
  if (!parsed) return null

  if (parsed.platform === 'youtube') {
    return <YouTubeEmbed embedId={parsed.embedId} url={parsed.url} title={title} compact={compact} />
  }
  return <LinkCard platform={parsed.platform} url={parsed.url} label={parsed.label} />
}
