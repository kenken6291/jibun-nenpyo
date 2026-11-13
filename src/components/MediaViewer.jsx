import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, ZoomIn, ZoomOut, RotateCcw, ExternalLink, Maximize2, Info, ChevronLeft, ChevronRight, Play, Pause, Images } from 'lucide-react'

// ============================================================
// 拡大表示ビューア（写真・写真スライドショー・YouTube・PDF・URLリンク先）
// media = { type: 'image' | 'gallery' | 'youtube' | 'pdf' | 'url', src, title, openUrl }
//   gallery の場合: { type: 'gallery', photos: [{ url, fileId }], index, title, autoplay }
// ============================================================

const MIN_SCALE = 1
const MAX_SCALE = 6
const SLIDE_INTERVAL_MS = 4000 // スライドショーの切り替え間隔
const SWIPE_THRESHOLD = 50     // この距離(px)以上の横スワイプで前後の写真へ

// Driveのサムネイル画像は拡大時に高解像度版を読み込む
export function hiResImageUrl(url) {
  if (!url) return url
  if (url.includes('drive.google.com/thumbnail')) {
    return url.replace(/([?&])sz=w\d+/, '$1sz=w2400')
  }
  return url
}

// 一覧用の小さいサムネイル
export function thumbImageUrl(url, size = 400) {
  if (!url) return url
  if (url.includes('drive.google.com/thumbnail')) {
    return url.replace(/([?&])sz=w\d+/, `$1sz=w${size}`)
  }
  return url
}

// 写真を新しいタブで開くURL（Driveファイルなら閲覧ページ）
export function photoOpenUrl(photo) {
  if (!photo) return ''
  if (photo.fileId) return `https://drive.google.com/file/d/${photo.fileId}/view`
  return hiResImageUrl(photo.url)
}

// 出来事の写真一覧を取り出す（v4.6以前の写真1枚データにも対応）
export function getEntryPhotos(entry) {
  if (!entry) return []
  if (Array.isArray(entry.photos) && entry.photos.length > 0) {
    return entry.photos.filter(p => p && p.url)
  }
  return entry.photoUrl ? [{ url: entry.photoUrl, fileId: '' }] : []
}

