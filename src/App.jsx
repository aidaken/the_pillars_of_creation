import { useEffect, useRef, useState } from 'react'
import { SceneManager } from './scene/SceneManager'
import { createStarField } from './scene/StarField'
import { createVolumetricPillars, updateSpectralMode } from './scene/VolumetricPillars'
import { createNebulaBg, setNebulaMode } from './scene/NebulaBg'
import { addLights } from './scene/lights'
import { createFlyControls } from './scene/FlyControls'
import SpectralToggle from './components/SpectralToggle'

export default function App() {
  const canvasRef = useRef(null)
  const [spectralMode, setSpectralMode] = useState('hubble')
  const [showHint, setShowHint] = useState(true)
  const pillarMatRef = useRef(null)
  const nebulaBgRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 4000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const sceneManager = new SceneManager(canvasRef.current)
    const flyControls = createFlyControls(sceneManager.camera, canvasRef.current)

    const bgRefs = createNebulaBg(sceneManager.scene)
    nebulaBgRef.current = bgRefs

    sceneManager.add(createStarField())
    addLights(sceneManager.scene)

    const { mesh: pillarMesh, mat: pillarMat } = createVolumetricPillars(sceneManager.scene)
    pillarMatRef.current = pillarMat

    const cam = sceneManager.camera
    console.log('pillar mesh position:', pillarMesh.position)
    console.log('camera position:', cam.position)
    console.log('camera quaternion:', cam.quaternion)

    let rafId
    const tick = () => {
      rafId = requestAnimationFrame(tick)
      flyControls.tick()
      pillarMat.uniforms.uCamPos.value.copy(sceneManager.camera.position).sub(pillarMesh.position)
      sceneManager.renderer.render(sceneManager.scene, sceneManager.camera)
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      flyControls.dispose()
      sceneManager.dispose()
    }
  }, [])

  function handleToggle() {
    const next = spectralMode === 'hubble' ? 'webb' : 'hubble'
    setSpectralMode(next)
    if (pillarMatRef.current)  updateSpectralMode(pillarMatRef.current, next)
    if (nebulaBgRef.current)   setNebulaMode(nebulaBgRef.current, next)
  }

  return (
    <>
      <div ref={canvasRef} style={{ width: '100vw', height: '100vh' }} />
      <SpectralToggle mode={spectralMode} onToggle={handleToggle} />
      {showHint && (
        <div style={{
          position: 'fixed', top: 24, left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(180,200,255,0.7)',
          fontSize: 11, letterSpacing: 3,
          fontFamily: 'monospace',
          pointerEvents: 'none',
          transition: 'opacity 1s',
        }}>
          CLICK TO LOOK · WASD FLY · SPACE UP · SHIFT DOWN · Q/E/Z/C DIAGONAL · SCROLL ZOOM
        </div>
      )}
    </>
  )
}
