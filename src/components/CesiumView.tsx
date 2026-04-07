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
    // Warm white with a hint of lemon: #FFFEF0
    const warmWhite = Color.fromCssColorString('#FFFEF0')

    // Layer 1: Ultra-wide atmospheric haze
    viewer.entities.add({
      position,
      cylinder: {
        length: PILLAR_HEIGHT * 1.2,
        topRadius: PILLAR_RADIUS * 6,
        bottomRadius: PILLAR_RADIUS * 10,
        material: new ColorMaterialProperty(warmWhite.withAlpha(0.04)),
        outline: false,
      },
    })

    // Layer 2: Wide soft glow
    viewer.entities.add({
      position,
      cylinder: {
        length: PILLAR_HEIGHT * 1.1,
        topRadius: PILLAR_RADIUS * 4,
        bottomRadius: PILLAR_RADIUS * 7,
        material: new ColorMaterialProperty(warmWhite.withAlpha(0.07)),
        outline: false,
      },
    })

    // Layer 3: Mid-wide glow
    viewer.entities.add({
      position,
      cylinder: {
        length: PILLAR_HEIGHT,
        topRadius: PILLAR_RADIUS * 2,
        bottomRadius: PILLAR_RADIUS * 4,
        material: new ColorMaterialProperty(warmWhite.withAlpha(0.12)),
        outline: false,
      },
    })

    // Layer 4: Mid glow
    viewer.entities.add({
      position,
      cylinder: {
        length: PILLAR_HEIGHT,
        topRadius: PILLAR_RADIUS * 1,
        bottomRadius: PILLAR_RADIUS * 2.2,
        material: new ColorMaterialProperty(Color.WHITE.withAlpha(0.25)),
        outline: false,
      },
    })

    // Layer 5: Bright body
    viewer.entities.add({
      position,
      cylinder: {
        length: PILLAR_HEIGHT,
        topRadius: PILLAR_RADIUS * 0.4,
        bottomRadius: PILLAR_RADIUS * 1.0,
        material: new ColorMaterialProperty(Color.WHITE.withAlpha(0.55)),
        outline: false,
      },
    })

    // Layer 6: Hot core
    viewer.entities.add({
      position,
      cylinder: {
        length: PILLAR_HEIGHT,
        topRadius: PILLAR_RADIUS * 0.12,
        bottomRadius: PILLAR_RADIUS * 0.5,
        material: new ColorMaterialProperty(Color.WHITE.withAlpha(0.85)),
        outline: false,
      },
    })

    // Layer 7: Burning center
    viewer.entities.add({
      position,
      cylinder: {
        length: PILLAR_HEIGHT,
        topRadius: PILLAR_RADIUS * 0.03,
        bottomRadius: PILLAR_RADIUS * 0.2,
        material: new ColorMaterialProperty(Color.WHITE.withAlpha(0.98)),
        outline: false,
      },
    })

    // Ground haze (very wide)
    viewer.entities.add({
      position: Cartesian3.fromDegrees(lng, lat, 2),
      ellipse: {
        semiMinorAxis: 300,
        semiMajorAxis: 300,
        material: new ColorMaterialProperty(warmWhite.withAlpha(0.05)),
        height: 1,
      },
    })

    // Ground glow (mid)
    viewer.entities.add({
      position: Cartesian3.fromDegrees(lng, lat, 3),
      ellipse: {
        semiMinorAxis: 100,
        semiMajorAxis: 100,
        material: new ColorMaterialProperty(Color.WHITE.withAlpha(0.18)),
        height: 2,
      },
    })

    // Ground glow (inner hot)
    viewer.entities.add({
      position: Cartesian3.fromDegrees(lng, lat, 4),
      ellipse: {
        semiMinorAxis: 35,
        semiMajorAxis: 35,
        material: new ColorMaterialProperty(Color.WHITE.withAlpha(0.5)),
        height: 3,
      },
    })

    // PostProcess: blue-tinted night + white glow boost
    const stages = viewer.scene.postProcessStages
    stages.removeAll()
    stages.add(
      new PostProcessStage({
        fragmentShader: `
          uniform sampler2D colorTexture;
          in vec2 v_textureCoordinates;
          void main() {
            vec4 color = texture(colorTexture, v_textureCoordinates);
            float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));

            // Night: darken + blue tint
            vec3 night = color.rgb * 0.25;
            night.r *= 0.8;  // reduce red
            night.b *= 1.3;  // boost blue
            night += vec3(0.01, 0.015, 0.04); // blue ambient

            // Glow: smoothly transition from night to blazing white
            // Start transition at lum=0.4, full white at lum=0.9
            float t = smoothstep(0.4, 0.9, lum);
            // Warm white target with very slight lemon
            vec3 glowColor = vec3(1.0, 1.0, 0.96);
            vec3 result = mix(night, glowColor, t);

            out_FragColor = vec4(result, color.a);
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
