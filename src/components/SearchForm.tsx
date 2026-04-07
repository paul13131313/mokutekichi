import { useState, useCallback, useEffect, useRef } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

interface Props {
  onSearch: (lat: number, lng: number, label: string) => void
  loading: boolean
  hasResult: boolean
}

function parseCoordinates(input: string): { lat: number; lng: number } | null {
  const parts = input.split(',').map((s) => s.trim())
  if (parts.length !== 2) return null
  const lat = parseFloat(parts[0])
  const lng = parseFloat(parts[1])
  if (isNaN(lat) || isNaN(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

export default function SearchForm({ onSearch, loading, hasResult }: Props) {
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string
    if (!apiKey) return
    setOptions({ key: apiKey, v: 'weekly' })
    importLibrary('geocoding').then((lib) => {
      geocoderRef.current = new lib.Geocoder()
    }).catch((err: unknown) => {
      console.error('Failed to load Maps Geocoding library:', err)
    })
  }, [])

  // 検索結果が出たら自動的に折りたたむ
  useEffect(() => {
    if (hasResult) setCollapsed(true)
  }, [hasResult])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setError('')

    const coords = parseCoordinates(query.trim())
    if (coords) {
      onSearch(coords.lat, coords.lng, `${coords.lat}, ${coords.lng}`)
      return
    }

    const geocoder = geocoderRef.current
    if (!geocoder) {
      setError('Geocoder がまだ読み込まれていません')
      return
    }

    try {
      const response = await geocoder.geocode({ address: query.trim() })
      if (!response.results || response.results.length === 0) {
        throw new Error('住所が見つかりませんでした')
      }
      const result = response.results[0]
      onSearch(result.geometry.location.lat(), result.geometry.location.lng(), result.formatted_address)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    }
  }, [query, onSearch])

  // 折りたたみ状態: 小さいピルだけ表示
  if (collapsed) {
    return (
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <button
          onClick={() => setCollapsed(false)}
          className="px-5 py-2.5 rounded-full text-xs cursor-pointer transition-all"
          style={{
            background: 'rgba(10,10,10,0.8)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(0,191,255,0.25)',
            color: '#00BFFF',
          }}
        >
          🔍 別の場所を検索
        </button>
      </div>
    )
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 p-4 md:p-6">
      <div
        className="max-w-xl mx-auto rounded-2xl p-5"
        style={{ background: 'rgba(10,10,10,0.88)', backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h1
            className="text-sm font-light tracking-wider"
            style={{ color: '#00BFFF' }}
          >
            目的地という光景
          </h1>
          <span className="text-[10px] opacity-25">v1.4</span>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="住所 or 緯度,経度（例: 東京タワー）"
            className="flex-1 px-4 py-3 rounded-lg text-sm outline-none"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#e8e4dc',
            }}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-3 rounded-lg text-sm font-medium transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: '#00BFFF', color: '#0a0a0a' }}
          >
            {loading ? '...' : '検索'}
          </button>
        </form>

        {error && (
          <p className="text-xs mt-2 text-center" style={{ color: '#ff6b6b' }}>{error}</p>
        )}
      </div>
    </div>
  )
}
