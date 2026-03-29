import * as THREE from 'three'

export function addLights(scene) {
  // decay:0 — simple distance-cutoff falloff (Three.js r155+ default is
  // decay:2 / inverse-square, which makes moderate intensities invisible)
  const ambient = new THREE.AmbientLight(0x4466aa, 1.5)

  // Warm key light — simulates NGC 6611 star cluster, upper-left
  const keyLight = new THREE.PointLight(0xaa8866, 15, 300, 0)
  keyLight.position.set(-20, 60, 30)

  // Cool rim from the right side
  const rimLight = new THREE.PointLight(0x334488, 6, 200, 0)
  rimLight.position.set(40, 20, 20)

  // Soft directional fill from top-left
  const dirLight = new THREE.DirectionalLight(0x7799cc, 2)
  dirLight.position.set(-1, 2, 1)

  scene.add(ambient, keyLight, rimLight, dirLight)
}
