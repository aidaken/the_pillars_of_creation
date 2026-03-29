import * as THREE from 'three'
import { makeCircleTexture } from '../utils/makeCircleTexture'

const STAR_COUNT = 6000
const HERO_COUNT = 200
const HERO_VOLUME_RADIUS = 140

function randomInBall(radius) {
  const u = Math.random()
  const v = Math.random()
  const theta = u * Math.PI * 2
  const phi = Math.acos(2 * v - 1)
  const r = Math.cbrt(Math.random()) * radius
  return [
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi),
  ]
}

export function createStarField() {
  const group = new THREE.Group()

  const positions = new Float32Array(STAR_COUNT * 3)

  for (let i = 0; i < STAR_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi   = Math.acos(2 * Math.random() - 1)
    const r     = 280 + Math.random() * 50

    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = r * Math.cos(phi)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const material = new THREE.PointsMaterial({
    map: makeCircleTexture(),
    alphaTest: 0.01,
    color: 0xcce0ff,
    size: 0.55,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    fog: false,
  })

  group.add(new THREE.Points(geometry, material))

  const heroPos = new Float32Array(HERO_COUNT * 3)
  for (let i = 0; i < HERO_COUNT; i++) {
    const [x, y, z] = randomInBall(HERO_VOLUME_RADIUS)
    heroPos[i * 3] = x
    heroPos[i * 3 + 1] = y
    heroPos[i * 3 + 2] = z
  }

  const heroGeo = new THREE.BufferGeometry()
  heroGeo.setAttribute('position', new THREE.BufferAttribute(heroPos, 3))

  const heroMat = new THREE.PointsMaterial({
    map: makeCircleTexture(128),
    alphaTest: 0.01,
    color: 0xffffff,
    size: 2.5,
    sizeAttenuation: true,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  })

  group.add(new THREE.Points(heroGeo, heroMat))

  return group
}
