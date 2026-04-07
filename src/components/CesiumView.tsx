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

    const position = Cartesian3.fromDegrees(lng, lat, PILLAR_HEIGHT / 2)

    // Layer 1: Wide outer glow (soft cyan)
    viewer.entities.add({
      position,
      cylinder: {
        length: PILLAR_HEIGHT,
        topRadius: PILLAR_RADIUS * 0.8,
        bottomRadius: PILLAR_RADIUS * 2.5,
        material: new ColorMaterialProperty(
          Color.fromCssColorString('#00BFFF').withAlpha(0.15)
        ),
        outline: false,
      },
    })

    // Layer 2: Mid glow (bright cyan-white)
    viewer.entities.add({
      position,
      cylinder: {
        length: PILLAR_HEIGHT,
        topRadius: PILLAR_RADIUS * 0.4,
        bottomRadius: PILLAR_RADIUS * 1.2,
        material: new ColorMaterialProperty(
          Color.fromCssColorString('#80DFFF').withAlpha(0.45)
        ),
        outline: false,
      },
    })

    // Layer 3: Bright core (white, high opacity)
    viewer.entities.add({
      position,
      cylinder: {
        length: PILLAR_HEIGHT,
        topRadius: PILLAR_RADIUS * 0.15,
        bottomRadius: PILLAR_RADIUS * 0.6,
        material: new ColorMaterialProperty(
          Color.fromCssColorString('#FFFFFF').withAlpha(0.85)
        ),
        outline: false,
      },
    })

    // Layer 4: Ultra-bright inner core (pure white)
    viewer.entities.add({
      position,
      cylinder: {
        length: PILLAR_HEIGHT,
        topRadius: PILLAR_RADIUS * 0.05,
        bottomRadius: PILLAR_RADIUS * 0.25,
        material: new ColorMaterialProperty(
          Color.WHITE.withAlpha(0.95)
        ),
        outline: false,
      },
    })

    // Ground glow (wide, soft)
    viewer.entities.add({
      position: Cartesian3.fromDegrees(lng, lat, 2),
      ellipse: {
        semiMinorAxis: 120,
        semiMajorAxis: 120,
        material: new ColorMaterialProperty(
          Color.fromCssColorString('#00BFFF').withAlpha(0.2)
        ),
        height: 1,
      },
    })

    // Ground glow (inner, bright)
    viewer.entities.add({
      position: Cartesian3.fromDegrees(lng, lat, 3),
      ellipse: {
        semiMinorAxis: 40,
        semiMajorAxis: 40,
        material: new ColorMaterialProperty(
          Color.WHITE.withAlpha(0.4)
        ),
        height: 2,
      },
    })

    // Darken surroundings via post-process brightness/contrast
    const stages = viewer.scene.postProcessStages
    // Remove any existing custom stages
    stages.removeAll()
    stages.add(
      new PostProcessStage({
        fragmentShader: `
          uniform sampler2D colorTexture;
          in vec2 v_textureCoordinates;
          void main() {
            vec4 color = texture(colorTexture, v_textureCoordinates);
            // Darken: reduce brightness to 60%, then boost contrast slightly
            vec3 darkened = color.rgb * 0.6;
            // Increase contrast around highlights to make bright things pop
            vec3 contrasted = (darkened - 0.3) * 1.4 + 0.3;
            out_FragColor = vec4(max(contrasted, vec3(0.0)), color.a);
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
