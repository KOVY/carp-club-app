import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Carp Club CR - Kaprarske zavody online'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0D9488 0%, #065F5B 50%, #134E4A 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Water wave pattern background */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '200px',
            display: 'flex',
            opacity: 0.15,
          }}
        >
          <svg
            viewBox="0 0 1200 200"
            style={{ width: '100%', height: '100%' }}
          >
            <path
              d="M0,100 C150,150 350,50 600,100 C850,150 1050,50 1200,100 L1200,200 L0,200 Z"
              fill="white"
            />
            <path
              d="M0,130 C200,180 400,80 600,130 C800,180 1000,80 1200,130 L1200,200 L0,200 Z"
              fill="white"
              opacity="0.5"
            />
          </svg>
        </div>

        {/* Top wave decoration */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '120px',
            display: 'flex',
            opacity: 0.1,
          }}
        >
          <svg
            viewBox="0 0 1200 120"
            style={{ width: '100%', height: '100%' }}
          >
            <path
              d="M0,60 C200,20 400,100 600,60 C800,20 1000,100 1200,60 L1200,0 L0,0 Z"
              fill="white"
            />
          </svg>
        </div>

        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: '50px',
            right: '80px',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            border: '3px solid rgba(255, 255, 255, 0.15)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '80px',
            left: '60px',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            border: '3px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
          }}
        />

        {/* Fish icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
          }}
        >
          <svg
            width="100"
            height="60"
            viewBox="0 0 100 60"
            fill="none"
            style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}
          >
            {/* Carp fish body */}
            <ellipse cx="45" cy="30" rx="35" ry="20" fill="rgba(255,255,255,0.95)" />
            {/* Tail */}
            <path
              d="M75,30 L95,15 L95,45 Z"
              fill="rgba(255,255,255,0.95)"
            />
            {/* Dorsal fin */}
            <path
              d="M30,10 Q45,0 55,10 L55,12 Q45,8 30,12 Z"
              fill="rgba(255,255,255,0.85)"
            />
            {/* Eye */}
            <circle cx="22" cy="28" r="5" fill="#0D9488" />
            <circle cx="21" cy="27" r="2" fill="#134E4A" />
            {/* Scales pattern */}
            <path
              d="M35,25 Q40,20 45,25 Q40,30 35,25"
              stroke="#0D9488"
              strokeWidth="1"
              fill="none"
              opacity="0.3"
            />
            <path
              d="M45,25 Q50,20 55,25 Q50,30 45,25"
              stroke="#0D9488"
              strokeWidth="1"
              fill="none"
              opacity="0.3"
            />
            <path
              d="M55,25 Q60,20 65,25 Q60,30 55,25"
              stroke="#0D9488"
              strokeWidth="1"
              fill="none"
              opacity="0.3"
            />
            <path
              d="M40,35 Q45,30 50,35 Q45,40 40,35"
              stroke="#0D9488"
              strokeWidth="1"
              fill="none"
              opacity="0.3"
            />
            <path
              d="M50,35 Q55,30 60,35 Q55,40 50,35"
              stroke="#0D9488"
              strokeWidth="1"
              fill="none"
              opacity="0.3"
            />
            {/* Gill */}
            <path
              d="M28,22 Q30,30 28,38"
              stroke="#0D9488"
              strokeWidth="2"
              fill="none"
              opacity="0.4"
            />
            {/* Pectoral fin */}
            <ellipse cx="32" cy="40" rx="8" ry="4" fill="rgba(255,255,255,0.8)" transform="rotate(-20 32 40)" />
          </svg>
        </div>

        {/* Main title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              fontSize: '84px',
              fontWeight: 800,
              color: 'white',
              margin: 0,
              letterSpacing: '-2px',
              textShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
              lineHeight: 1.1,
            }}
          >
            Carp Club CR
          </h1>

          {/* Decorative line */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              margin: '20px 0',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '3px',
                background: 'rgba(255, 255, 255, 0.6)',
                borderRadius: '2px',
                display: 'flex',
              }}
            />
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.8)',
                display: 'flex',
              }}
            />
            <div
              style={{
                width: '60px',
                height: '3px',
                background: 'rgba(255, 255, 255, 0.6)',
                borderRadius: '2px',
                display: 'flex',
              }}
            />
          </div>

          {/* Subtitle */}
          <p
            style={{
              fontSize: '36px',
              fontWeight: 500,
              color: 'rgba(255, 255, 255, 0.95)',
              margin: 0,
              letterSpacing: '3px',
              textTransform: 'uppercase',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            }}
          >
            Kaprarske zavody online
          </p>
        </div>

        {/* Bottom badge */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '30px',
            border: '1px solid rgba(255, 255, 255, 0.25)',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="2"
          >
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
          <span
            style={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '18px',
              fontWeight: 600,
              letterSpacing: '1px',
            }}
          >
            carpclub.app
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
