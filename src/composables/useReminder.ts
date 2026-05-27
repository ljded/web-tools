type ReminderOptions = {
  title: string
  description?: string
  color?: 'neutral' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error'
  icon?: string
}

let audioContext: AudioContext | null = null

function getAudioContext() {
  const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextCtor) return null
  audioContext ??= new AudioContextCtor()
  return audioContext
}

export function useReminder() {
  const toast = useToast()

  function requestSystemNotificationPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission !== 'default') return

    try {
      void Notification.requestPermission()
    } catch {}
  }

  async function primeAudio() {
    if (typeof window === 'undefined') return
    requestSystemNotificationPermission()
    const ctx = getAudioContext()
    if (!ctx || ctx.state === 'running') return
    try {
      await ctx.resume()
    } catch {}
  }

  async function playBeep() {
    if (typeof window === 'undefined') return
    const ctx = getAudioContext()
    if (!ctx) return

    try {
      if (ctx.state === 'suspended') await ctx.resume()
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35)
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start()
      oscillator.stop(ctx.currentTime + 0.38)
    } catch {}
  }

  function showSystemNotification(options: ReminderOptions) {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    try {
      new Notification(options.title, {
        body: options.description,
      })
    } catch {}
  }

  function notify(options: ReminderOptions) {
    toast.add({
      title: options.title,
      description: options.description,
      color: options.color ?? 'success',
      icon: options.icon ?? 'i-lucide-bell-ring',
    })
    void playBeep()
    showSystemNotification(options)
  }

  return { notify, primeAudio }
}
