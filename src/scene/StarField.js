import * as THREE from 'three'

const STAR_COUNT = 5000
const SPHERE_RADIUS = 300

export function createStarField() {
  const positions = new Float32Array(STAR_COUNT * 3)

  for (let i = 0; i < STAR_COUNT; i++) {
    // Uniform distribution on a sphere surface
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)

    positions[i * 3]     = SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = SPHERE_RADIUS * Math.cos(phi)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  // fog: false — stars sit at radius 300, FogExp2 at that distance would
  // reduce them to ~22% visibility against the near-black background
  const material = new THREE.PointsMaterial({
    color: 0xddeeff,
    size: 0.5,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
    fog: false,
  })

  return new THREE.Points(geometry, material)
}
