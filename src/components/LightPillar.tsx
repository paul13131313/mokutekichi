/**
 * 光の柱をCSSで描画するオーバーレイ。
 * Cesiumの3Dシーンとは完全に独立したレイヤー。
 */
export default function LightPillar({ visible }: { visible: boolean }) {
  if (!visible) return null

  return (
    <div
      className="absolute inset-0 z-5 pointer-events-none flex items-center justify-center"
      style={{ overflow: 'hidden' }}
    >
      {/* Outer wide haze */}
      <div
        className="absolute"
        style={{
          width: 180,
          height: '100%',
          background: 'radial-gradient(ellipse at center, rgba(255,255,240,0.08) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Mid glow */}
      <div
        className="absolute"
        style={{
          width: 90,
          height: '100%',
          background: 'radial-gradient(ellipse at center, rgba(255,255,245,0.18) 0%, transparent 70%)',
          filter: 'blur(20px)',
        }}
      />

      {/* Bright body */}
      <div
        className="absolute"
        style={{
          width: 40,
          height: '100%',
          background: 'radial-gradient(ellipse at center, rgba(255,255,250,0.5) 0%, transparent 70%)',
          filter: 'blur(8px)',
        }}
      />

      {/* Hot core */}
      <div
        className="absolute"
        style={{
          width: 14,
          height: '100%',
          background: 'linear-gradient(to top, rgba(255,255,250,0.95) 0%, rgba(255,255,255,0.7) 70%, rgba(255,255,255,0.1) 100%)',
          filter: 'blur(3px)',
        }}
      />

      {/* Burning center line */}
      <div
        className="absolute"
        style={{
          width: 4,
          height: '100%',
          background: 'linear-gradient(to top, #FFFFFF 0%, rgba(255,255,255,0.9) 60%, rgba(255,255,255,0.2) 100%)',
          filter: 'blur(1px)',
        }}
      />

      {/* Ground glow (bottom) */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2"
        style={{
          width: 400,
          height: 200,
          background: 'radial-gradient(ellipse at center bottom, rgba(255,255,245,0.25) 0%, transparent 60%)',
          filter: 'blur(30px)',
        }}
      />
    </div>
  )
}
