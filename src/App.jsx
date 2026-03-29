import { useEffect, useRef, useState } from 'react'
import { SceneManager } from './scene/SceneManager'
import { createStarField } from './scene/StarField'
import { createVolumetricPillars, updateSpectralMode } from './scene/VolumetricPillars'
import { createNebulaBg, setNebulaMode } from './scene/NebulaBg'
import { addLights } from './scene/lights'
import { createControls } from './scene/controls'
import SpectralToggle from './components/SpectralToggle'

export default function App() {
  const canvasRef = useRef(null)
  const [spectralMode, setSpectralMode] = useState('hubble')
  const pillarMatRef = useRef(null)
  const nebulaBgRef = useRef(null)

  useEffect(() => {
    const sceneManager = new SceneManager(canvasRef.current)
    const controls = createControls(sceneManager.camera, sceneManager.renderer.domElement)

    const bgRefs = createNebulaBg(sceneManager.scene)
    nebulaBgRef.current = bgRefs

    sceneManager.add(createStarField())
    addLights(sceneManager.scene)

    const { mesh: pillarMesh, mat: pillarMat } = createVolumetricPillars(sceneManager.scene)
    pillarMatRef.current = pillarMat

    let rafId
    const tick = () => {
      rafId = requestAnimationFrame(tick)
      pillarMat.uniforms.uCamPos.value.copy(sceneManager.camera.position).sub(pillarMesh.position)
      controls.update()
      sceneManager.renderer.render(sceneManager.scene, sceneManager.camera)
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      controls.dispose()
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
    </>
  )
}
