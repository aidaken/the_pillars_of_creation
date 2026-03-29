import * as THREE from 'three'

const textureByResolution = new Map()

export function makeCircleTexture(resolution = 64) {
  if (textureByResolution.has(resolution)) {
    return textureByResolution.get(resolution)
  }

  const canvas = document.createElement('canvas')
  canvas.width = resolution
  canvas.height = resolution
  const ctx = canvas.getContext('2d')
  const center = resolution / 2
  const gradient = ctx.createRadialGradient(
    center,
    center,
    0,
    center,
    center,
    center
  )
  gradient.addColorStop(0, 'rgba(255,255,255,1.0)')
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.8)')
  gradient.addColorStop(1.0, 'rgba(255,255,255,0.0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, resolution, resolution)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  textureByResolution.set(resolution, tex)
  return tex
}
