import * as THREE from 'three'

export function addLights(scene) {
  const ambient = new THREE.AmbientLight(0x1a0f05, 1.2)

  const keyLight = new THREE.PointLight(0xff9944, 30, 400, 0)
  keyLight.position.set(30, 80, 40)

  const fillLight = new THREE.PointLight(0xcc6622, 12, 300, 0)
  fillLight.position.set(-30, 20, 20)

  const rimLight = new THREE.PointLight(0x1133aa, 8, 250, 0)
  rimLight.position.set(0, 30, -80)

  const sun = new THREE.DirectionalLight(0xffaa55, 3)
  sun.position.set(1, 2, 0.5)

  scene.add(ambient, keyLight, fillLight, rimLight, sun)
}
