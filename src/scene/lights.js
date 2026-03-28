import * as THREE from 'three'

export function addLights(scene) {
  // Intensity in linear (non-physical) units — decay:0 uses simple
  // distance-cutoff falloff instead of inverse-square (Three.js r155+
  // changed the PointLight default decay to 2, which makes intensity=5
  // contribute ~0.002 at 50 units — effectively zero)
  const ambient = new THREE.AmbientLight(0x223355, 4)

  const keyLight = new THREE.PointLight(0x4477ff, 5, 250, 0)
  keyLight.position.set(20, 40, 30)

  const fillLight = new THREE.PointLight(0x3311aa, 2, 180, 0)
  fillLight.position.set(-25, 10, -15)

  scene.add(ambient, keyLight, fillLight)
}
