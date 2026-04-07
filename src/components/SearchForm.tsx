import { useState, useCallback } from 'react'

interface Props {
  onSearch: (lat: number, lng: number, label: string) => void
  loading: boolean
}

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

// Check if input looks like coordinates (e.g., "35.6812, 139.7671")
function parseCoordinates(input: string): { lat: number; lng: number } | null {
  const parts = input.split(',').map((s) => s.trim())
  if (parts.length !== 2) return null
  const lat = parseFloat(parts[0])
  const lng = parseFloat(parts[1])
  if (isNaN(lat) || isNaN(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

async function geocode(address: string): Promise<{ lat: number; lng: number; label: string }> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`)
  const data = await res.json()
  if (!data.results || data.results.length === 0) {
    throw new Error('住所が見つかりませんでした')
  }
  const loc = data.results[0].geometry.location
  return {
    lat: loc.lat,
    lng: loc.lng,
    label: data.results[0].formatted_address,
  }
}

export default function SearchForm({ onSearch, loading }: Props) {
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setError('')

    // Try as coordinates first
    const coords = parseCoordinates(query.trim())
    if (coords) {
      onSearch(coords.lat, coords.lng, `${coords.lat}, ${coords.lng}`)
      return
    }

    // Geocode address
    try {
      const result = await geocode(query.trim())
      onSearch(result.lat, result.lng, result.label)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    }
  }, [query, onSearch])

  return (
    <div className="absolute top-0 left-0 right-0 z-10 p-4 md:p-6">
      <div
        className="max-w-xl mx-auto rounded-2xl p-5 md:p-6"
        style={{ background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(20px)' }}
      >
        <h1
          className="text-center text-sm md:text-base font-light tracking-wider mb-4"
          style={{ color: '#00BFFF' }}
        >
          目的地という光景（シンボル）
        </h1>

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
            style={{
              background: '#00BFFF',
              color: '#0a0a0a',
            }}
          >
            {loading ? '...' : '検索'}
          </button>
        </form>

        {error && (
          <p className="text-xs mt-2 text-center" style={{ color: '#ff6b6b' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
