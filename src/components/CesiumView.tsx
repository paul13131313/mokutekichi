import { useEffect, useRef } from 'react'
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
}

const CAMERA_DISTANCE_SOUTH = 800
const CAMERA_ALTITUDE = 500
const CAMERA_PITCH = -35


export default function CesiumView({ lat, lng }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Viewer | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string
    if (!apiKey) {
      console.error('VITE_GOOGLE_MAPS_API_KEY is not set')
      return
    }

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
        webgl: {
          preserveDrawingBuffer: true,
        },
      },
    })

    // Remove default imagery
    viewer.imageryLayers.removeAll()

    // Google Photorealistic 3D Tiles via Map Tiles API
    const resource = new Resource({
      url: 'https://tile.googleapis.com/v1/3dtiles/root.json',
      queryParameters: { key: apiKey },
    })

    Cesium3DTileset.fromUrl(resource).then((tileset) => {
      viewer.scene.primitives.add(tileset)
    }).catch((err: unknown) => {
      console.error('Failed to load Google 3D Tiles:', err)
    })

    // Globe visible as fallback under 3D tiles
    viewer.scene.globe.show = true
    viewer.scene.globe.baseColor = Color.fromCssColorString('#1a1a2e')

    viewerRef.current = viewer

    return () => {
      viewer.destroy()
      viewerRef.current = null
    }
  }, [])

  // Update camera and pillar when coordinates change
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !lat || !lng) return

    viewer.entities.removeAll()

    // PostProcess: blue-tinted night (darken only, no glow logic)
    const stages = viewer.scene.postProcessStages
    stages.removeAll()
    stages.add(
      new PostProcessStage({
        fragmentShader: `
          uniform sampler2D colorTexture;
          in vec2 v_textureCoordinates;
          void main() {
            vec4 color = texture(colorTexture, v_textureCoordinates);
            // Darken to 25%
            vec3 night = color.rgb * 0.25;
            // Blue tint
            night.r *= 0.75;
            night.b *= 1.35;
            night += vec3(0.008, 0.012, 0.035);
            out_FragColor = vec4(night, color.a);
          }
        `,
      })
    )

    // Camera: south of target, looking north-up
    const targetLat = lat - (CAMERA_DISTANCE_SOUTH / 111320)
    const cameraPosition = Cartesian3.fromDegrees(lng, targetLat, CAMERA_ALTITUDE)

    viewer.camera.setView({
      destination: cameraPosition,
      orientation: new HeadingPitchRoll(
        CesiumMath.toRadians(0),
        CesiumMath.toRadians(CAMERA_PITCH),
        0
      ),
    })
  }, [lat, lng])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
    />
  )
}

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
