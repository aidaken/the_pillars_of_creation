import { useEffect, useRef } from 'react'
import { SceneManager } from './scene/SceneManager'
import { createStarField } from './scene/StarField'
import { createPillars } from './scene/Pillars'
import { createNebulaBg } from './scene/NebulaBg'
import { addLights } from './scene/lights'
import { createControls } from './scene/controls'

export default function App() {
  const canvasRef = useRef(null)
  const pillarsRef = useRef([])
  const nebulaBgRef = useRef(null)

  useEffect(() => {
    const sceneManager = new SceneManager(canvasRef.current)
    const controls = createControls(sceneManager.camera, sceneManager.renderer.domElement)

    nebulaBgRef.current = createNebulaBg(sceneManager.scene)
    sceneManager.add(createStarField())
    addLights(sceneManager.scene)

    pillarsRef.current = createPillars(sceneManager.scene)

    sceneManager.start(controls)

    return () => {
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
