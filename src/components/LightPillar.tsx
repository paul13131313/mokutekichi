/**
 * 光の柱 — CSSオーバーレイ。Cesiumとは完全に独立。
 * xPx: 画面上のピクセルX座標（Cesium postRender で毎フレーム更新）
 */
export default function LightPillar({ visible, xPx }: { visible: boolean; xPx: number }) {
  if (!visible) return null

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 5, overflow: 'hidden' }}
    >
      <div
        className="absolute"
        style={{
          left: xPx,
          top: 0,
          bottom: 0,
          transform: 'translateX(-50%)',
          width: 300,
        }}
      >
        {/* Layer 1: Very wide atmospheric haze */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(255,255,250,0.05) 0%, transparent 65%)',
            filter: 'blur(20px)',
          }}
        />

        {/* Layer 2: Wide soft glow */}
        <div
          className="absolute"
          style={{
            left: '50%', transform: 'translateX(-50%)',
            top: 0, bottom: 0, width: 100,
            background: 'radial-gradient(ellipse at center, rgba(255,255,252,0.15) 0%, transparent 70%)',
            filter: 'blur(10px)',
          }}
        />

        {/* Layer 3: Main body — bright, less blur */}
        <div
          className="absolute"
          style={{
            left: '50%', transform: 'translateX(-50%)',
            top: 0, bottom: 0, width: 36,
            background: 'linear-gradient(to top, rgba(255,255,253,0.95) 0%, rgba(255,255,255,0.85) 40%, rgba(255,255,255,0.5) 80%, rgba(255,255,255,0.1) 100%)',
            filter: 'blur(3px)',
          }}
        />

        {/* Layer 4: Hot core */}
        <div
          className="absolute"
          style={{
            left: '50%', transform: 'translateX(-50%)',
            top: 0, bottom: 0, width: 12,
            background: 'linear-gradient(to top, #FFFFFF 0%, rgba(255,255,255,0.92) 50%, rgba(255,255,255,0.4) 90%, transparent 100%)',
            filter: 'blur(1px)',
          }}
        />

        {/* Layer 5: Burning center line */}
        <div
          className="absolute"
          style={{
            left: '50%', transform: 'translateX(-50%)',
            top: 0, bottom: 0, width: 4,
            background: 'linear-gradient(to top, #FFFFFF 0%, #FFFFFF 30%, rgba(255,255,255,0.6) 85%, transparent 100%)',
          }}
        />
      </div>

      {/* Ground glow */}
      <div
        className="absolute"
        style={{
          left: xPx, bottom: 0,
          transform: 'translateX(-50%)',
          width: 350, height: 180,
          background: 'radial-gradient(ellipse at center bottom, rgba(255,255,250,0.2) 0%, transparent 55%)',
          filter: 'blur(15px)',
        }}
      />
    </div>
  )
}