// DriveのPDF URL（/view）を埋め込み用（/preview）に変換
export function pdfPreviewUrl(url) {
  if (!url) return url
  const m = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/)
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`
  return url
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

/**
 * 写真：ホイール・ピンチ・ボタンで拡大縮小、ドラッグで移動、ダブルクリックで切替
 * onSwipe(+1 / -1)：拡大していない時の左右スワイプで前後の写真へ
 * onZoomChange(scale)：拡大率が変わった時（スライドショーの一時停止に使う）
 */
function ZoomableImage({ src, alt, onSwipe, onZoomChange }) {
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [loaded, setLoaded] = useState(false)
  const [fallback, setFallback] = useState(false)
  const pointers = useRef(new Map())
  const pinch = useRef(null)
  const drag = useRef(null)
  const swipe = useRef(null)

  useEffect(() => { onZoomChange?.(scale) }, [scale, onZoomChange])

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
      swipe.current = null // 2本指操作中はスワイプ扱いにしない
    } else if (pointers.current.size === 1) {
      drag.current = { x: e.clientX, y: e.clientY, pos }
      swipe.current = scale === 1 ? { x: e.clientX, y: e.clientY } : null
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
    // 拡大していない状態での横スワイプ → 前後の写真へ
    if (swipe.current && onSwipe && pointers.current.size === 1 && scale === 1) {
      const dx = e.clientX - swipe.current.x
      const dy = e.clientY - swipe.current.y
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.2) {
        onSwipe(dx < 0 ? 1 : -1)
      }
    }
    swipe.current = null
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
          className="max-w-full max-h-full object-contain"
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.45s ease, transform 75ms linear',
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

/**
 * 写真スライドショー本体
 * ←→キー・左右ボタン・スワイプ・サムネイルで切り替え、スペースキー／▶ボタンで自動再生
 */
function PhotoSlideshow({ photos, index, onIndexChange, title, playing, onPlayingChange }) {
  const count = photos.length
  const [zoomed, setZoomed] = useState(false)
  const stripRef = useRef(null)

  const go = useCallback((delta) => {
    if (count < 2) return
    onIndexChange((index + delta + count) % count)
  }, [count, index, onIndexChange])

  // 自動再生（拡大中は止める）
  useEffect(() => {
    if (!playing || zoomed || count < 2) return
    const t = setTimeout(() => onIndexChange((index + 1) % count), SLIDE_INTERVAL_MS)
    return () => clearTimeout(t)
  }, [playing, zoomed, index, count, onIndexChange])

  // キー操作
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
      else if (e.key === ' ' && count > 1) { e.preventDefault(); onPlayingChange(p => !p) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, count, onPlayingChange])

  // 前後の写真を先読み
  useEffect(() => {
    if (count < 2) return
    ;[1, -1].forEach(d => {
      const p = photos[(index + d + count) % count]
      if (p) { const img = new Image(); img.src = hiResImageUrl(p.url) }
    })
  }, [index, photos, count])

  // 選択中のサムネイルを見える位置へ
  useEffect(() => {
    const el = stripRef.current?.querySelector(`[data-idx="${index}"]`)
    el?.scrollIntoView?.({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [index])

  const handleZoomChange = useCallback((s) => setZoomed(s > 1), [])
  const photo = photos[index]
  if (!photo) return null

  const arrowCls = 'absolute top-1/2 -translate-y-1/2 z-10 w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/70 transition-colors'

  return (
    <div className="w-full h-full flex flex-col">
      <div className="relative flex-1 min-h-0">
        <ZoomableImage
          key={`${index}-${photo.url}`}
          src={{ hi: hiResImageUrl(photo.url), original: photo.url }}
          alt={`${title || '写真'}（${index + 1}枚目）`}
          onSwipe={count > 1 ? go : undefined}
          onZoomChange={handleZoomChange}
        />
        {count > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className={`${arrowCls} left-2 sm:left-4`} title="前の写真（←）">
              <ChevronLeft size={26} />
            </button>
            <button type="button" onClick={() => go(1)} className={`${arrowCls} right-2 sm:right-4`} title="次の写真（→）">
              <ChevronRight size={26} />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex-shrink-0 px-2 pt-2 pb-2">
          {/* 自動再生の進み具合 */}
          <div className="h-0.5 w-full max-w-3xl mx-auto mb-2 bg-white/15 rounded overflow-hidden">
            {playing && !zoomed && (
              <div
                key={`bar-${index}`}
                className="h-full bg-white/70"
                style={{ animation: `nenpyo-slide-progress ${SLIDE_INTERVAL_MS}ms linear forwards` }}
              />
            )}
          </div>
          <div className="flex items-center gap-2 max-w-3xl mx-auto">
            <button
              type="button"
              onClick={() => onPlayingChange(p => !p)}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs"
              title={playing ? '一時停止（スペース）' : 'スライドショー再生（スペース）'}
            >
              {playing ? <Pause size={14} /> : <Play size={14} />}
              <span className="hidden sm:inline">{playing ? '一時停止' : '再生'}</span>
            </button>
            <div ref={stripRef} className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto py-1" style={{ scrollbarWidth: 'thin' }}>
              {photos.map((p, i) => (
                <button
                  key={`${i}-${p.url}`}
                  type="button"
                  data-idx={i}
                  onClick={() => onIndexChange(i)}
                  className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-md overflow-hidden border-2 transition-all
                    ${i === index ? 'border-white opacity-100' : 'border-transparent opacity-50 hover:opacity-90'}`}
                  title={`${i + 1}枚目`}
                >
                  <img src={thumbImageUrl(p.url, 200)} alt="" className="w-full h-full object-cover" loading="lazy" draggable={false} />
                </button>
              ))}
            </div>
          </div>
          <style>{'@keyframes nenpyo-slide-progress { from { width: 0% } to { width: 100% } }'}</style>
        </div>
      )}
    </div>
  )
}

