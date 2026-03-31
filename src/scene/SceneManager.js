import * as THREE from 'three'

export class SceneManager {
  // Accepts a container div - Three.js creates its own canvas so each
  // mount gets a fresh WebGL context (avoids StrictMode context-reuse issues)
  constructor(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.5

    this.renderer.domElement.style.display = 'block'
    container.appendChild(this.renderer.domElement)
    this._container = container

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x03050f)
    this.scene.fog = new THREE.FogExp2(0x03050f, 0.003)

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.camera.position.set(0, 10, 52)

    this._rafId = null
    this._onResize = this._onResize.bind(this)
    window.addEventListener('resize', this._onResize)
  }

  add(...objects) {
    this.scene.add(...objects)
  }

  start(controls) {
    this._controls = controls

    const tick = () => {
      this._rafId = requestAnimationFrame(tick)
      if (this._controls) this._controls.update()
      this.renderer.render(this.scene, this.camera)
    }

    tick()
  }

  dispose() {
    cancelAnimationFrame(this._rafId)
    window.removeEventListener('resize', this._onResize)
    this._container.removeChild(this.renderer.domElement)
    this.renderer.dispose()
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }
}
