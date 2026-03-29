import * as THREE from 'three'
import { makeCircleTexture } from '../utils/makeCircleTexture'

function warmParticleColors(count) {
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    colors[i * 3] = 0.25 + Math.random() * 0.4
    colors[i * 3 + 1] = 0.08 + Math.random() * 0.12
    colors[i * 3 + 2] = 0.01 + Math.random() * 0.03
  }
  return colors
}

function buildParticleGroup(count, zMin, zMax) {
  const positions = new Float32Array(count * 3)
  const colors = warmParticleColors(count)

  for (let i = 0; i < count; i++) {
    positions[i * 3] = -120 + Math.random() * 240
    positions[i * 3 + 1] = -40 + Math.random() * 120
    positions[i * 3 + 2] = zMin + Math.random() * (zMax - zMin)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

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

export function createNebulaBg(scene) {
  const groupA = buildParticleGroup(12000, -120, -10)
  const groupB = buildParticleGroup(6000, -10, 60)

  scene.add(groupA, groupB)
  return { groupA, groupB }
}
