import { useEffect, useRef } from 'react'
import { SceneManager } from './scene/SceneManager'
import { createStarField } from './scene/StarField'
import { createPillarPlaceholder } from './scene/PillarPlaceholder'
import { addLights } from './scene/lights'
import { createControls } from './scene/controls'

export default function App() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const sceneManager = new SceneManager(canvasRef.current)
    const controls = createControls(sceneManager.camera, sceneManager.renderer.domElement)

    sceneManager.add(createStarField())
    sceneManager.add(createPillarPlaceholder())
    addLights(sceneManager.scene)

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
