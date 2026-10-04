// Prepara a foto de perfil no próprio navegador: recorte quadrado central e redução para
// 256×256 (cerca de 20 KB). Fotos de celular com vários MB nunca chegam ao servidor.

export const AVATAR_SIZE = 256

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
}

export async function resizeToSquare(file: File, size = AVATAR_SIZE): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem')

  let bitmap: ImageBitmap
  try {
    // Respeita a rotação gravada pela câmera (EXIF)
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('Não foi possível ler essa imagem. Tente outra foto.')
  }

  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Seu navegador não conseguiu processar a imagem')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  )
  bitmap.close()

  // WebP quando o navegador suporta; senão JPEG
  const webp = await canvasToBlob(canvas, 'image/webp', 0.85)
  if (webp && webp.type === 'image/webp') return webp
  const jpeg = await canvasToBlob(canvas, 'image/jpeg', 0.85)
  if (!jpeg) throw new Error('Seu navegador não conseguiu processar a imagem')
  return jpeg
}
