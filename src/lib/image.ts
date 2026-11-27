// 사진을 줄여서(최대 1280px) 서버 전송 용량을 낮춥니다.

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지를 열 수 없어요. JPG·PNG 사진인지 확인해 주세요.')) }
    img.src = url
  })
}

export async function compressImage(file: File, max = 1280, quality = 0.82): Promise<{ data: string; mediaType: string; dataUrl: string }> {
  if (!file.type.startsWith('image/')) throw new Error('사진 파일만 올릴 수 있어요.')
  const img = await loadImage(file)
  const scale = Math.min(1, max / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  return { data: dataUrl.split(',')[1], mediaType: 'image/jpeg', dataUrl }
}

/** 식재료 카드용 작은 썸네일 (약 10KB) */
export async function thumbnail(file: File): Promise<string> {
  const r = await compressImage(file, 200, 0.7)
  return r.dataUrl
}

/** 사진에서 사용자가 고른 영역(0~1 비율 [x, y, w, h])만 잘라냄. 너무 작으면 주변을 조금 넓힘 */
export async function cropImage(dataUrl: string, box: [number, number, number, number], max = 1024): Promise<{ data: string; mediaType: string; dataUrl: string }> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error('사진을 다시 열 수 없어요.'))
    i.src = dataUrl
  })
  const pad = 0.04
  let [x, y, w, h] = box
  x = Math.max(0, x - pad); y = Math.max(0, y - pad)
  w = Math.min(1 - x, w + pad * 2); h = Math.min(1 - y, h + pad * 2)
  const sx = Math.round(x * img.width), sy = Math.round(y * img.height)
  const sw = Math.max(8, Math.round(w * img.width)), sh = Math.max(8, Math.round(h * img.height))
  const scale = Math.min(max / Math.max(sw, sh), 3)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(sw * scale)
  canvas.height = Math.round(sh * scale)
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  const out = canvas.toDataURL('image/jpeg', 0.9)
  return { data: out.split(',')[1], mediaType: 'image/jpeg', dataUrl: out }
}
