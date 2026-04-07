import { useState, useRef, useCallback } from 'react'
import CesiumView from './components/CesiumView'
import { getPoem } from './data/poems'

export default function App() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [label, setLabel] = useState('')
  const [poem, setPoem] = useState('')
  const [loading, setLoading] = useState(false)
  const pillarRef = useRef<HTMLDivElement>(null)
  const groundGlowRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [error, setError] = useState('')
  const cesiumRef = useRef<HTMLDivElement>(null)

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
        setPoem(getPoem(`${lat}, ${lng}`))
        setCollapsed(true)
        setLoading(true)
        setTimeout(() => setLoading(false), 2000)
        return
      }
    }

    // Nominatim (OpenStreetMap) Geocoding — APIキー不要
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&limit=1&accept-language=ja`
      const res = await fetch(url, { headers: { 'User-Agent': 'mokutekichi-app' } })
      if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`)
      const data = await res.json()
      if (!data.length) { setError('見つかりませんでした'); return }
      const r = data[0]
      const lat = parseFloat(r.lat)
      const lng = parseFloat(r.lon)
      const raw = r.display_name as string
      // Nominatimは欧米式(小→大)で返すので、日本の住所は逆順にする
      const parts = raw.split(', ')
      const isJapan = parts.some(p => p === '日本' || p === 'Japan')
      const displayName = isJapan ? parts.reverse().join(' ') : raw
      setCoords({ lat, lng })
      setLabel(displayName)
      setPoem(getPoem(raw))
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
    try {
      // キャプチャ前にstateを変更しない（再レンダリングでカメラが動くのを防ぐ）
      const cesiumCanvas = container.querySelector('canvas')
      if (!cesiumCanvas) throw new Error('Canvas not found')

      const w = cesiumCanvas.width
      const h = cesiumCanvas.height

      // Composite canvas: Cesium + light pillar
      const out = document.createElement('canvas')
      out.width = w
      out.height = h
      const ctx = out.getContext('2d')!

      // 1. Draw Cesium scene
      ctx.drawImage(cesiumCanvas, 0, 0)

      // 2. Draw light pillar on top
      const pillar = pillarRef.current
      if (pillar && coords) {
        const rect = cesiumCanvas.getBoundingClientRect()
        const scaleX = w / rect.width
        const scaleY = h / rect.height

        const pLeft = parseFloat(pillar.style.left || '0')
        const pHeight = parseFloat(pillar.style.height || '0')
        const pWidth = parseFloat(pillar.style.width || '300')
        const cx = pLeft * scaleX
        const baseY = pHeight * scaleY

        // Draw layered glow (matching CSS layers)
        const layers = [
          { width: pWidth, alpha: 0.06, blur: 20 },
          { width: pWidth * 0.33, alpha: 0.2, blur: 10 },
          { width: pWidth * 0.12, alpha: 0.85, blur: 3 },
          { width: pWidth * 0.04, alpha: 0.92, blur: 1 },
          { width: pWidth * 0.013, alpha: 1.0, blur: 0 },
        ]

        for (const layer of layers) {
          const lw = layer.width * scaleX
          const grad = ctx.createLinearGradient(0, 0, 0, baseY)
          grad.addColorStop(0, `rgba(255,255,255,0)`)
          grad.addColorStop(0.2, `rgba(255,255,255,${layer.alpha * 0.3})`)
          grad.addColorStop(0.5, `rgba(255,255,255,${layer.alpha * 0.7})`)
          grad.addColorStop(1.0, `rgba(255,255,253,${layer.alpha})`)

          ctx.save()
          if (layer.blur > 0) ctx.filter = `blur(${layer.blur * scaleX * 0.5}px)`
          ctx.fillStyle = grad
          ctx.fillRect(cx - lw / 2, 0, lw, baseY)
          ctx.restore()
        }

        // Ground glow
        const glowR = 175 * scaleX
        const groundGrad = ctx.createRadialGradient(cx, baseY, 0, cx, baseY, glowR)
        groundGrad.addColorStop(0, 'rgba(255,255,250,0.22)')
        groundGrad.addColorStop(1, 'rgba(255,255,250,0)')
        ctx.save()
        ctx.filter = `blur(${15 * scaleX * 0.5}px)`
        ctx.fillStyle = groundGrad
        ctx.fillRect(cx - glowR, baseY - glowR, glowR * 2, glowR * 2)
        ctx.restore()
      }

      // 3. Draw poem text (left side, away from pillar)
      if (poem) {
        const rect = cesiumCanvas.getBoundingClientRect()
        const scaleX = w / rect.width
        const poemFontSize = Math.round(24 * scaleX)
        const poemLines = poem.split('、').map((s, i, arr) =>
          s.trim() + (i < arr.length - 1 ? '、' : '')
        )
        ctx.save()
        ctx.font = `400 ${poemFontSize}px 'Noto Serif JP', serif`
        ctx.fillStyle = '#FFFFFF'
        ctx.shadowColor = 'rgba(0,0,0,0.8)'
        ctx.shadowBlur = 16 * scaleX
        ctx.textAlign = 'left'
        const x = 40 * scaleX
        let y = 56 * scaleX
        for (const line of poemLines) {
          ctx.fillText(line, x, y + poemFontSize)
          y += poemFontSize * 1.6
        }
        ctx.restore()
      }

      // 4. Draw address label (bottom left)
      if (label) {
        const rect = cesiumCanvas.getBoundingClientRect()
        const scaleX = w / rect.width
        const labelFontSize = Math.round(11 * scaleX)
        ctx.save()
        ctx.font = `300 ${labelFontSize}px 'Noto Sans JP', sans-serif`
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.shadowColor = 'rgba(0,0,0,0.8)'
        ctx.shadowBlur = 8 * scaleX
        ctx.textAlign = 'left'
        ctx.fillText(label, 24 * scaleX, h - 40 * scaleX)
        ctx.restore()
      }

      // Export
      const blob = await new Promise<Blob>((resolve, reject) => {
        out.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png')
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mokutekichi-${label || 'capture'}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    }
  }, [label, coords, poem])

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
              <span style={{ color: '#00BFFF', fontSize: 14, fontWeight: 300, letterSpacing: 1 }}>マンションポエムメーカー</span>
              <span style={{ fontSize: 10, opacity: 0.25 }}>v3.3</span>
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

      {/* Poem overlay — large typography like real estate ads */}
      {coords && poem && (
        <div id="poem-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10, pointerEvents: 'none', padding: '40px 32px 0' }}>
          <div style={{ maxWidth: '80vw', textAlign: 'left', textShadow: '0 2px 20px rgba(0,0,0,0.8), 0 0 60px rgba(0,0,0,0.5)' }}>
            {poem.split('、').map((s, i, arr) => (
              <p key={i} style={{
                fontSize: 'clamp(18px, 2.5vw, 28px)',
                fontFamily: "'Noto Serif JP', 'Hiragino Mincho ProN', serif",
                fontWeight: 400,
                lineHeight: 1.5,
                letterSpacing: 3,
                color: '#FFFFFF',
                marginBottom: 4,
              }}>
                {s.trim()}{i < arr.length - 1 ? '、' : ''}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Address label — bottom left */}
      {coords && label && (
        <div style={{ position: 'fixed', bottom: 80, left: 24, zIndex: 10, pointerEvents: 'none', maxWidth: 350 }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}>
            {label}
          </p>
        </div>
      )}

      {/* Action buttons — bottom right */}
      {coords && (
        <div style={{ position: 'fixed', bottom: 80, right: 24, zIndex: 20, pointerEvents: 'none', display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              const el = cesiumRef.current as HTMLDivElement & { recenter?: () => void }
              el?.recenter?.()
            }}
            style={{ pointerEvents: 'auto', padding: '10px 16px', borderRadius: 8, fontSize: 14, cursor: 'pointer', background: 'rgba(10,10,10,0.7)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
          >
            ◎
          </button>
          <button
            onClick={handleSave}
            style={{ pointerEvents: 'auto', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', background: 'rgba(10,10,10,0.7)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
          >
            📷 画像を保存
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
