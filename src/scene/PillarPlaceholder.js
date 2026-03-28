import * as THREE from 'three'

const NOISE_AMOUNT = 0.4

export function createPillarPlaceholder() {
  const geometry = new THREE.CylinderGeometry(1.2, 2.2, 26, 10, 8)

  // Break the perfect cylinder with vertex noise on x and z
  const positions = geometry.attributes.position
  for (let i = 0; i < positions.count; i++) {
    // Skip top and bottom cap centres — index 0 is the top cap centre,
    // and the bottom cap centre follows the side vertices. Check y extent.
    const y = positions.getY(i)
    const isCapCentre = Math.abs(y) === 13 && positions.getX(i) === 0 && positions.getZ(i) === 0
    if (isCapCentre) continue

    positions.setX(i, positions.getX(i) + (Math.random() - 0.5) * NOISE_AMOUNT * 2)
    positions.setZ(i, positions.getZ(i) + (Math.random() - 0.5) * NOISE_AMOUNT * 2)
  }
  positions.needsUpdate = true
  geometry.computeVertexNormals()

  const material = new THREE.MeshStandardMaterial({
    color: 0x1a3a7a,
    roughness: 0.95,
    metalness: 0.0,
  })

  const pillar = new THREE.Mesh(geometry, material)
  pillar.position.set(0, 4, 0)

  return pillar
}
