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

    // Layer 1: Very wide soft haze (white, subtle)
    viewer.entities.add({
      position,
      cylinder: {
        length: PILLAR_HEIGHT * 1.1,
        topRadius: PILLAR_RADIUS * 3,
        bottomRadius: PILLAR_RADIUS * 5,
        material: new ColorMaterialProperty(
          Color.WHITE.withAlpha(0.06)
        ),
        outline: false,
      },
    })

    // Layer 2: Wide outer glow (warm white)
    viewer.entities.add({
      position,
      cylinder: {
        length: PILLAR_HEIGHT,
        topRadius: PILLAR_RADIUS * 1.5,
        bottomRadius: PILLAR_RADIUS * 3,
        material: new ColorMaterialProperty(
          Color.fromCssColorString('#E8F4FF').withAlpha(0.15)
        ),
        outline: false,
      },
    })

    // Layer 3: Mid glow (bright white)
    viewer.entities.add({
      position,
      cylinder: {
        length: PILLAR_HEIGHT,
        topRadius: PILLAR_RADIUS * 0.6,
        bottomRadius: PILLAR_RADIUS * 1.5,
        material: new ColorMaterialProperty(
          Color.WHITE.withAlpha(0.4)
        ),
        outline: false,
      },
    })

    // Layer 4: Bright core (pure white, high opacity)
    viewer.entities.add({
      position,
      cylinder: {
        length: PILLAR_HEIGHT,
        topRadius: PILLAR_RADIUS * 0.2,
        bottomRadius: PILLAR_RADIUS * 0.7,
        material: new ColorMaterialProperty(
          Color.WHITE.withAlpha(0.8)
        ),
        outline: false,
      },
    })

    // Layer 5: Ultra-bright inner core
    viewer.entities.add({
      position,
      cylinder: {
        length: PILLAR_HEIGHT,
        topRadius: PILLAR_RADIUS * 0.05,
        bottomRadius: PILLAR_RADIUS * 0.3,
        material: new ColorMaterialProperty(
          Color.WHITE.withAlpha(0.95)
        ),
        outline: false,
      },
    })

    // Ground glow (wide haze)
    viewer.entities.add({
      position: Cartesian3.fromDegrees(lng, lat, 2),
      ellipse: {
        semiMinorAxis: 200,
        semiMajorAxis: 200,
        material: new ColorMaterialProperty(
          Color.WHITE.withAlpha(0.08)
        ),
        height: 1,
      },
    })

    // Ground glow (inner bright)
    viewer.entities.add({
      position: Cartesian3.fromDegrees(lng, lat, 3),
      ellipse: {
        semiMinorAxis: 60,
        semiMajorAxis: 60,
        material: new ColorMaterialProperty(
          Color.WHITE.withAlpha(0.35)
        ),
        height: 2,
      },
    })

    // PostProcess: darken dark areas (night), boost bright areas (glow)
    const stages = viewer.scene.postProcessStages
    stages.removeAll()
    stages.add(
      new PostProcessStage({
        fragmentShader: `
          uniform sampler2D colorTexture;
          in vec2 v_textureCoordinates;
          void main() {
            vec4 color = texture(colorTexture, v_textureCoordinates);
            float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));

            // Dark areas: crush to near-black (night effect)
            // Bright areas: boost to white (glow effect)
            float darkFactor = 0.25; // how dark the shadows get
            float glowThreshold = 0.35;
            float glowBoost = 2.5;

            if (luminance > glowThreshold) {
              // Bright pixel: boost toward white
              float t = smoothstep(glowThreshold, 0.8, luminance);
              vec3 boosted = mix(color.rgb, vec3(1.0), t * 0.7);
              out_FragColor = vec4(boosted * glowBoost, color.a);
              out_FragColor = vec4(min(out_FragColor.rgb, vec3(1.0)), color.a);
            } else {
              // Dark pixel: crush to night
              float t = luminance / glowThreshold;
              vec3 darkened = color.rgb * darkFactor * t;
              // Slight blue tint for night atmosphere
              darkened += vec3(0.0, 0.005, 0.015) * (1.0 - t);
              out_FragColor = vec4(darkened, color.a);
            }
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
