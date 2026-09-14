'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

export function AppBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    StatusBar.setBackgroundColor({ color: '#09090b' })
    StatusBar.setStyle({ style: Style.Light })
    StatusBar.setOverlaysWebView({ overlay: false })
  }, [])

  return null
}