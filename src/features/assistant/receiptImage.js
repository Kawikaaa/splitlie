import { stripJpegMetadata } from '../../../supabase/functions/ai-assistant/contract.js'
export async function openReceiptImage(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error('INVALID_IMAGE')
  const image = await createImageBitmap(file, { imageOrientation: 'from-image' })
  if (!image.width || !image.height || image.width * image.height > 24000000) { image.close(); throw new Error('INVALID_IMAGE') }
  return image
}
export async function encodeReceiptImage(image, rotation = 0, crop = {}) {
  const canvas = document.createElement('canvas'), portrait = rotation % 180 !== 0
  const rotatedWidth = portrait ? image.height : image.width, rotatedHeight = portrait ? image.width : image.height
  const left = (crop.left || 0) / 100, top = (crop.top || 0) / 100
  const width = 1 - left - (crop.right || 0) / 100, height = 1 - top - (crop.bottom || 0) / 100
  const scale = Math.min(1, 2048 / Math.max(rotatedWidth * width, rotatedHeight * height), Math.sqrt(2400000 / (rotatedWidth * width * rotatedHeight * height)))
  canvas.width = Math.max(1, Math.floor(rotatedWidth * width * scale)); canvas.height = Math.max(1, Math.floor(rotatedHeight * height * scale))
  const context = canvas.getContext('2d', { alpha: false })
  context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height)
  context.scale(scale, scale); context.translate(-left * rotatedWidth, -top * rotatedHeight)
  context.translate(rotatedWidth / 2, rotatedHeight / 2); context.rotate(rotation * Math.PI / 180)
  context.drawImage(image, -image.width / 2, -image.height / 2)
  // Canvas encoding strips the source EXIF/location metadata.
  let preview = canvas.toDataURL('image/jpeg', .86)
  if (preview.length > 1400000) preview = canvas.toDataURL('image/jpeg', .65)
  if (preview.length > 1400000) throw new Error('INVALID_IMAGE')
  const cleanBytes=stripJpegMetadata(Uint8Array.from(atob(preview.split(',')[1]),value=>value.charCodeAt(0)))
  let binary=''
  for(let offset=0;offset<cleanBytes.length;offset+=16384)binary+=String.fromCharCode(...cleanBytes.subarray(offset,offset+16384))
  const imageData=btoa(binary)
  preview=`data:image/jpeg;base64,${imageData}`
  const digest = await crypto.subtle.digest('SHA-256', Uint8Array.from(atob(imageData), value => value.charCodeAt(0)))
  return { preview, imageData, imageHash: [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('') }
}
