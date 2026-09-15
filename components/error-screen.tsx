'use client'

export function DumbbellIcon({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6.5 6.5v11" />
      <path d="M3.5 9v6" />
      <path d="M17.5 6.5v11" />
      <path d="M20.5 9v6" />
      <path d="M6.5 12h11" />
    </svg>
  )
}

export function ErrorScreen({
  retry,
  digest,
  full = false,
}: {
  retry: () => void
  digest?: string
  full?: boolean
}) {
  return (
    <div
      style={{
        minHeight: full ? '100dvh' : '56vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          borderRadius: 20,
          border: '1px solid #27272a',
          background: 'rgba(24, 24, 27, 0.6)',
          padding: '40px 32px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            margin: '0 auto',
            borderRadius: 14,
            background: '#a3e635',
            color: '#18181b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 0 6px rgba(163, 230, 53, 0.12)',
          }}
        >
          <DumbbellIcon size={26} />
        </div>

        <p
          style={{
            margin: '20px 0 6px',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#a3e635',
          }}
        >
          IronTrack
        </p>

        <h1
          style={{
            margin: 0,
            fontSize: 24,
            lineHeight: 1.2,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: '#fafafa',
          }}
        >
          Something went wrong
        </h1>

        <p
          style={{
            margin: '12px auto 0',
            maxWidth: 360,
            fontSize: 14,
            lineHeight: 1.6,
            color: '#a1a1aa',
          }}
        >
          We hit a snag while loading this page. It is on our end, so give it
          another try and you should be back on track in a moment.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 28 }}>
          <button
            onClick={() => retry()}
            style={{
              appearance: 'none',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 10,
              background: '#a3e635',
              color: '#09090b',
              fontSize: 14,
              fontWeight: 700,
              padding: '11px 20px',
            }}
          >
            Try again
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- plain <a> so it also works inside global-error, which has no Link/router context */}
          <a
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: 10,
              border: '1px solid #3f3f46',
              background: 'transparent',
              color: '#e4e4e7',
              fontSize: 14,
              fontWeight: 600,
              padding: '11px 20px',
              textDecoration: 'none',
            }}
          >
            Back home
          </a>
        </div>

        {digest ? (
          <p
            style={{
              margin: '28px 0 0',
              fontSize: 11,
              color: '#52525b',
            }}
          >
            Reference: {digest}
          </p>
        ) : null}
      </div>
    </div>
  )
}