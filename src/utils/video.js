// 動画URLを解析し、埋め込み可能かどうか・プラットフォーム種別を判定するユーティリティ

export function parseVideoUrl(rawUrl) {
  if (!rawUrl || !rawUrl.trim()) return null

  let u
  try {
    u = new URL(rawUrl.trim())
  } catch {
    return null
  }

  const host = u.hostname.replace(/^www\./, '').replace(/^m\./, '')
  const url = rawUrl.trim()

  // YouTube (動画IDが取得できれば埋め込み表示)
  if (host === 'youtube.com') {
    let id = u.searchParams.get('v')
    if (!id && u.pathname.startsWith('/shorts/')) id = u.pathname.split('/')[2]
    if (!id && u.pathname.startsWith('/embed/')) id = u.pathname.split('/')[2]
    if (id) return { platform: 'youtube', embedId: id, url, label: 'YouTube' }
  }
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('?')[0]
    if (id) return { platform: 'youtube', embedId: id, url, label: 'YouTube' }
  }

  // その他の主要SNS（リンクカード表示）
  if (host === 'x.com' || host === 'twitter.com') {
    return { platform: 'x', url, label: 'X（旧Twitter）' }
  }
  if (host.includes('instagram.com')) {
    return { platform: 'instagram', url, label: 'Instagram' }
  }
  if (host.includes('tiktok.com')) {
    return { platform: 'tiktok', url, label: 'TikTok' }
  }
  if (host.includes('facebook.com') || host === 'fb.watch') {
    return { platform: 'facebook', url, label: 'Facebook' }
  }

  // それ以外の一般的なURL（動画に限らずリンクカード表示）
  return { platform: 'other', url, label: host }
}
