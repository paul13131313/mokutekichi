import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import {
  Viewer,
  Cartesian3,
  Color,
  HeadingPitchRoll,
  Math as CesiumMath,
  Cesium3DTileset,
  Resource,
  PostProcessStage,
} from 'cesium'
import '@cesium/widgets/Source/widgets.css'

interface Props {
  lat: number
  lng: number
  onScreenPos?: (x: number, y: number) => void
}

const CAMERA_DISTANCE_SOUTH = 800
const CAMERA_ALTITUDE = 500
const CAMERA_PITCH = -35

const CesiumView = forwardRef<HTMLDivElement, Props>(({ lat, lng, onScreenPos }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const removeListenerRef = useRef<(() => void) | null>(null)

  useImperativeHandle(ref, () => containerRef.current!)

  useEffect(() => {
    if (!containerRef.current) return

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string
    if (!apiKey) return

    const viewer = new Viewer(containerRef.current, {
      timeline: false,
      animation: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      selectionIndicator: false,
      navigationHelpButton: false,
      infoBox: false,
      requestRenderMode: false,
      contextOptions: {
        webgl: { preserveDrawingBuffer: true },
      },
    })

    viewer.imageryLayers.removeAll()

    const resource = new Resource({
      url: 'https://tile.googleapis.com/v1/3dtiles/root.json',
      queryParameters: { key: apiKey },
    })

    Cesium3DTileset.fromUrl(resource).then((tileset) => {
      viewer.scene.primitives.add(tileset)
    }).catch((err: unknown) => {
      console.error('Failed to load Google 3D Tiles:', err)
    })

    viewer.scene.globe.show = true
    viewer.scene.globe.baseColor = Color.fromCssColorString('#0a0a0f')

    viewerRef.current = viewer

    return () => {
      if (removeListenerRef.current) removeListenerRef.current()
      viewer.destroy()
      viewerRef.current = null
    }
  }, [])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !lat || !lng) return

    if (removeListenerRef.current) {
      removeListenerRef.current()
      removeListenerRef.current = null
    }

    // PostProcess: darken to night
    const stages = viewer.scene.postProcessStages
    stages.removeAll()
    stages.add(
      new PostProcessStage({
        fragmentShader: `
          uniform sampler2D colorTexture;
          in vec2 v_textureCoordinates;
          void main() {
            vec4 color = texture(colorTexture, v_textureCoordinates);
            vec3 night = color.rgb * 0.22;
            night += vec3(0.003, 0.005, 0.01);
            out_FragColor = vec4(night, color.a);
          }
        `,
      })
    )

    // Camera
    const targetLat = lat - (CAMERA_DISTANCE_SOUTH / 111320)
    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(lng, targetLat, CAMERA_ALTITUDE),
      orientation: new HeadingPitchRoll(
        CesiumMath.toRadians(0),
        CesiumMath.toRadians(CAMERA_PITCH),
        0
      ),
    })

    // Track screen position every frame
    const targetCartesian = Cartesian3.fromDegrees(lng, lat, 30)
    const listener = viewer.scene.postRender.addEventListener(() => {
      if (!onScreenPos) return
      const screenPos = viewer.scene.cartesianToCanvasCoordinates(targetCartesian)
      if (screenPos) {
        const canvas = viewer.scene.canvas
        const xPx = (screenPos.x / canvas.width) * window.innerWidth
        const yPx = (screenPos.y / canvas.height) * window.innerHeight
        onScreenPos(xPx, yPx)
      }
    })
    removeListenerRef.current = () => listener()
  }, [lat, lng, onScreenPos])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    />
  )
})

CesiumView.displayName = 'CesiumView'
export default CesiumView

export function captureScreenshot(containerEl: HTMLDivElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = containerEl.querySelector('canvas')
    if (!canvas) {
      reject(new Error('Canvas not found'))
      return
    }
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Failed to capture screenshot'))
    }, 'image/png')
  })
}
