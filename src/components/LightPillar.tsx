/**
 * 光の柱 — CSSオーバーレイ。
 * xPx, yPx: 目的地の地面のスクリーン座標（毎フレーム更新）
 * 光は yPx（地面）から画面上端に向かって伸びる
 */
export default function LightPillar({ visible, xPx, yPx }: { visible: boolean; xPx: number; yPx: number }) {
  if (!visible) return null

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 5, overflow: 'hidden', pointerEvents: 'none' }}
    >
      <div
        className="absolute"
        style={{
          left: xPx,
          top: 0,
          height: yPx,
          transform: 'translateX(-50%)',
          width: 300,
        }}
      >
        {/* Layer 1: Wide atmospheric haze */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center bottom, rgba(255,255,250,0.06) 0%, transparent 60%)',
            filter: 'blur(20px)',
          }}
        />

        {/* Layer 2: Soft glow */}
        <div
          className="absolute"
          style={{
            left: '50%', transform: 'translateX(-50%)',
            bottom: 0, top: 0, width: 100,
            background: 'linear-gradient(to top, rgba(255,255,252,0.2) 0%, rgba(255,255,252,0.12) 40%, transparent 100%)',
            filter: 'blur(10px)',
          }}
        />

        {/* Layer 3: Main body */}
        <div
          className="absolute"
          style={{
            left: '50%', transform: 'translateX(-50%)',
            bottom: 0, top: 0, width: 36,
            background: 'linear-gradient(to top, rgba(255,255,253,0.95) 0%, rgba(255,255,255,0.85) 30%, rgba(255,255,255,0.5) 70%, rgba(255,255,255,0.1) 100%)',
            filter: 'blur(3px)',
          }}
        />

        {/* Layer 4: Hot core */}
        <div
          className="absolute"
          style={{
            left: '50%', transform: 'translateX(-50%)',
            bottom: 0, top: 0, width: 12,
            background: 'linear-gradient(to top, #FFFFFF 0%, rgba(255,255,255,0.92) 40%, rgba(255,255,255,0.4) 85%, transparent 100%)',
            filter: 'blur(1px)',
          }}
        />

        {/* Layer 5: Center line */}
        <div
          className="absolute"
          style={{
            left: '50%', transform: 'translateX(-50%)',
            bottom: 0, top: 0, width: 4,
            background: 'linear-gradient(to top, #FFFFFF 0%, #FFFFFF 25%, rgba(255,255,255,0.6) 80%, transparent 100%)',
          }}
        />
      </div>

      {/* Ground glow at base */}
      <div
        className="absolute"
        style={{
          left: xPx, top: yPx,
          transform: 'translate(-50%, -50%)',
          width: 350, height: 180,
          background: 'radial-gradient(ellipse at center, rgba(255,255,250,0.22) 0%, transparent 55%)',
          filter: 'blur(15px)',
        }}
      />
    </div>
  )
}
