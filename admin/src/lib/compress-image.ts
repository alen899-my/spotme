export interface CompressOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  maxSizeMB?: number
}

const DEFAULT_OPTIONS: CompressOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
}

async function compressOnce(file: File, opts: CompressOptions): Promise<Blob> {
  const img = await createImageBitmap(file)

  let { width, height } = img
  const maxW = opts.maxWidth ?? DEFAULT_OPTIONS.maxWidth!
  const maxH = opts.maxHeight ?? DEFAULT_OPTIONS.maxHeight!

  if (width > maxW || height > maxH) {
    const ratio = Math.min(maxW / width, maxH / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(img, 0, 0, width, height)
  img.close()

  const blob = await canvas.convertToBlob({
    type: "image/webp",
    quality: opts.quality ?? DEFAULT_OPTIONS.quality!,
  })

  return blob
}

export async function compressImage(
  file: File,
  opts: CompressOptions = {}
): Promise<File> {
  const options = { ...DEFAULT_OPTIONS, ...opts }

  const blob = await compressOnce(file, options)

  if (options.maxSizeMB && blob.size > options.maxSizeMB * 1024 * 1024) {
    const downQual = await compressOnce(file, {
      ...options,
      quality: (options.quality ?? 0.8) * 0.6,
    })
    const fileName = file.name.replace(/\.[^.]+$/, ".webp")
    return new File([downQual], fileName, { type: "image/webp" })
  }

  const fileName = file.name.replace(/\.[^.]+$/, ".webp")
  return new File([blob], fileName, { type: "image/webp" })
}

export function createFilePreview(file: File): string {
  return URL.createObjectURL(file)
}

export function revokePreview(url: string) {
  URL.revokeObjectURL(url)
}
