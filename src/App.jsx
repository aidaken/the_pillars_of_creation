import { useEffect, useRef } from 'react'
import { SceneManager } from './scene/SceneManager'
import { createStarField } from './scene/StarField'
import { createVolumetricPillars } from './scene/VolumetricPillars'
import { createNebulaBg } from './scene/NebulaBg'
import { addLights } from './scene/lights'
import { createControls } from './scene/controls'

export default function App() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const sceneManager = new SceneManager(canvasRef.current)
    const controls = createControls(sceneManager.camera, sceneManager.renderer.domElement)

    createNebulaBg(sceneManager.scene)
    sceneManager.add(createStarField())
    addLights(sceneManager.scene)

    const { mesh: pillarMesh, mat: pillarMat } = createVolumetricPillars(sceneManager.scene)
    pillarMat.uniforms.uTime.value = 1.0

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

  return (
    <div
      ref={canvasRef}
      style={{ width: '100vw', height: '100vh' }}
    />
  )
}
