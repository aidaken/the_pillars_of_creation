import * as THREE from 'three'

const PILLAR_DEFS = [
  {
    name: 'finger',
    position: [-9, 0, 2],
    radiusTop: 1.8,
    radiusBottom: 4.0,
    height: 28,
    radialSegments: 16,
    heightSegments: 12,
  },
  {
    name: 'thumb',
    position: [1, 0, 4],
    radiusTop: 1.4,
    radiusBottom: 3.2,
    height: 20,
    radialSegments: 16,
    heightSegments: 12,
  },
  {
    name: 'pinky',
    position: [9, 0, -1],
    radiusTop: 1.0,
    radiusBottom: 2.4,
    height: 14,
    radialSegments: 16,
    heightSegments: 12,
  },
]

function buildPillarGeometry(def) {
  const geo = new THREE.CylinderGeometry(
    def.radiusTop,
    def.radiusBottom,
    def.height,
    def.radialSegments,
    def.heightSegments
  )

  const pos = geo.attributes.position
  const halfH = def.height / 2

  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    const t = (y + halfH) / def.height

    const xNoise = Math.sin(y * 0.3) * 0.5 + Math.sin(y * 0.8) * 0.2
    const zNoise = Math.cos(y * 0.28) * 0.5 + Math.cos(y * 0.75) * 0.2

    // Taper noise toward the tip so the top stays controlled
    const envelope = 1 - t * 0.55

    pos.setX(i, pos.getX(i) + xNoise * envelope)
    pos.setZ(i, pos.getZ(i) + zNoise * envelope)
  }

  pos.needsUpdate = true
  geo.computeVertexNormals()
  return geo
}

export function createPillars(scene) {
  const material = new THREE.MeshStandardMaterial({
    color: 0x2a1f0f,
    emissive: 0x1a0f05,
    emissiveIntensity: 0.3,
    roughness: 0.95,
    metalness: 0.0,
  })

  return PILLAR_DEFS.map((def) => {
    const geo = buildPillarGeometry(def)
    const mesh = new THREE.Mesh(geo, material.clone())

    // Base sits at y=0 — CylinderGeometry is centred, so shift up by half height
    mesh.position.set(def.position[0], def.height / 2, def.position[2])

    scene.add(mesh)
    return mesh
  })
}
