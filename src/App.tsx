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
  const cesiumRef = useRef<HTMLDivElement>(null)

  const handleSearch = useCallback((lat: number, lng: number, newLabel: string) => {
    setLoading(true)
    setCoords({ lat, lng })
    setLabel(newLabel)
    setTimeout(() => setLoading(false), 2000)
  }, [])

  const handleSave = useCallback(async () => {
    const container = cesiumRef.current
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
    <>
      {/* Cesium — base layer, fills viewport */}
      <CesiumView
        ref={cesiumRef}
        lat={coords?.lat ?? 0}
        lng={coords?.lng ?? 0}
        onScreenPos={(x, y) => { setPillarX(x); setPillarY(y) }}
      />

      {/* Light Pillar — pure visual, no interaction */}
      <LightPillar visible={!!coords} xPx={pillarX} yPx={pillarY} />

      {/* Search Form */}
      <SearchForm onSearch={handleSearch} loading={loading} hasResult={!!coords} />

      {/* Save button */}
      {coords && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12, pointerEvents: 'auto' }}>
          {label && (
            <div
              style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, maxWidth: 280, textAlign: 'right', background: 'rgba(10,10,10,0.8)', backdropFilter: 'blur(10px)', color: '#00BFFF' }}
            >
              {label}
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer',
              background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(0,191,255,0.4)', color: '#00BFFF',
              opacity: saving ? 0.5 : 1,
            }}
          >
            {saving ? '保存中...' : '📷 画像を保存'}
          </button>
        </div>
      )}

      {/* Initial message */}
      {!coords && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 1 }}>
          <p style={{ fontSize: 18, opacity: 0.2 }}>住所を入力して光の柱を立てよう</p>
        </div>
      )}
    </>
  )
}
