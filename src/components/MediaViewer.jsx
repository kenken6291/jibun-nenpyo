import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, ZoomIn, ZoomOut, RotateCcw, ExternalLink, Maximize2, Info } from 'lucide-react'

// ============================================================
// 拡大表示ビューア（写真・YouTube・PDF・URLリンク先）
// media = { type: 'image' | 'youtube' | 'pdf' | 'url', src, title, openUrl }
// ============================================================

const MIN_SCALE = 1
const MAX_SCALE = 6

// Driveのサムネイル画像は拡大時に高解像度版を読み込む
export function hiResImageUrl(url) {
  if (!url) return url
  if (url.includes('drive.google.com/thumbnail')) {
    return url.replace(/([?&])sz=w\d+/, '$1sz=w2400')
  }
  return url
}

// DriveのPDF URL（/view）を埋め込み用（/preview）に変換
export function pdfPreviewUrl(url) {
  if (!url) return url
  const m = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/)
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`
  return url
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

/** 写真：ホイール・ピンチ・ボタンで拡大縮小、ドラッグで移動、ダブルクリックで切替 */
function ZoomableImage({ src, alt }) {
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [loaded, setLoaded] = useState(false)
  const [fallback, setFallback] = useState(false)
  const pointers = useRef(new Map())
  const pinch = useRef(null)
  const drag = useRef(null)

  const reset = useCallback(() => { setScale(1); setPos({ x: 0, y: 0 }) }, [])

  const zoomTo = useCallback((next) => {
    const s = clamp(next, MIN_SCALE, MAX_SCALE)
    setScale(s)
    if (s === 1) setPos({ x: 0, y: 0 })
  }, [])

  const onWheel = (e) => {
    e.preventDefault()
    zoomTo(scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15))
  }

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale }
      drag.current = null
    } else if (pointers.current.size === 1) {
      drag.current = { x: e.clientX, y: e.clientY, pos }
    }
  }

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      zoomTo(pinch.current.scale * (dist / pinch.current.dist))
    } else if (drag.current && scale > 1) {
      setPos({
        x: drag.current.pos.x + (e.clientX - drag.current.x),
        y: drag.current.pos.y + (e.clientY - drag.current.y),
      })
    }
  }

  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (pointers.current.size === 1) {
      const [p] = [...pointers.current.values()]
      drag.current = { x: p.x, y: p.y, pos }
    } else if (pointers.current.size === 0) {
      drag.current = null
    }
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      <div
        className="relative flex-1 overflow-hidden flex items-center justify-center select-none"
        style={{ touchAction: 'none', cursor: scale > 1 ? 'grab' : 'zoom-in' }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => (scale > 1 ? reset() : zoomTo(2.5))}
      >
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">読み込み中…</div>
        )}
        <img
          src={fallback ? src.original : src.hi}
          alt={alt}
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => { if (!fallback) setFallback(true) }}
          className="max-w-full max-h-full object-contain transition-transform duration-75"
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            opacity: loaded ? 1 : 0,
          }}
        />
      </div>

      {/* ズーム操作 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1.5 rounded-full bg-black/60 text-white shadow-lg">
        <button type="button" onClick={() => zoomTo(scale / 1.4)} className="p-2 rounded-full hover:bg-white/20" title="縮小">
          <ZoomOut size={18} />
        </button>
        <span className="text-xs w-12 text-center tabular-nums">{Math.round(scale * 100)}%</span>
        <button type="button" onClick={() => zoomTo(scale * 1.4)} className="p-2 rounded-full hover:bg-white/20" title="拡大">
          <ZoomIn size={18} />
        </button>
        <button type="button" onClick={reset} className="p-2 rounded-full hover:bg-white/20" title="元の大きさ">
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  )
}

/** 拡大表示モーダル本体 */
export default function MediaViewer({ media, onClose }) {
  // Escキーで閉じる・背面スクロール防止
  useEffect(() => {
    if (!media) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [media, onClose])

  if (!media) return null
  const { type, src, title, openUrl } = media

  let body = null
  if (type === 'image') {
    body = <ZoomableImage src={{ hi: hiResImageUrl(src), original: src }} alt={title || '写真'} />
  } else if (type === 'youtube') {
    body = (
      <div className="w-full h-full flex items-center justify-center p-2 sm:p-6">
        <div className="w-full max-w-6xl bg-black rounded-lg overflow-hidden shadow-2xl" style={{ aspectRatio: '16/9', maxHeight: '100%' }}>
          <iframe
            src={`https://www.youtube.com/embed/${src}?autoplay=1&rel=0`}
            title={title || 'YouTube video'}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      </div>
    )
  } else if (type === 'pdf' || type === 'url') {
    body = (
      <div className="w-full h-full flex flex-col p-2 sm:p-4 gap-2">
        {type === 'url' && (
          <div className="flex items-start gap-1.5 text-[11px] text-white/80 bg-white/10 rounded-lg px-3 py-2">
            <Info size={13} className="flex-shrink-0 mt-px" />
            <span>
              サイトによっては、ここに表示できない（真っ白・接続拒否になる）場合があります。その時は右上の
              <ExternalLink size={11} className="inline mx-0.5 -mt-0.5" />
              「新しいタブで開く」をご利用ください。
            </span>
          </div>
        )}
        <div className="flex-1 bg-white rounded-lg overflow-hidden shadow-2xl">
          <iframe
            src={type === 'pdf' ? pdfPreviewUrl(src) : src}
            title={title || (type === 'pdf' ? 'PDF' : 'Webページ')}
            className="w-full h-full"
            referrerPolicy="no-referrer-when-downgrade"
            allow="fullscreen"
            allowFullScreen
          />
        </div>
      </div>
    )
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      {/* ヘッダー */}
      <div
        className="flex items-center gap-2 px-3 py-2 text-white flex-shrink-0"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <Maximize2 size={14} className="opacity-60 flex-shrink-0" />
        <span className="text-sm font-medium truncate flex-1 min-w-0">{title || '拡大表示'}</span>
        {openUrl && (
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white no-underline flex-shrink-0"
            title="新しいタブで開く"
          >
            <ExternalLink size={13} />
            <span className="hidden sm:inline">新しいタブで開く</span>
          </a>
        )}
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full bg-white/15 hover:bg-white/25 flex-shrink-0"
          title="閉じる（Esc）"
        >
          <X size={18} />
        </button>
      </div>

      {/* 中身（中身のクリックでは閉じない） */}
      <div
        className="flex-1 min-h-0"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {body}
      </div>
    </div>,
    document.body
  )
}

/** 写真サムネイル（クリックで拡大） */
export function ZoomablePhoto({ src, alt, className = '' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full p-0 border-0 bg-transparent cursor-zoom-in"
        title="クリックで拡大表示"
      >
        <img src={src} alt={alt} className={className} loading="lazy" />
        <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 text-[10px] font-medium text-white bg-black/60 px-1.5 py-0.5 rounded
          opacity-80 group-hover:opacity-100 transition-opacity">
          <Maximize2 size={10} /> 拡大
        </span>
      </button>
      <MediaViewer
        media={open ? { type: 'image', src, title: alt, openUrl: src } : null}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
