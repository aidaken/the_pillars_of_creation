import * as THREE from 'three'

// LatheGeometry profile: array of [radius, height] pairs bottom → top.
// Each pillar has a unique irregular silhouette rather than a smooth cone.
const PILLAR_DEFS = [
  {
    name: 'finger',
    profile: [
      [4.2, 0], [3.8, 2], [4.5, 4],  [3.2, 7],  [3.8, 10], [2.9, 13],
      [3.4, 16],[2.4, 19],[2.8, 22],  [1.8, 25], [1.2, 27], [0.8, 28],
    ],
    segments: 20,
    position: [-9, 0, 2],
    rotation: { z: -0.08, x: 0.04 },
  },
  {
    name: 'thumb',
    profile: [
      [3.4, 0], [3.0, 2], [3.6, 4], [2.7, 6], [3.1, 9], [2.4, 12],
      [2.8, 14],[1.9, 17],[1.5, 19],[0.9, 20],
    ],
    segments: 18,
    position: [2, 0, 4],
    rotation: { z: 0.06, x: -0.03 },
  },
  {
    name: 'pinky',
    profile: [
      [2.6, 0], [2.3, 2], [2.8, 3], [2.0, 6], [2.4, 8],
      [1.7, 10],[1.3, 12],[0.7, 13],[0.5, 14],
    ],
    segments: 16,
    position: [9, 0, -1],
    rotation: { z: 0.03 },
  },
]

function applyBumpNoise(geo) {
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const r = Math.sqrt(x * x + z * z)
    if (r > 0.1) {
      const bump1  = Math.sin(y * 0.6 + x * 0.8) * 0.45
      const bump2  = Math.cos(y * 1.2 + z * 0.9) * 0.28
      const detail = Math.sin(y * 2.5 + x * 2.1) * 0.12
                   + Math.cos(y * 3.1 + z * 1.8) * 0.08
      const scale = 1 + (bump1 + bump2 + detail) / r
      pos.setXYZ(i, x * scale, y, z * scale)
    }
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()
}

function buildLathePillar(def, material) {
  const points = def.profile.map(([r, h]) => new THREE.Vector2(r, h))
  const geo = new THREE.LatheGeometry(points, def.segments)

  applyBumpNoise(geo)

  const mesh = new THREE.Mesh(geo, material.clone())
  mesh.position.set(...def.position)
  if (def.rotation) {
    if (def.rotation.x) mesh.rotation.x = def.rotation.x
    if (def.rotation.y) mesh.rotation.y = def.rotation.y
    if (def.rotation.z) mesh.rotation.z = def.rotation.z
  }
  return mesh
}

function buildBaseCloud(scene) {
  const geo = new THREE.SphereGeometry(16, 20, 10)
  const pos = geo.attributes.position

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    // Flatten to a disc then add surface noise
    let y = pos.getY(i) * 0.35
    y += Math.sin(x * 0.4) * 1.5 + Math.cos(z * 0.35) * 1.2
    pos.setY(i, y)
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()

  const mat = new THREE.MeshStandardMaterial({
    color: 0x2a1505,
    emissive: 0x150a02,
    emissiveIntensity: 0.6,
    roughness: 1.0,
    transparent: true,
    opacity: 0.95,
  })

  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(0, -2, 1)
  scene.add(mesh)
}

export function createPillars(scene) {
  const material = new THREE.MeshStandardMaterial({
    color: 0x3d2408,
    emissive: 0x1a0c03,
    emissiveIntensity: 0.5,
    roughness: 0.98,
    metalness: 0.0,
  })

  buildBaseCloud(scene)

  return PILLAR_DEFS.map((def) => {
    const mesh = buildLathePillar(def, material)
    scene.add(mesh)
    return mesh
  })
}
