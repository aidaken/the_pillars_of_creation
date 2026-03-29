import * as THREE from 'three'

export function addLights(scene) {
  // decay:0 — simple distance-cutoff falloff (Three.js r155+ default is
  // decay:2 / inverse-square, which makes moderate intensities invisible)
  const ambient = new THREE.AmbientLight(0x1a2a4a, 0.6)

  // Warm key — NGC 6611 star cluster, upper-left
  const keyLight = new THREE.PointLight(0xcc9966, 25, 350, 0)
  keyLight.position.set(-25, 70, 35)

  // Cool rim from the right
  const rimLight = new THREE.PointLight(0x2244aa, 10, 250, 0)
  rimLight.position.set(50, 30, 10)

  // Backlight — separates pillars from the dark background
  const backLight = new THREE.PointLight(0x0a1535, 5, 200, 0)
  backLight.position.set(0, 10, -60)

  scene.add(ambient, keyLight, rimLight, backLight)
}
