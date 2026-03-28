import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export function createControls(camera, domElement) {
  const controls = new OrbitControls(camera, domElement)

  controls.enableDamping = true
  controls.dampingFactor = 0.04
  controls.minDistance = 8
  controls.maxDistance = 120
  controls.autoRotate = false

  return controls
}
