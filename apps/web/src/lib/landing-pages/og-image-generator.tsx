import { ImageResponse } from 'next/og'
import { LandingPageConfig } from './landing-page-config'

export const runtime = 'edge'
export const alt = 'SaveIt Landing Page'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

const COLORS = {
  background: '#ffffff',
  primary: '#000000',
  secondary: '#666666',
  accent: '#f97316',
}

export function generateOGImage(config: LandingPageConfig) {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          backgroundColor: COLORS.background,
          backgroundImage: `radial-gradient(circle at 25% 25%, ${COLORS.accent}33 0%, transparent 50%), radial-gradient(circle at 75% 75%, ${COLORS.accent}22 0%, transparent 50%)`,
          padding: 80,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Logo and Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 32,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 60,
              height: 60,
              backgroundColor: COLORS.primary,
              borderRadius: 12,
              marginRight: 20,
              fontSize: 32,
              color: COLORS.background,
            }}
          >
            📚
          </div>
          <div
            style={{
              backgroundColor: `${COLORS.accent}22`,
              color: COLORS.accent,
              padding: '8px 16px',
              borderRadius: 24,
              fontSize: 20,
              fontWeight: 600,
              border: `1px solid ${COLORS.accent}44`,
            }}
          >
            {config.hero.badge}
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 1.1,
            color: COLORS.primary,
            marginBottom: 24,
            maxWidth: '90%',
          }}
        >
          {config.hero.headline}
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 400,
            lineHeight: 1.4,
            color: COLORS.secondary,
            maxWidth: '85%',
            marginBottom: 40,
          }}
        >
          {config.hero.subHeadline}
        </div>

        {/* Bottom Elements */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            position: 'absolute',
            bottom: 60,
            left: 80,
            right: 80,
            justifyContent: 'space-between',
          }}
        >
          {/* Trust Indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 20 }}>✅</div>
              <span style={{ fontSize: 18, color: COLORS.secondary }}>Free Plan</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 20 }}>⚡</div>
              <span style={{ fontSize: 18, color: COLORS.secondary }}>Instant Setup</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 20 }}>🔒</div>
              <span style={{ fontSize: 18, color: COLORS.secondary }}>Secure & Private</span>
            </div>
          </div>

          {/* URL */}
          <div
            style={{
              fontSize: 18,
              color: COLORS.secondary,
              fontWeight: 500,
            }}
          >
            saveit.now
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}