import * as THREE from 'three'

// Pillar centres and heights mirror PILLAR_DEFS in Pillars.js
const CLUSTERS = [
  { x: -9, z:  2, height: 28, radiusBase: 4.0, count: 2500 },
  { x:  1, z:  4, height: 20, radiusBase: 3.2, count: 2000 },
  { x:  9, z: -1, height: 14, radiusBase: 2.4, count: 1500 },
]

export function createDustClouds(scene) {
  const totalParticles = CLUSTERS.reduce((sum, c) => sum + c.count, 0)
  const positions = new Float32Array(totalParticles * 3)

  let idx = 0

  for (const cluster of CLUSTERS) {
    const yMax = cluster.height + 2

    for (let i = 0; i < cluster.count; i++) {
      const angle  = Math.random() * Math.PI * 2
      const radius = cluster.radiusBase * (1.0 + Math.random() * 1.2)

      positions[idx * 3]     = cluster.x + Math.cos(angle) * radius
      positions[idx * 3 + 1] = Math.random() * yMax
      positions[idx * 3 + 2] = cluster.z + Math.sin(angle) * radius

      idx++
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const material = new THREE.PointsMaterial({
    size: 0.4,
    color: 0x1a2d5a,
    transparent: true,
    opacity: 0.12,
    blending: THREE.NormalBlending,
    depthWrite: false,
    sizeAttenuation: true,
    fog: false,
  })

  const dust = new THREE.Points(geometry, material)
  scene.add(dust)
  return dust
}
