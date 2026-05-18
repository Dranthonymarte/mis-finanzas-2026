import { useEffect, useState } from 'react'

// BeforeInstallPromptEvent is not in lib.dom
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Module-level cache: the event fires ONCE and early (often before the
// component that needs it mounts). Capturing it globally means any screen
// (Login, More, …) can offer "Instalar app" even if it mounts later.
let deferredPrompt: BeforeInstallPromptEvent | null = null
let alreadyInstalled =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(display-mode: standalone)').matches

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    window.dispatchEvent(new Event('pwa-installable'))
  })
  window.addEventListener('appinstalled', () => {
    alreadyInstalled = true
    deferredPrompt = null
    window.dispatchEvent(new Event('pwa-installable'))
  })
}

/**
 * Returns { canInstall, install }. `canInstall` is true once Chrome has
 * fired beforeinstallprompt and the app isn't already installed.
 */
export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState(!!deferredPrompt && !alreadyInstalled)

  useEffect(() => {
    const sync = () => setCanInstall(!!deferredPrompt && !alreadyInstalled)
    window.addEventListener('pwa-installable', sync)
    return () => window.removeEventListener('pwa-installable', sync)
  }, [])

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    deferredPrompt = null
    window.dispatchEvent(new Event('pwa-installable'))
  }

  return { canInstall, install }
}
