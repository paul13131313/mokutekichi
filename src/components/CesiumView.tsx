import { useEffect, useRef } from 'react'
import {
  Viewer,
  Cartesian3,
  Color,
  HeadingPitchRoll,
  Math as CesiumMath,
  ColorMaterialProperty,
  createGooglePhotorealistic3DTileset,
} from 'cesium'
import '@cesium/widgets/Source/widgets.css'

interface Props {
  lat: number
  lng: number
  onReady?: () => void
}

// Camera: 800m south, 500m altitude, pitch -35 degrees
const CAMERA_DISTANCE_SOUTH = 800
const CAMERA_ALTITUDE = 500
const CAMERA_PITCH = -35

// Light pillar
const PILLAR_HEIGHT = 2000
const PILLAR_RADIUS = 20

export default function CesiumView({ lat, lng, onReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Viewer | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
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
          preserveDrawingBuffer: true, // Required for screenshots
        },
      },
    })

    // Remove default imagery
    viewer.imageryLayers.removeAll()

    // Add Google Photorealistic 3D Tiles
    createGooglePhotorealistic3DTileset(apiKey).then((tileset) => {
      viewer.scene.primitives.add(tileset)
      onReady?.()
    }).catch((err) => {
      console.error('Failed to load Google 3D Tiles:', err)
    })

    // Disable atmosphere/sky for cleaner look
    if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = true
    viewer.scene.globe.show = false // Globe hidden when using 3D tiles

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

    // Remove existing entities
    viewer.entities.removeAll()

    // Add light pillar
    const position = Cartesian3.fromDegrees(lng, lat, PILLAR_HEIGHT / 2)
    viewer.entities.add({
      position,
      cylinder: {
        length: PILLAR_HEIGHT,
        topRadius: PILLAR_RADIUS * 0.3,
        bottomRadius: PILLAR_RADIUS,
        material: new ColorMaterialProperty(
          Color.fromCssColorString('#00BFFF').withAlpha(0.5)
        ),
        outline: false,
      },
    })

    // Add brighter inner glow pillar
    viewer.entities.add({
      position,
      cylinder: {
        length: PILLAR_HEIGHT,
        topRadius: PILLAR_RADIUS * 0.1,
        bottomRadius: PILLAR_RADIUS * 0.5,
        material: new ColorMaterialProperty(
          Color.fromCssColorString('#FFFFFF').withAlpha(0.35)
        ),
        outline: false,
      },
    })

    // Add ground glow circle
    viewer.entities.add({
      position: Cartesian3.fromDegrees(lng, lat, 2),
      ellipse: {
        semiMinorAxis: 60,
        semiMajorAxis: 60,
        material: new ColorMaterialProperty(
          Color.fromCssColorString('#00BFFF').withAlpha(0.3)
        ),
        height: 1,
      },
    })

    // Camera position: south of target
    const targetLat = lat - (CAMERA_DISTANCE_SOUTH / 111320)
    const cameraPosition = Cartesian3.fromDegrees(lng, targetLat, CAMERA_ALTITUDE)

    viewer.camera.setView({
      destination: cameraPosition,
      orientation: new HeadingPitchRoll(
        CesiumMath.toRadians(0), // heading: north
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
