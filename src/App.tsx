import { useState, useRef, useCallback } from 'react'
import CesiumView, { captureScreenshot } from './components/CesiumView'
import SearchForm from './components/SearchForm'
import LightPillar from './components/LightPillar'

export default function App() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [label, setLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pillarX, setPillarX] = useState(0)
  const [pillarY, setPillarY] = useState(0)
  const cesiumContainerRef = useRef<HTMLDivElement>(null)

  const handleSearch = useCallback((lat: number, lng: number, newLabel: string) => {
    setLoading(true)
    setCoords({ lat, lng })
    setLabel(newLabel)
    setTimeout(() => setLoading(false), 2000)
  }, [])

  const handleSave = useCallback(async () => {
    const container = cesiumContainerRef.current
    if (!container) return
    setSaving(true)
    await new Promise((r) => setTimeout(r, 500))

    try {
      const blob = await captureScreenshot(container)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mokutekichi-${label || 'capture'}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Screenshot failed:', err)
    } finally {
      setSaving(false)
    }
  }, [label])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Cesium 3D View */}
      <div ref={cesiumContainerRef} style={{ width: '100%', height: '100%' }}>
        <CesiumView
          lat={coords?.lat ?? 0}
          lng={coords?.lng ?? 0}
          onScreenPos={(x, y) => { setPillarX(x); setPillarY(y) }}
        />
      </div>

      {/* Light Pillar — CSS overlay, position tracked from Cesium postRender */}
      <LightPillar visible={!!coords} xPx={pillarX} yPx={pillarY} />

      {/* Search Form */}
      <SearchForm onSearch={handleSearch} loading={loading} hasResult={!!coords} />

      {/* Save button */}
      {coords && (
        <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-3">
          {label && (
            <div
              className="px-4 py-2 rounded-lg text-xs max-w-xs text-right"
              style={{ background: 'rgba(10,10,10,0.8)', backdropFilter: 'blur(10px)', color: '#00BFFF' }}
            >
              {label}
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer disabled:opacity-50"
            style={{
              background: 'rgba(10,10,10,0.85)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(0,191,255,0.4)',
              color: '#00BFFF',
            }}
          >
            {saving ? '保存中...' : '📷 画像を保存'}
          </button>
        </div>
      )}

      {/* Initial state */}
      {!coords && (
        <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
          <p className="text-lg opacity-20">住所を入力して光の柱を立てよう</p>
        </div>
      )}
    </div>
  )
}
