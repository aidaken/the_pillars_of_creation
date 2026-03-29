import * as THREE from 'three'
import { makeCircleTexture } from '../utils/makeCircleTexture'

function buildCloud(count, zMin, zMax, colorFn) {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    positions[i * 3]     = -120 + Math.random() * 240
    positions[i * 3 + 1] =  -40 + Math.random() * 120
    positions[i * 3 + 2] = zMin + Math.random() * (zMax - zMin)
    const c = colorFn()
    colors[i * 3]     = c[0]
    colors[i * 3 + 1] = c[1]
    colors[i * 3 + 2] = c[2]
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3))

  const mat = new THREE.PointsMaterial({
    map: makeCircleTexture(),
    size: 0.28,
    vertexColors: true,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    alphaTest: 0.01,
    sizeAttenuation: true,
    fog: false,
  })

  return new THREE.Points(geo, mat)
}

function warmColor() {
  return [
    0.25 + Math.random() * 0.40,
    0.08 + Math.random() * 0.12,
    0.01 + Math.random() * 0.03,
  ]
}

function tealColor() {
  return [
    0.02 + Math.random() * 0.06,
    0.15 + Math.random() * 0.20,
    0.25 + Math.random() * 0.30,
  ]
}

export function createNebulaBg(scene) {
  // Webb mode — warm orange
  const webbA = buildCloud(12000, -120, -10, warmColor)
  const webbB = buildCloud(6000, -10, 60, warmColor)

  // Hubble mode — cool teal-blue
  const hubbleA = buildCloud(12000, -120, -10, tealColor)
  const hubbleB = buildCloud(6000, -10, 60, tealColor)

  webbA.visible   = false
  webbB.visible   = false
  hubbleA.visible = true
  hubbleB.visible = true

  scene.add(webbA, webbB, hubbleA, hubbleB)

  return { webbBg: [webbA, webbB], hubbleBg: [hubbleA, hubbleB] }
}

export function setNebulaMode(refs, mode) {
  const isHubble = mode === 'hubble'
  refs.hubbleBg.forEach(p => { p.visible = isHubble })
  refs.webbBg.forEach(p => { p.visible = !isHubble })
}
