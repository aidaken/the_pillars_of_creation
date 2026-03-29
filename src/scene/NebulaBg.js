import * as THREE from 'three'
import { makeCircleTexture } from '../utils/makeCircleTexture'

export function createNebulaBg(scene) {
  const count = 15000
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    positions[i * 3]     = -100 + Math.random() * 200
    positions[i * 3 + 1] =  -30 + Math.random() * 90
    positions[i * 3 + 2] = -100 + Math.random() * 92   // z: -100 to -8

    colors[i * 3]     = 0.3  + Math.random() * 0.4
    colors[i * 3 + 1] = 0.1  + Math.random() * 0.15
    colors[i * 3 + 2] = 0.01 + Math.random() * 0.04
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3))

  const mat = new THREE.PointsMaterial({
    map: makeCircleTexture(),
    size: 0.3,
    vertexColors: true,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    alphaTest: 0.01,
    sizeAttenuation: true,
    fog: false,
  })

  const points = new THREE.Points(geo, mat)
  scene.add(points)
  return points
}