/** 拡大表示モーダル本体 */
export default function MediaViewer({ media, onClose }) {
  const [galleryIdx, setGalleryIdx] = useState(media?.index || 0)
  const [playing, setPlaying] = useState(false)
  const [prevMedia, setPrevMedia] = useState(null)

  // 新しく開いた時に、表示する写真の位置と自動再生を初期化（描画前に反映）
  if (media !== prevMedia) {
    setPrevMedia(media)
    if (media) {
      setGalleryIdx(media.index || 0)
      setPlaying(media.type === 'gallery' && !!media.autoplay && (media.photos?.length || 0) > 1)
    }
  }

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
  const { type, src, title } = media
  let { openUrl } = media
  let counter = ''

  let body = null
  if (type === 'image' || type === 'gallery') {
    const photos = type === 'gallery' ? (media.photos || []) : [{ url: src, fileId: '' }]
    const idx = clamp(galleryIdx, 0, Math.max(0, photos.length - 1))
    if (type === 'gallery') {
      openUrl = photoOpenUrl(photos[idx])
      if (photos.length > 1) counter = `${idx + 1} / ${photos.length}`
    }
    body = (
      <PhotoSlideshow
        photos={photos}
        index={idx}
        onIndexChange={setGalleryIdx}
        title={title}
        playing={playing}
        onPlayingChange={setPlaying}
      />
    )
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
        {counter ? <Images size={14} className="opacity-60 flex-shrink-0" /> : <Maximize2 size={14} className="opacity-60 flex-shrink-0" />}
        <span className="text-sm font-medium truncate flex-1 min-w-0">{title || '拡大表示'}</span>
        {counter && (
          <span className="text-xs tabular-nums px-2 py-1 rounded-full bg-white/15 flex-shrink-0">{counter}</span>
        )}
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

/** 写真サムネイル（クリックで拡大）※写真1枚用。複数枚は EntryPhotos を使う */
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

/**
 * 出来事の写真（年表カード用）
 * 1枚：大きく表示／2枚以上：表紙＋サムネイル列。クリックでスライドショー
 */
export function EntryPhotos({ entry, title }) {
  const photos = getEntryPhotos(entry)
  const [media, setMedia] = useState(null)
  const close = useCallback(() => setMedia(null), [])
  if (photos.length === 0) return null

  const open = (i) => setMedia({
    type: 'gallery',
    photos,
    index: i,
    title: title || entry.title,
    autoplay: photos.length > 1,
  })

  const MAX_THUMBS = 4
  const thumbs = photos.slice(1, 1 + MAX_THUMBS)
  const rest = photos.length - 1 - thumbs.length

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => open(0)}
        className="group relative block w-full p-0 border-0 bg-transparent cursor-zoom-in"
        title={photos.length > 1 ? 'クリックでスライドショー' : 'クリックで拡大表示'}
      >
        <img
          src={photos[0].url}
          alt={title || entry.title}
          className="w-full max-h-48 object-cover rounded-lg border border-ink-200 dark:border-ink-600"
          loading="lazy"
        />
        <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 text-[10px] font-medium text-white bg-black/60 px-1.5 py-0.5 rounded
          opacity-80 group-hover:opacity-100 transition-opacity">
          {photos.length > 1
            ? <><Play size={10} /> スライドショー（{photos.length}枚）</>
            : <><Maximize2 size={10} /> 拡大</>}
        </span>
      </button>

      {thumbs.length > 0 && (
        <div className="grid grid-cols-4 gap-1 mt-1">
          {thumbs.map((p, i) => {
            const isLast = i === thumbs.length - 1 && rest > 0
            return (
              <button
                key={`${i}-${p.url}`}
                type="button"
                onClick={() => open(i + 1)}
                className="relative block p-0 border-0 bg-transparent aspect-square overflow-hidden rounded-md cursor-zoom-in"
                title={`${i + 2}枚目を表示`}
              >
                <img
                  src={thumbImageUrl(p.url, 300)}
                  alt=""
                  className="w-full h-full object-cover border border-ink-200 dark:border-ink-600 rounded-md hover:opacity-85 transition-opacity"
                  loading="lazy"
                />
                {isLast && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-sm font-semibold rounded-md">
                    +{rest}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      <MediaViewer media={media} onClose={close} />
    </div>
  )
}
