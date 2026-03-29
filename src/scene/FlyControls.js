import * as THREE from 'three'

export function createFlyControls(camera, domElement) {
  const state = {
    moveForward: false, moveBack: false,
    moveLeft: false,    moveRight: false,
    moveUp: false,      moveDown: false,
    moveDiagQTop: false,
    moveDiagETop: false,
    moveDiagZBot: false,
    moveDiagCBot: false,
    pointerLocked: false,
    pitch: 0,
    yaw: 0,
  }

  state.yaw   = Math.PI
  state.pitch = -0.08

  // Apply initial orientation immediately
  const initEuler = new THREE.Euler(state.pitch, state.yaw, 0, 'YXZ')
  camera.quaternion.setFromEuler(initEuler)

  const MOVE_SPEED = 0.28
  const LOOK_SPEED = 0.0026
  const DRAG_SPEED = 0.006

  // Pointer lock
  domElement.addEventListener('click', () => {
    domElement.requestPointerLock()
  })

  document.addEventListener('pointerlockchange', () => {
    state.pointerLocked = document.pointerLockElement === domElement
  })

  document.addEventListener('mousemove', (e) => {
    if (!state.pointerLocked) return
    state.yaw   -= e.movementX * LOOK_SPEED
    state.pitch -= e.movementY * LOOK_SPEED
    state.pitch  = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, state.pitch))
  })

  // Touch
  let lastTouch = null
  let touchDist  = null

  domElement.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    if (e.touches.length === 2) {
      touchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
    }
  }, { passive: true })

  domElement.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && lastTouch) {
      const dx = e.touches[0].clientX - lastTouch.x
      const dy = e.touches[0].clientY - lastTouch.y
      state.yaw   -= dx * DRAG_SPEED
      state.pitch -= dy * DRAG_SPEED
      state.pitch  = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, state.pitch))
      lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    if (e.touches.length === 2 && touchDist !== null) {
      const newDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const delta = touchDist - newDist
      camera.translateZ(delta * 0.08)
      touchDist = newDist
    }
  }, { passive: true })

  domElement.addEventListener('touchend', () => {
    lastTouch = null
    touchDist = null
  })

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (['Space', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
      e.preventDefault()
    }
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    state.moveForward  = true;  break
      case 'KeyS': case 'ArrowDown':  state.moveBack     = true;  break
      case 'KeyA': case 'ArrowLeft':  state.moveLeft     = true;  break
      case 'KeyD': case 'ArrowRight': state.moveRight    = true;  break
      case 'Space':                   state.moveUp       = true;  break
      case 'ShiftLeft':
      case 'ShiftRight':              state.moveDown     = true;  break
      case 'KeyQ':                    state.moveDiagQTop = true;  break
      case 'KeyE':                    state.moveDiagETop = true;  break
      case 'KeyZ':                    state.moveDiagZBot = true;  break
      case 'KeyC':                    state.moveDiagCBot = true;  break
    }
  })

  document.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    state.moveForward  = false; break
      case 'KeyS': case 'ArrowDown':  state.moveBack     = false; break
      case 'KeyA': case 'ArrowLeft':  state.moveLeft     = false; break
      case 'KeyD': case 'ArrowRight': state.moveRight    = false; break
      case 'Space':                   state.moveUp       = false; break
      case 'ShiftLeft':
      case 'ShiftRight':              state.moveDown     = false; break
      case 'KeyQ':                    state.moveDiagQTop = false; break
      case 'KeyE':                    state.moveDiagETop = false; break
      case 'KeyZ':                    state.moveDiagZBot = false; break
      case 'KeyC':                    state.moveDiagCBot = false; break
    }
  })

  // Scroll wheel
  domElement.addEventListener('wheel', (e) => {
    camera.translateZ(e.deltaY * 0.04)
  }, { passive: true })

  function tick() {
    const euler = new THREE.Euler(state.pitch, state.yaw, 0, 'YXZ')
    camera.quaternion.setFromEuler(euler)

    if (state.moveForward) camera.translateZ(-MOVE_SPEED)
    if (state.moveBack)    camera.translateZ( MOVE_SPEED)
    if (state.moveLeft)    camera.translateX(-MOVE_SPEED)
    if (state.moveRight)   camera.translateX( MOVE_SPEED)
    if (state.moveUp)      camera.translateY( MOVE_SPEED)
    if (state.moveDown)    camera.translateY(-MOVE_SPEED)

    const D = MOVE_SPEED * 0.707
    if (state.moveDiagQTop) { camera.translateX(-D); camera.translateY( D) }
    if (state.moveDiagETop) { camera.translateX( D); camera.translateY( D) }
    if (state.moveDiagZBot) { camera.translateX(-D); camera.translateY(-D) }
    if (state.moveDiagCBot) { camera.translateX( D); camera.translateY(-D) }
  }

  function dispose() {}

  return { tick, dispose }
}
