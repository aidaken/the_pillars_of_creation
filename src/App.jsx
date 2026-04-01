import { useEffect, useRef, useState } from 'react'
import { SceneManager } from './scene/SceneManager'
import { createStarField } from './scene/StarField'
import { createNebulaBgShader, setNebulaBgShaderMode, tickNebulaBgShader } from './scene/NebulaBgShader'
import { addLights } from './scene/lights'
import { createFlyControls } from './scene/FlyControls'
import { createPillar1, tickPillar1 } from './scene/Pillar1'
import { createPillar2, tickPillar2 } from './scene/Pillar2'
import { createPillar3, tickPillar3 } from './scene/Pillar3'
import { createJwstObserver, tickJwstObserver } from './scene/JwstObserver'
import SpectralToggle from './components/SpectralToggle'

const hudCorner = {
  position: 'absolute',
  maxWidth: 'min(42vw, 22rem)',
  padding: '10px 12px',
  fontFamily: '"JetBrains Mono", "SF Mono", "Consolas", "Liberation Mono", monospace',
  fontSize: 10,
  letterSpacing: '0.12em',
  lineHeight: 1.5,
  color: 'rgba(210, 225, 245, 0.88)',
  background: 'rgba(4, 10, 22, 0.42)',
  border: '1px solid rgba(120, 160, 210, 0.28)',
  borderRadius: 2,
  pointerEvents: 'none',
  zIndex: 30,
}

export default function App() {
  const canvasRef = useRef(null)
  const [spectralMode, setSpectralMode] = useState('hubble')
  const [hintOpacity, setHintOpacity] = useState(1)
  const nebulaBgRef = useRef(null)
  const pillar1Ref = useRef(null)
  const pillar2Ref = useRef(null)
  const pillar3Ref = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => setHintOpacity(0), 3000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const sceneManager = new SceneManager(canvasRef.current)
    const flyControls = createFlyControls(sceneManager.camera, canvasRef.current)

    // Camera initial position
    sceneManager.camera.position.set(0, 11, 96)
    sceneManager.camera.lookAt(0, 8.5, 6)

    const nebulaBg = createNebulaBgShader(sceneManager.scene)
    nebulaBgRef.current = nebulaBg

    sceneManager.add(createStarField())
    addLights(sceneManager.scene)

    const p1 = createPillar1(sceneManager.scene)
    p1.mesh.position.set(-30, 10, -4)
    pillar1Ref.current = p1

    const p2 = createPillar2(sceneManager.scene)
    p2.mesh.position.set(0, 9, 0)
    pillar2Ref.current = p2

    const p3 = createPillar3(sceneManager.scene)
    p3.mesh.position.set(26, 6.5, 24)
    pillar3Ref.current = p3

    const jwst = createJwstObserver(sceneManager.scene)

    let rafId, lastTime = performance.now()
    const tick = () => {
      rafId = requestAnimationFrame(tick)
      const now = performance.now()
      const delta = now - lastTime
      lastTime = now
      flyControls.tick()
      tickNebulaBgShader(nebulaBg.mat, delta)
      tickPillar1(p1.mat, p1.mesh, sceneManager.camera)
      tickPillar2(p2.mat, p2.mesh, sceneManager.camera)
      tickPillar3(p3.mat, p3.mesh, sceneManager.camera)
      tickJwstObserver(jwst.mat, sceneManager.camera)
      sceneManager.renderer.render(sceneManager.scene, sceneManager.camera)
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      flyControls.dispose()
      sceneManager.dispose()
      // Dispose Three.js resources
      ;[p1, p2, p3].forEach(p => {
        p.mesh.geometry.dispose()
        p.mat.dispose()
      })
      nebulaBg.mesh.geometry.dispose()
      nebulaBg.mat.dispose()
      sceneManager.renderer.dispose()
    }
  }, [])

  function handleToggle() {
    const next = spectralMode === 'hubble' ? 'webb' : 'hubble'
    setSpectralMode(next)
    if (nebulaBgRef.current)   setNebulaBgShaderMode(nebulaBgRef.current.mat, next)
    if (pillar1Ref.current)    pillar1Ref.current.mat.uniforms.uMode.value = next === 'webb' ? 1.0 : 0.0
    if (pillar2Ref.current)    pillar2Ref.current.mat.uniforms.uMode.value = next === 'webb' ? 1.0 : 0.0
    if (pillar3Ref.current)    pillar3Ref.current.mat.uniforms.uMode.value = next === 'webb' ? 1.0 : 0.0
  }

  return (
    <>
      <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
        <div
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
          }}
        />
        <div style={{ ...hudCorner, top: 16, left: 16, textAlign: 'left' }}>
          MISSION: JWST | OBS: M16_PILLARS
        </div>
        <div style={{ ...hudCorner, top: 16, right: 16, left: 'auto', textAlign: 'right' }}>
          INSTRUMENT: NIRCAM | FILTER: F200W/F444W
        </div>
        <div style={{ ...hudCorner, bottom: 16, left: 16, top: 'auto', textAlign: 'left' }}>
          COORDS: 18h 18m 48s, −13° 49′ 0″
        </div>
        <div style={{ ...hudCorner, bottom: 16, right: 16, left: 'auto', top: 'auto', textAlign: 'right' }}>
          SIMULATION SCALE: 1 UNIT = 0.1 LIGHT YEARS
        </div>
      </div>
      <SpectralToggle mode={spectralMode} onToggle={handleToggle} />
      <div style={{
        position: 'fixed', top: 24, left: '50%',
        transform: 'translateX(-50%)',
        color: 'rgba(180,200,255,0.7)',
        fontSize: 11, letterSpacing: 3,
        fontFamily: 'monospace',
        pointerEvents: 'none',
        opacity: hintOpacity,
        transition: 'opacity 1.5s ease',
        zIndex: 40,
      }}>
        CLICK TO LOOK · WASD MOVE · SPACE UP · SHIFT DOWN · SCROLL ZOOM
      </div>
    </>
  )
}
