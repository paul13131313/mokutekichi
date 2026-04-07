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
const R = 20 // base radius

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
      viewer.destroy()
      viewerRef.current = null
    }
  }, [])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !lat || !lng) return

    viewer.entities.removeAll()

    const pos = Cartesian3.fromDegrees(lng, lat, PILLAR_HEIGHT / 2)

    // Compensate for PostProcess darkening (×0.22):
    // To appear as brightness X after PostProcess, set entity to X / 0.22
    // For white (1.0) after PP: need 1.0/0.22 ≈ 4.5 → clamp to 1.0 with alpha=1.0
    // Since we can't go above 1.0 in color, we stack multiple fully opaque layers

    // Layer 1: Wide soft outer (will appear as dim glow after PP)
    viewer.entities.add({
      position: pos,
      cylinder: {
        length: PILLAR_HEIGHT,
        topRadius: R * 4,
        bottomRadius: R * 6,
        material: new ColorMaterialProperty(Color.WHITE),
        outline: false,
      },
    })

    // Layer 2: Mid
    viewer.entities.add({
      position: pos,
      cylinder: {
        length: PILLAR_HEIGHT,
        topRadius: R * 2,
        bottomRadius: R * 3.5,
        material: new ColorMaterialProperty(Color.WHITE),
        outline: false,
      },
    })

    // Layer 3: Core
    viewer.entities.add({
      position: pos,
      cylinder: {
        length: PILLAR_HEIGHT,
        topRadius: R * 0.8,
        bottomRadius: R * 1.5,
        material: new ColorMaterialProperty(Color.WHITE),
        outline: false,
      },
    })

    // Layer 4: Inner
    viewer.entities.add({
      position: pos,
      cylinder: {
        length: PILLAR_HEIGHT,
        topRadius: R * 0.2,
        bottomRadius: R * 0.6,
        material: new ColorMaterialProperty(Color.WHITE),
        outline: false,
      },
    })

    // Ground glow
    viewer.entities.add({
      position: Cartesian3.fromDegrees(lng, lat, 2),
      ellipse: {
        semiMinorAxis: 150,
        semiMajorAxis: 150,
        material: new ColorMaterialProperty(Color.WHITE.withAlpha(0.8)),
        height: 1,
      },
    })

    viewer.entities.add({
      position: Cartesian3.fromDegrees(lng, lat, 3),
      ellipse: {
        semiMinorAxis: 50,
        semiMajorAxis: 50,
        material: new ColorMaterialProperty(Color.WHITE),
        height: 2,
      },
    })

    // PostProcess: darken everything uniformly, then re-boost bright pixels
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

            // Darken everything
            vec3 dark = color.rgb * 0.22;
            // Subtle blue-black tint
            dark += vec3(0.002, 0.004, 0.008);

            // Bright areas (light pillar = white entities, lum close to 1.0)
            // Restore them to full brightness
            // The white entities have lum ≈ 1.0, buildings have lum ≈ 0.3-0.7
            float t = smoothstep(0.92, 1.0, lum);
            vec3 result = mix(dark, vec3(1.0, 1.0, 0.97), t);

            out_FragColor = vec4(result, color.a);
          }
        `,
      })
    )

    // Camera
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
