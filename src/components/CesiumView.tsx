import { useEffect, useRef } from 'react'
import {
  Viewer,
  Cartesian3,
  Color,
  HeadingPitchRoll,
  Math as CesiumMath,
  ColorMaterialProperty,
  Cesium3DTileset,
  Resource,
} from 'cesium'
import '@cesium/widgets/Source/widgets.css'

interface Props {
  lat: number
  lng: number
}

const CAMERA_DISTANCE_SOUTH = 800
const CAMERA_ALTITUDE = 500
const CAMERA_PITCH = -35

const PILLAR_HEIGHT = 2000
const PILLAR_RADIUS = 20

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

    // Outer pillar (cyan, semi-transparent)
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

    // Inner glow pillar (white)
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

    // Ground glow circle
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
