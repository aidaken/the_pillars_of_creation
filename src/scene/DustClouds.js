import * as THREE from 'three'
import { makeCircleTexture } from '../utils/makeCircleTexture'

// Not mounted in App while nebula silhouette is tuned; re-enable when needed.

// Pillar centres and heights mirror PILLAR_DEFS in Pillars.js
const CLUSTERS = [
  { x: -9, z:  2, height: 28, radiusBase: 4.0, count: 3200 },
  { x:  1, z:  4, height: 20, radiusBase: 3.2, count: 2800 },
  { x:  9, z: -1, height: 14, radiusBase: 2.4, count: 2000 },
]

const BASE_COUNT = 3000

export function createDustClouds(scene) {
  const totalParticles = CLUSTERS.reduce((sum, c) => sum + c.count, 0) + BASE_COUNT
  const positions = new Float32Array(totalParticles * 3)

  let idx = 0

  for (const cluster of CLUSTERS) {
    const yMin = -2
    const yMax = cluster.height + 6

    for (let i = 0; i < cluster.count; i++) {
      const angle  = Math.random() * Math.PI * 2
      const radius = cluster.radiusBase * (0.8 + Math.random() * 1.8)

      positions[idx * 3]     = cluster.x + Math.cos(angle) * radius
      positions[idx * 3 + 1] = yMin + Math.random() * (yMax - yMin)
      positions[idx * 3 + 2] = cluster.z + Math.sin(angle) * radius

      idx++
    }
  }

  // Base gas cloud connecting all three pillars at ground level
  for (let i = 0; i < BASE_COUNT; i++) {
    positions[idx * 3]     = -14 + Math.random() * 28   // x: -14 → 14
    positions[idx * 3 + 1] =        Math.random() *  6   // y:   0 →  6
    positions[idx * 3 + 2] =  -8 + Math.random() * 20   // z:  -8 → 12

    idx++
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const material = new THREE.PointsMaterial({
    map: makeCircleTexture(),
    alphaTest: 0.01,
    size: 0.6,
    color: 0x6b3010,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
    fog: false,
  })

  const dust = new THREE.Points(geometry, material)
  scene.add(dust)
  return dust
}
