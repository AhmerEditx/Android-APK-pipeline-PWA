'use client'

import { useEffect } from 'react'
import { ErrorScreen } from '@/components/error-screen'

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#09090b', color: '#fafafa' }}>
        <ErrorScreen retry={retry} digest={error.digest} full />
      </body>
    </html>
  )
}