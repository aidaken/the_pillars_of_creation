import * as THREE from 'three'

export function addLights(scene) {
  const ambient = new THREE.AmbientLight(0x0a1a33, 3)

  const keyLight = new THREE.PointLight(0x4477ff, 5, 250)
  keyLight.position.set(20, 40, 30)

  const fillLight = new THREE.PointLight(0x110a22, 2, 180)
  fillLight.position.set(-25, 10, -15)

  scene.add(ambient, keyLight, fillLight)
}
