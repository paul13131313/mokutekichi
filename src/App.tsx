import { useState, useRef, useCallback } from 'react'
import CesiumView, { captureScreenshot } from './components/CesiumView'

export default function App() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [label, setLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const pillarRef = useRef<HTMLDivElement>(null)
  const groundGlowRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [error, setError] = useState('')
  const cesiumRef = useRef<HTMLDivElement>(null)
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)
  const geoInitRef = useRef(false)

  // Init geocoder
  if (!geoInitRef.current) {
    geoInitRef.current = true
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string
    if (apiKey) {
      import('@googlemaps/js-api-loader').then(({ setOptions, importLibrary }) => {
        setOptions({ key: apiKey, v: 'weekly' })
        importLibrary('geocoding').then((lib) => {
          geocoderRef.current = new lib.Geocoder()
        })
      })
    }
  }

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setError('')

    // Try coordinates
    const parts = query.split(',').map(s => s.trim())
    if (parts.length === 2) {
      const lat = parseFloat(parts[0])
      const lng = parseFloat(parts[1])
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90) {
        setCoords({ lat, lng })
        setLabel(`${lat}, ${lng}`)
        setCollapsed(true)
        setLoading(true)
        setTimeout(() => setLoading(false), 2000)
        return
      }
    }

    const geocoder = geocoderRef.current
    if (!geocoder) { setError('少し待ってから再試行してください'); return }

    try {
      const res = await geocoder.geocode({ address: query.trim() })
      if (!res.results?.length) { setError('見つかりませんでした'); return }
      const r = res.results[0]
      setCoords({ lat: r.geometry.location.lat(), lng: r.geometry.location.lng() })
      setLabel(r.formatted_address)
      setCollapsed(true)
      setLoading(true)
      setTimeout(() => setLoading(false), 2000)
    } catch {
      setError('検索に失敗しました')
    }
  }, [query])

  const handleSave = useCallback(async () => {
    const container = cesiumRef.current
    if (!container) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 500))
    try {
      const blob = await captureScreenshot(container)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mokutekichi-${label || 'capture'}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }, [label])

  // All UI is rendered as fixed overlays with pointer-events:none
  // Only interactive elements (buttons, inputs) get pointer-events:auto
  return (
    <div id="cesium-root" style={{ width: '100vw', height: '100vh' }}>
      <CesiumView
        ref={cesiumRef}
        lat={coords?.lat ?? 0}
        lng={coords?.lng ?? 0}
        onScreenPos={(x, y) => {
          // Scale pillar width based on zoom level (y position as proxy)
          // y near bottom of screen = zoomed in = wide
          // y near top or off screen = zoomed out = narrow
          const vh = window.innerHeight
          const ratio = Math.max(0, Math.min(1, y / vh))
          // 3 tiers: close (ratio>0.6) = 1.0, mid (0.3-0.6) = 0.6, far (<0.3) = 0.3
          const scale = ratio > 0.6 ? 1.0 : ratio > 0.3 ? 0.6 : 0.3

          if (pillarRef.current) {
            pillarRef.current.style.left = `${x}px`
            pillarRef.current.style.height = `${y}px`
            pillarRef.current.style.width = `${300 * scale}px`
            pillarRef.current.style.transform = `translateX(-50%) scaleX(1)`
          }
          if (groundGlowRef.current) {
            groundGlowRef.current.style.left = `${x}px`
            groundGlowRef.current.style.top = `${y}px`
            groundGlowRef.current.style.width = `${350 * scale}px`
          }
        }}
      />

      {/* === All overlays below — fixed, pointer-events:none === */}

      {/* Light pillar — position updated via ref (no React re-render) */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 5, pointerEvents: 'none', overflow: 'hidden', display: coords ? 'block' : 'none' }}>
        <div ref={pillarRef} style={{ position: 'absolute', left: 0, top: 0, height: 0, transform: 'translateX(-50%)', width: 300 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center bottom, rgba(255,255,250,0.06) 0%, transparent 60%)', filter: 'blur(20px)' }} />
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 0, top: 0, width: 100, background: 'linear-gradient(to top, rgba(255,255,252,0.2) 0%, rgba(255,255,252,0.12) 40%, transparent 100%)', filter: 'blur(10px)' }} />
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 0, top: 0, width: 36, background: 'linear-gradient(to top, rgba(255,255,253,0.95) 0%, rgba(255,255,255,0.85) 30%, rgba(255,255,255,0.5) 70%, rgba(255,255,255,0.1) 100%)', filter: 'blur(3px)' }} />
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 0, top: 0, width: 12, background: 'linear-gradient(to top, #FFFFFF 0%, rgba(255,255,255,0.92) 40%, rgba(255,255,255,0.4) 85%, transparent 100%)', filter: 'blur(1px)' }} />
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 0, top: 0, width: 4, background: 'linear-gradient(to top, #FFFFFF 0%, #FFFFFF 25%, rgba(255,255,255,0.6) 80%, transparent 100%)' }} />
        </div>
        <div ref={groundGlowRef} style={{ position: 'absolute', left: 0, top: 0, transform: 'translate(-50%, -50%)', width: 350, height: 180, background: 'radial-gradient(ellipse at center, rgba(255,255,250,0.22) 0%, transparent 55%)', filter: 'blur(15px)' }} />
      </div>

      {/* Search form */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20, pointerEvents: 'none', padding: collapsed ? 0 : 16 }}>
        {collapsed ? (
          <div style={{ textAlign: 'center', paddingBottom: 24 }}>
            <button
              onClick={() => setCollapsed(false)}
              style={{ pointerEvents: 'auto', padding: '10px 20px', borderRadius: 999, fontSize: 12, cursor: 'pointer', background: 'rgba(10,10,10,0.8)', backdropFilter: 'blur(16px)', border: '1px solid rgba(0,191,255,0.25)', color: '#00BFFF' }}
            >
              🔍 別の場所を検索
            </button>
          </div>
        ) : (
          <div style={{ maxWidth: 560, margin: '0 auto', borderRadius: 16, padding: 20, background: 'rgba(10,10,10,0.88)', backdropFilter: 'blur(20px)', pointerEvents: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ color: '#00BFFF', fontSize: 14, fontWeight: 300, letterSpacing: 1 }}>目的地という光景</span>
              <span style={{ fontSize: 10, opacity: 0.25 }}>v1.7</span>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSearch() }} style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="住所 or 緯度,経度（例: 東京タワー）"
                style={{ flex: 1, padding: '12px 16px', borderRadius: 8, fontSize: 14, outline: 'none', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#e8e4dc' }}
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                style={{ padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', background: '#00BFFF', color: '#0a0a0a', border: 'none', opacity: (loading || !query.trim()) ? 0.3 : 1 }}
              >
                {loading ? '...' : '検索'}
              </button>
            </form>
            {error && <p style={{ fontSize: 12, marginTop: 8, textAlign: 'center', color: '#ff6b6b' }}>{error}</p>}
          </div>
        )}
      </div>

      {/* Save button */}
      {coords && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 20, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
          {label && (
            <div style={{ pointerEvents: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 12, maxWidth: 280, textAlign: 'right', background: 'rgba(10,10,10,0.8)', backdropFilter: 'blur(10px)', color: '#00BFFF' }}>
              {label}
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ pointerEvents: 'auto', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(0,191,255,0.4)', color: '#00BFFF', opacity: saving ? 0.5 : 1 }}
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
    </div>
  )
}
