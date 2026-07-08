// 画像をブラウザ側でリサイズ・圧縮してからアップロードするためのユーティリティ
// 大きな写真もそのまま送らず、長辺を一定サイズまで縮小してJPEGに変換する

const MAX_DIMENSION = 1600 // 長辺の最大ピクセル数
const JPEG_QUALITY = 0.82

export function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('画像ファイルを選択してください'))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
      img.onload = () => {
        let { width, height } = img
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width)
            width = MAX_DIMENSION
          } else {
            width = Math.round((width * MAX_DIMENSION) / height)
            height = MAX_DIMENSION
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('画像の変換に失敗しました'))
              return
            }
            const fileReader = new FileReader()
            fileReader.onload = () => {
              // data:image/jpeg;base64,xxxx... の 'xxxx...' 部分だけを取り出す
              const base64Data = fileReader.result.split(',')[1]
              resolve({
                base64Data,
                mimeType: 'image/jpeg',
                width,
                height,
                sizeBytes: blob.size,
              })
            }
            fileReader.onerror = () => reject(new Error('画像の変換に失敗しました'))
            fileReader.readAsDataURL(blob)
          },
          'image/jpeg',
          JPEG_QUALITY
        )
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}
