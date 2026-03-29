import * as THREE from 'three'

export function createNebulaBg(scene) {
  // Layer 1 — deep blue-purple gas particles behind the pillars
  const count = 20000
  const positions = new Float32Array(count * 3)
  const colors    = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    positions[i * 3]     =  -80 + Math.random() * 160  // x:  -80 →  80
    positions[i * 3 + 1] =  -15 + Math.random() *  70  // y:  -15 →  55
    positions[i * 3 + 2] =  -80 + Math.random() *  75  // z:  -80 →  -5

    colors[i * 3]     = 0.01 + Math.random() * 0.04  // r
    colors[i * 3 + 1] = 0.04 + Math.random() * 0.10  // g
    colors[i * 3 + 2] = 0.18 + Math.random() * 0.25  // b
  }

  const cloudGeo = new THREE.BufferGeometry()
  cloudGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  cloudGeo.setAttribute('color',    new THREE.BufferAttribute(colors, 3))

  const cloudMat = new THREE.PointsMaterial({
    size: 0.25,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
    fog: false,
  })

  const cloud = new THREE.Points(cloudGeo, cloudMat)
  scene.add(cloud)

  // Layer 2 — dark sphere giving depth gradient to the far background
  const bgSphere = new THREE.Mesh(
    new THREE.SphereGeometry(250, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x030610, side: THREE.BackSide })
  )
  scene.add(bgSphere)

  return { cloud, bgSphere }
}
