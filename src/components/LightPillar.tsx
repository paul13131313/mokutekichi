/**
 * 光の柱をCSSで描画するオーバーレイ。
 * Cesiumの3Dシーンとは完全に独立したレイヤー。
 * xPercent: 画面左端を0%、右端を100%とした光の柱のX位置
 */
export default function LightPillar({ visible, xPercent }: { visible: boolean; xPercent: number }) {
  if (!visible) return null

  return (
    <div
      className="absolute inset-0 z-5 pointer-events-none"
      style={{ overflow: 'hidden' }}
    >
      {/* Position anchor at target X */}
      <div
        className="absolute"
        style={{
          left: `${xPercent}%`,
          top: 0,
          bottom: 0,
          transform: 'translateX(-50%)',
          width: 200,
        }}
      >
        {/* Outer soft haze */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(255,255,250,0.06) 0%, transparent 70%)',
            filter: 'blur(16px)',
          }}
        />

        {/* Mid glow */}
        <div
          className="absolute"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            top: 0,
            bottom: 0,
            width: 60,
            background: 'radial-gradient(ellipse at center, rgba(255,255,252,0.2) 0%, transparent 70%)',
            filter: 'blur(6px)',
          }}
        />

        {/* Bright body */}
        <div
          className="absolute"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            top: 0,
            bottom: 0,
            width: 24,
            background: 'linear-gradient(to top, rgba(255,255,252,0.9) 0%, rgba(255,255,255,0.6) 60%, rgba(255,255,255,0.15) 100%)',
            filter: 'blur(2px)',
          }}
        />

        {/* Hot core */}
        <div
          className="absolute"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            top: 0,
            bottom: 0,
            width: 8,
            background: 'linear-gradient(to top, #FFFFFF 0%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0.3) 100%)',
            filter: 'blur(0.5px)',
          }}
        />

        {/* Burning center */}
        <div
          className="absolute"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            top: 0,
            bottom: 0,
            width: 3,
            background: 'linear-gradient(to top, #FFFFFF 0%, #FFFFFF 40%, rgba(255,255,255,0.5) 100%)',
          }}
        />
      </div>

      {/* Ground glow at target position */}
      <div
        className="absolute bottom-0"
        style={{
          left: `${xPercent}%`,
          transform: 'translateX(-50%)',
          width: 300,
          height: 150,
          background: 'radial-gradient(ellipse at center bottom, rgba(255,255,250,0.2) 0%, transparent 60%)',
          filter: 'blur(12px)',
        }}
      />
    </div>
  )
}
