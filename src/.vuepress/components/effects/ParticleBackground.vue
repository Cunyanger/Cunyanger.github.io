<template>
  <canvas ref="canvasRef" class="particle-background" aria-hidden="true"></canvas>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  trackWindow: {
    type: Boolean,
    default: false,
  },
  fps: {
    type: Number,
    default: 24,
  },
})

const canvasRef = ref(null)

let animationFrame = 0
let cleanup = () => {}

onMounted(() => {
  const canvas = canvasRef.value
  const context = canvas?.getContext('2d')

  if (!canvas || !context) return

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const pointer = { active: false, x: 0, y: 0 }
  const particles = []
  const frameInterval = 1000 / Math.max(1, Math.min(props.fps, 60))
  let lastFrameTime = 0
  let isVisible = document.visibilityState === 'visible'

  const scheduleDraw = () => {
    if (prefersReducedMotion || !isVisible || animationFrame) return

    animationFrame = window.requestAnimationFrame(draw)
  }

  const stopDrawing = () => {
    if (!animationFrame) return

    window.cancelAnimationFrame(animationFrame)
    animationFrame = 0
    lastFrameTime = 0
  }

  const resize = () => {
    const rect = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)

    canvas.width = Math.floor(rect.width * dpr)
    canvas.height = Math.floor(rect.height * dpr)
    context.setTransform(dpr, 0, 0, dpr, 0, 0)

    const count = rect.width < 720 ? 28 : 56
    particles.length = 0

    for (let index = 0; index < count; index += 1) {
      particles.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        vx: (Math.random() - 0.5) * 0.34,
        vy: (Math.random() - 0.5) * 0.34,
        radius: 1.2 + Math.random() * 2.2,
        tone: index % 3,
      })
    }
  }

  const draw = (timestamp = 0) => {
    animationFrame = 0

    if (!isVisible) return

    if (timestamp && timestamp - lastFrameTime < frameInterval) {
      scheduleDraw()
      return
    }

    lastFrameTime = timestamp || performance.now()

    const width = canvas.clientWidth
    const height = canvas.clientHeight

    if (!width || !height) {
      scheduleDraw()
      return
    }

    context.clearRect(0, 0, width, height)

    const lineColor = document.documentElement.dataset.theme === 'dark'
      ? 'rgba(148, 163, 184, '
      : 'rgba(71, 85, 105, '

    for (const particle of particles) {
      if (!prefersReducedMotion) {
        particle.x += particle.vx
        particle.y += particle.vy

        if (particle.x < -20) particle.x = width + 20
        if (particle.x > width + 20) particle.x = -20
        if (particle.y < -20) particle.y = height + 20
        if (particle.y > height + 20) particle.y = -20

        if (pointer.active) {
          const dx = particle.x - pointer.x
          const dy = particle.y - pointer.y
          const distance = Math.hypot(dx, dy)

          if (distance < 150 && distance > 0) {
            const force = (150 - distance) / 150
            particle.x += (dx / distance) * force * 0.58
            particle.y += (dy / distance) * force * 0.58
          }
        }
      }

      context.beginPath()
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
      context.fillStyle = ['rgba(37, 99, 235, 0.9)', 'rgba(20, 184, 166, 0.82)', 'rgba(245, 158, 11, 0.82)'][particle.tone]
      context.fill()
    }

    for (let i = 0; i < particles.length; i += 1) {
      for (let j = i + 1; j < particles.length; j += 1) {
        const first = particles[i]
        const second = particles[j]
        const dx = first.x - second.x
        const dy = first.y - second.y
        const distanceSquared = dx * dx + dy * dy

        if (distanceSquared < 15376) {
          const distance = Math.sqrt(distanceSquared)
          context.beginPath()
          context.moveTo(first.x, first.y)
          context.lineTo(second.x, second.y)
          context.strokeStyle = `${lineColor}${(1 - distance / 124) * 0.2})`
          context.lineWidth = 1
          context.stroke()
        }
      }
    }

    scheduleDraw()
  }

  const updatePointer = (event) => {
    const rect = canvas.getBoundingClientRect()

    pointer.active = true
    pointer.x = event.clientX - rect.left
    pointer.y = event.clientY - rect.top
  }

  const leavePointer = () => {
    pointer.active = false
  }

  const syncVisibility = () => {
    isVisible = document.visibilityState === 'visible'
    if (isVisible) {
      scheduleDraw()
    } else {
      stopDrawing()
    }
  }

  resize()
  draw()

  const pointerTarget = props.trackWindow ? window : canvas

  window.addEventListener('resize', resize)
  document.addEventListener('visibilitychange', syncVisibility)
  pointerTarget.addEventListener('pointermove', updatePointer)
  pointerTarget.addEventListener('pointerleave', leavePointer)

  cleanup = () => {
    stopDrawing()
    window.removeEventListener('resize', resize)
    document.removeEventListener('visibilitychange', syncVisibility)
    pointerTarget.removeEventListener('pointermove', updatePointer)
    pointerTarget.removeEventListener('pointerleave', leavePointer)
  }
})

onBeforeUnmount(() => cleanup())
</script>

<style scoped>
.particle-background {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
}
</style>
