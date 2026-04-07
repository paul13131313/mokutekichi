/**
 * モバイル用: Google Static Maps APIで俯瞰画像 + CSS光の柱
 */
interface Props {
  lat: number
  lng: number
}

export default function MobileView({ lat, lng }: Props) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=17&size=640x960&scale=2&maptype=satellite&key=${apiKey}`

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Satellite image */}
      <img
        src={mapUrl}
        alt="map"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'brightness(0.25)',
        }}
      />

      {/* Light pillar overlay */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', justifyContent: 'center' }}>
        {/* Wide haze */}
        <div style={{
          position: 'absolute',
          left: '50%', transform: 'translateX(-50%)',
          bottom: '30%', top: 0,
          width: 200,
          background: 'radial-gradient(ellipse at center bottom, rgba(255,255,250,0.06) 0%, transparent 60%)',
          filter: 'blur(20px)',
        }} />
        {/* Mid glow */}
        <div style={{
          position: 'absolute',
          left: '50%', transform: 'translateX(-50%)',
          bottom: '30%', top: 0,
          width: 80,
          background: 'linear-gradient(to top, rgba(255,255,252,0.2) 0%, rgba(255,255,252,0.12) 40%, transparent 100%)',
          filter: 'blur(10px)',
        }} />
        {/* Bright body */}
        <div style={{
          position: 'absolute',
          left: '50%', transform: 'translateX(-50%)',
          bottom: '30%', top: 0,
          width: 28,
          background: 'linear-gradient(to top, rgba(255,255,253,0.95) 0%, rgba(255,255,255,0.85) 30%, rgba(255,255,255,0.5) 70%, rgba(255,255,255,0.1) 100%)',
          filter: 'blur(3px)',
        }} />
        {/* Hot core */}
        <div style={{
          position: 'absolute',
          left: '50%', transform: 'translateX(-50%)',
          bottom: '30%', top: 0,
          width: 8,
          background: 'linear-gradient(to top, #FFFFFF 0%, rgba(255,255,255,0.92) 40%, rgba(255,255,255,0.4) 85%, transparent 100%)',
          filter: 'blur(1px)',
        }} />
        {/* Center line */}
        <div style={{
          position: 'absolute',
          left: '50%', transform: 'translateX(-50%)',
          bottom: '30%', top: 0,
          width: 3,
          background: 'linear-gradient(to top, #FFFFFF 0%, #FFFFFF 25%, rgba(255,255,255,0.6) 80%, transparent 100%)',
        }} />
        {/* Ground glow */}
        <div style={{
          position: 'absolute',
          left: '50%', bottom: '30%',
          transform: 'translate(-50%, 50%)',
          width: 250, height: 120,
          background: 'radial-gradient(ellipse at center, rgba(255,255,250,0.22) 0%, transparent 55%)',
          filter: 'blur(15px)',
        }} />
      </div>
    </div>
  )
}
