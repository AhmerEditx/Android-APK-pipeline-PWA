'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { App } from '@capacitor/app'

export function AppBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let disposed = false

    StatusBar.setBackgroundColor({ color: '#09090b' })
    StatusBar.setStyle({ style: Style.Light })
    StatusBar.setOverlaysWebView({ overlay: false })

    // Hardware back button: walk back through the app, exit when at the root.
    const listenerPromise = App.addListener('backButton', ({ canGoBack }) => {
      if (disposed) return
      if (canGoBack) {
        history.back()
      } else {
        App.exitApp()
      }
    })

    return () => {
      disposed = true
      listenerPromise.then((listener) => listener.remove())
    }
  }, [])

  return null
}