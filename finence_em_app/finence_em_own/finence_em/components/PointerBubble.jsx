'use client'

import { useEffect, useState } from 'react'

export default function PointerBubble() {
  const [bubble, setBubble] = useState({ x: -100, y: -100, visible: false, pressed: false })

  useEffect(() => {
    let hideTimer

    const updateBubble = (event) => {
      const x = event.clientX
      const y = event.clientY

      setBubble((current) => ({
        x,
        y,
        visible: true,
        pressed: current.pressed,
      }))

      window.clearTimeout(hideTimer)
      hideTimer = window.setTimeout(() => {
        setBubble((current) => ({ ...current, visible: false }))
      }, 120)
    }

    const handlePointerDown = () => setBubble((current) => ({ ...current, pressed: true }))
    const handlePointerUp = () => setBubble((current) => ({ ...current, pressed: false }))

    window.addEventListener('pointermove', updateBubble)
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointerleave', handlePointerUp)

    return () => {
      window.clearTimeout(hideTimer)
      window.removeEventListener('pointermove', updateBubble)
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointerleave', handlePointerUp)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-50 hidden md:block">
      <div
        className="absolute rounded-full border border-white/35 bg-white/20 shadow-[0_0_50px_rgba(255,255,255,0.18)] backdrop-blur-sm transition-[transform,opacity,width,height] duration-150 ease-out"
        style={{
          left: bubble.x,
          top: bubble.y,
          width: bubble.pressed ? '44px' : '28px',
          height: bubble.pressed ? '44px' : '28px',
          opacity: bubble.visible ? 1 : 0,
          transform: 'translate(-50%, -50%)',
        }}
      />
      <div
        className="absolute rounded-full bg-gradient-to-br from-cyan-300/70 via-sky-300/45 to-transparent blur-lg transition-[transform,opacity,width,height] duration-150 ease-out"
        style={{
          left: bubble.x,
          top: bubble.y,
          width: bubble.pressed ? '72px' : '56px',
          height: bubble.pressed ? '72px' : '56px',
          opacity: bubble.visible ? 0.95 : 0,
          transform: 'translate(-50%, -50%)',
        }}
      />
    </div>
  )
}