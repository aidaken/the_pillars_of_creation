import * as THREE from 'three'
import { makeCircleTexture } from '../utils/makeCircleTexture'

/** y skewed toward ymin so more particles sit in the lower “fog shelf” */
function sampleBottomHeavyY(yMin, yMax, power = 0.42) {
  return yMin + Math.pow(Math.random(), power) * (yMax - yMin)
}

function buildWarmBase() {
  const count = 24000
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    positions[i * 3] = -150 + Math.random() * 300
    positions[i * 3 + 1] = sampleBottomHeavyY(-55, 95)
    positions[i * 3 + 2] = -150 + Math.random() * 145

    colors[i * 3] = 0.32 + Math.random() * 0.48
    colors[i * 3 + 1] = 0.1 + Math.random() * 0.22
    colors[i * 3 + 2] = 0.01 + Math.random() * 0.07
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const mat = new THREE.PointsMaterial({
    map: makeCircleTexture(),
    size: 0.85,
    vertexColors: true,
    transparent: true,
    opacity: 0.52,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    alphaTest: 0.01,
    sizeAttenuation: true,
    fog: false,
  })

  return new THREE.Points(geo, mat)
}

/** JWST-style cyan / teal glow sitting *behind* the pillar group */
function buildCyanCore() {
  const count = 10000
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    positions[i * 3] = -22 + Math.random() * 44
    positions[i * 3 + 1] = 18 + Math.random() * 56
    positions[i * 3 + 2] = -118 + Math.random() * 95

    colors[i * 3] = 0.04 + Math.random() * 0.14
    colors[i * 3 + 1] = 0.48 + Math.random() * 0.38
    colors[i * 3 + 2] = 0.62 + Math.random() * 0.36
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const mat = new THREE.PointsMaterial({
    map: makeCircleTexture(),
    size: 0.95,
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

/** Cool gas between warm masses; outer xz becomes indigo / midnight */
function buildBlueMist() {
  const count = 12000
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    positions[i * 3] = -105 + Math.random() * 210
    positions[i * 3 + 1] = -28 + Math.random() * 105
    positions[i * 3 + 2] = -105 + Math.random() * 92

    const rx = positions[i * 3]
    const rz = positions[i * 3 + 2] + 25
    const r = Math.hypot(rx, rz)

    if (r > 88) {
      colors[i * 3] = 0.03 + Math.random() * 0.06
      colors[i * 3 + 1] = 0.02 + Math.random() * 0.06
      colors[i * 3 + 2] = 0.12 + Math.random() * 0.14
    } else {
      colors[i * 3] = 0.02 + Math.random() * 0.06
      colors[i * 3 + 1] = 0.08 + Math.random() * 0.16
      colors[i * 3 + 2] = 0.22 + Math.random() * 0.32
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const mat = new THREE.PointsMaterial({
    map: makeCircleTexture(),
    size: 0.58,
    vertexColors: true,
    transparent: true,
    opacity: 0.62,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    alphaTest: 0.01,
    sizeAttenuation: true,
    fog: false,
  })

  return new THREE.Points(geo, mat)
}

/** Dense warm gas hugging the pillar volume (lower + mid height) */
function buildWarmForeground() {
  const count = 14000
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    positions[i * 3] = -30 + Math.random() * 60
    positions[i * 3 + 1] = -10 + Math.pow(Math.random(), 0.55) * 48
    positions[i * 3 + 2] = -24 + Math.random() * 42

    colors[i * 3] = 0.42 + Math.random() * 0.38
    colors[i * 3 + 1] = 0.16 + Math.random() * 0.2
    colors[i * 3 + 2] = 0.02 + Math.random() * 0.06
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const mat = new THREE.PointsMaterial({
    map: makeCircleTexture(),
    size: 1.15,
    vertexColors: true,
    transparent: true,
    opacity: 0.38,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    alphaTest: 0.01,
    sizeAttenuation: true,
    fog: false,
  })

  return new THREE.Points(geo, mat)
}

export function createNebulaBg(scene) {
  const warmBase = buildWarmBase()
  const cyanCore = buildCyanCore()
  const blueMist = buildBlueMist()
  const warmForeground = buildWarmForeground()

  const bgSphere = new THREE.Mesh(
    new THREE.SphereGeometry(220, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0x06020a, side: THREE.BackSide })
  )

  scene.add(warmBase, cyanCore, blueMist, warmForeground, bgSphere)

  return { warmBase, cyanCore, blueMist, warmForeground, bgSphere }
}
