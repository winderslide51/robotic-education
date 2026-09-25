<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['win'])

// Logical drawing space (scaled to the real canvas size)
const LW = 400
const LH = 500

const wrapRef = ref(null)
const canvasRef = ref(null)
const tilt = ref(0) // degrees, 0..100
const status = ref('play') // play | overflow | empty | win
const levelPct = ref(0)

// Game constants
const POUR_START = 40
const SPLASH_TILT = 75
const TARGET_MIN = 0.8
const TARGET_MAX = 0.95
const WRIST = { x: 270, y: 180 }
const SHOULDER = { x: 80, y: 420 }
const ELBOW = { x: 135, y: 262 }
const GLASS = { left: 220, right: 296, top: 330, bottom: 460 }

let ctx = null
let scale = 1
let dpr = 1
let rafId = 0
let lastT = 0
let level = 0 // glass fill, 1 = full
let carafe = 1 // carafe content, 1 = full (holds 2 glasses)
let particles = []
let glow = 0
let prevTilt = 0
let hasWon = false
let winTimer = 0
let drag = null

function reset() {
  level = 0
  carafe = 1
  particles = []
  tilt.value = 0
  levelPct.value = 0
  status.value = 'play'
}

function rot(x, y, a) {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return { x: x * c - y * s, y: x * s + y * c }
}

function toolFrame() {
  const a = (tilt.value * Math.PI) / 180
  const off = rot(0, 30, a)
  const pivot = { x: WRIST.x + off.x, y: WRIST.y + off.y }
  const sp = rot(26, -4, a)
  const spout = { x: pivot.x + sp.x, y: pivot.y + sp.y }
  return { a, pivot, spout }
}

function resize() {
  const wrap = wrapRef.value
  const canvas = canvasRef.value
  if (!wrap || !canvas) return
  const w = Math.min(wrap.clientWidth || 320, 480)
  const h = Math.round(w * 1.25)
  dpr = window.devicePixelRatio || 1
  canvas.style.width = w + 'px'
  canvas.style.height = h + 'px'
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  scale = w / LW
  ctx = canvas.getContext('2d')
}

function update(dt) {
  const t = tilt.value
  glow += ((Math.abs(t - prevTilt) > 0.01 || t > 5 ? 1 : 0) - glow) * Math.min(1, dt * 8)
  prevTilt = t
  if (status.value !== 'play') {
    updateParticles(dt)
    return
  }
  const { spout } = toolFrame()
  if (t > POUR_START && carafe > 0) {
    const rate = ((t - POUR_START) / 50) * 0.35 // glass per second
    const out = Math.min(rate * dt, carafe * 2)
    carafe -= out / 2
    const splashing = t > SPLASH_TILT
    level += splashing ? out * 0.55 : out
    const n = Math.ceil(rate * 60)
    for (let i = 0; i < n; i++) {
      particles.push({
        x: spout.x + (Math.random() - 0.5) * 3,
        y: spout.y,
        vx: 20 + Math.random() * 15 - (t - 60) * 0.6,
        vy: 20 + Math.random() * 20,
        r: 2.2 + Math.random() * 1.6,
        splash: false,
      })
    }
    if (splashing) {
      for (let i = 0; i < 3; i++) {
        particles.push({
          x: spout.x + (Math.random() - 0.5) * 20,
          y: GLASS.top + 5,
          vx: (Math.random() - 0.5) * 320,
          vy: -120 - Math.random() * 180,
          r: 2 + Math.random() * 2,
          splash: true,
        })
      }
    }
  }
  updateParticles(dt)
  levelPct.value = Math.round(level * 100)

  if (level > 1) {
    level = 1.04
    status.value = 'overflow'
  } else if (carafe <= 0.001 && level < TARGET_MIN) {
    status.value = 'empty'
  } else if (t < 20 && level >= TARGET_MIN && level <= TARGET_MAX && !hasWon) {
    hasWon = true
    status.value = 'win'
    winTimer = window.setTimeout(() => emit('win'), 800)
  }
}

function updateParticles(dt) {
  const surfY = GLASS.bottom - Math.min(level, 1.04) * (GLASS.bottom - GLASS.top - 4)
  for (const p of particles) {
    p.vy += 900 * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    if (!p.splash && p.x > GLASS.left + 4 && p.x < GLASS.right - 4 && p.y >= surfY) p.dead = true
    if (p.y > LH - 20) p.dead = true
  }
  particles = particles.filter((p) => !p.dead)
  if (particles.length > 600) particles.splice(0, particles.length - 600)
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}

function drawLink(c, a, b, w, color) {
  c.strokeStyle = color
  c.lineWidth = w
  c.lineCap = 'round'
  c.beginPath()
  c.moveTo(a.x, a.y)
  c.lineTo(b.x, b.y)
  c.stroke()
}

function drawJoint(c, p, r, fill) {
  c.fillStyle = fill
  c.beginPath()
  c.arc(p.x, p.y, r, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = '#ffffff'
  c.beginPath()
  c.arc(p.x, p.y, r * 0.4, 0, Math.PI * 2)
  c.fill()
}

function carafePath(c) {
  c.beginPath()
  c.moveTo(-18, 0)
  c.lineTo(18, 0)
  c.lineTo(28, -5) // spout
  c.lineTo(24, 8)
  c.quadraticCurveTo(28, 40, 24, 72)
  c.quadraticCurveTo(0, 80, -24, 72)
  c.quadraticCurveTo(-28, 40, -18, 0)
  c.closePath()
}

function draw() {
  if (!ctx) return
  const c = ctx
  c.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0)
  // Background
  const g = c.createLinearGradient(0, 0, 0, LH)
  g.addColorStop(0, '#e8f4ff')
  g.addColorStop(1, '#fdf6ec')
  c.fillStyle = g
  c.fillRect(0, 0, LW, LH)
  // Table
  c.fillStyle = '#d9b99b'
  c.fillRect(0, GLASS.bottom, LW, LH - GLASS.bottom)
  c.fillStyle = '#c49a74'
  c.fillRect(0, GLASS.bottom, LW, 6)

  // Glass water
  const gh = GLASS.bottom - GLASS.top
  const lv = Math.min(level, 1.04)
  if (lv > 0) {
    const wy = GLASS.bottom - lv * (gh - 4)
    c.fillStyle = 'rgba(64, 164, 255, 0.75)'
    c.fillRect(GLASS.left + 3, wy, GLASS.right - GLASS.left - 6, GLASS.bottom - 3 - wy)
    if (status.value === 'overflow') {
      c.fillRect(GLASS.left - 12, GLASS.top, 10, gh)
      c.fillRect(GLASS.right + 2, GLASS.top, 10, gh)
      c.fillRect(GLASS.left - 40, GLASS.bottom, GLASS.right - GLASS.left + 80, 5)
    }
  }
  // Target zone
  const zTop = GLASS.bottom - TARGET_MAX * (gh - 4)
  const zBot = GLASS.bottom - TARGET_MIN * (gh - 4)
  c.fillStyle = 'rgba(46, 204, 113, 0.18)'
  c.fillRect(GLASS.left + 3, zTop, GLASS.right - GLASS.left - 6, zBot - zTop)
  c.strokeStyle = '#27ae60'
  c.lineWidth = 2.5
  c.setLineDash([6, 4])
  const lineY = (zTop + zBot) / 2
  c.beginPath()
  c.moveTo(GLASS.left - 6, lineY)
  c.lineTo(GLASS.right + 6, lineY)
  c.stroke()
  c.setLineDash([])
  // Glass outline
  c.strokeStyle = 'rgba(80, 110, 140, 0.9)'
  c.lineWidth = 3
  c.beginPath()
  c.moveTo(GLASS.left, GLASS.top)
  c.lineTo(GLASS.left, GLASS.bottom)
  c.lineTo(GLASS.right, GLASS.bottom)
  c.lineTo(GLASS.right, GLASS.top)
  c.stroke()
  c.fillStyle = 'rgba(255,255,255,0.35)'
  c.fillRect(GLASS.left + 6, GLASS.top + 6, 6, gh - 14)

  // Robot base (axis 1)
  c.fillStyle = '#5b6b8c'
  c.beginPath()
  c.moveTo(SHOULDER.x - 45, GLASS.bottom)
  c.lineTo(SHOULDER.x - 28, SHOULDER.y + 8)
  c.lineTo(SHOULDER.x + 28, SHOULDER.y + 8)
  c.lineTo(SHOULDER.x + 45, GLASS.bottom)
  c.closePath()
  c.fill()
  // Links
  drawLink(c, SHOULDER, ELBOW, 26, '#ff8a3d')
  drawLink(c, ELBOW, WRIST, 20, '#ff8a3d')

  const { a, pivot } = toolFrame()
  // Tool link (rotates with wrist)
  drawLink(c, WRIST, pivot, 10, '#8a94a6')

  // Carafe
  c.save()
  c.translate(pivot.x, pivot.y)
  c.rotate(a)
  carafePath(c)
  c.fillStyle = 'rgba(220, 240, 255, 0.55)'
  c.fill()
  c.save()
  carafePath(c)
  c.clip()
  // Water stays horizontal in world frame
  const inner = rot(0, 72 - carafe * 62, a)
  c.rotate(-a)
  const surf = inner.y + (carafe > 0.02 ? 0 : 200)
  c.fillStyle = 'rgba(64, 164, 255, 0.75)'
  c.fillRect(-120, surf, 240, 200)
  c.restore()
  carafePath(c)
  c.strokeStyle = '#4a6b8a'
  c.lineWidth = 2.5
  c.stroke()
  // Gripper
  c.fillStyle = '#8a94a6'
  roundRect(c, -22, -2, 44, 10, 4)
  c.fill()
  c.restore()

  // Joints
  drawJoint(c, { x: SHOULDER.x, y: SHOULDER.y + 8 }, 16, '#3d4a66')
  drawJoint(c, SHOULDER, 15, '#3d4a66')
  drawJoint(c, ELBOW, 13, '#3d4a66')
  // Wrist glow
  if (glow > 0.02) {
    const rg = c.createRadialGradient(WRIST.x, WRIST.y, 4, WRIST.x, WRIST.y, 34)
    rg.addColorStop(0, `rgba(255, 214, 10, ${0.85 * glow})`)
    rg.addColorStop(1, 'rgba(255, 214, 10, 0)')
    c.fillStyle = rg
    c.beginPath()
    c.arc(WRIST.x, WRIST.y, 34, 0, Math.PI * 2)
    c.fill()
  }
  drawJoint(c, WRIST, 12, glow > 0.3 ? '#f5a800' : '#3d4a66')

  // Label
  c.font = 'bold 15px system-ui, sans-serif'
  c.textAlign = 'center'
  const lbl = 'Axe 5 : le poignet'
  const lx = WRIST.x + 10
  const ly = WRIST.y - 44
  const tw = c.measureText(lbl).width + 16
  c.fillStyle = glow > 0.3 ? '#fff4c2' : 'rgba(255,255,255,0.9)'
  roundRect(c, lx - tw / 2, ly - 16, tw, 24, 12)
  c.fill()
  c.strokeStyle = '#f5a800'
  c.lineWidth = 1.5
  c.stroke()
  c.fillStyle = '#3d4a66'
  c.fillText(lbl, lx, ly + 1)
  c.beginPath()
  c.moveTo(lx - 10, ly + 8)
  c.lineTo(WRIST.x - 4, WRIST.y - 14)
  c.stroke()

  // Particles
  for (const p of particles) {
    c.fillStyle = p.splash ? 'rgba(120, 190, 255, 0.85)' : 'rgba(64, 164, 255, 0.9)'
    c.beginPath()
    c.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    c.fill()
  }

  // Tilt readout
  c.textAlign = 'left'
  c.font = 'bold 16px system-ui, sans-serif'
  c.fillStyle = tilt.value > SPLASH_TILT ? '#e74c3c' : '#3d4a66'
  c.fillText(`Inclinaison : ${Math.round(tilt.value)}°`, 14, 28)
  if (tilt.value > SPLASH_TILT && status.value === 'play') {
    c.fillText('Trop vite, ça éclabousse !', 14, 50)
  }
}

function loop(now) {
  const dt = Math.min(0.05, lastT ? (now - lastT) / 1000 : 0)
  lastT = now
  update(dt)
  draw()
  rafId = requestAnimationFrame(loop)
}

// Pointer dragging on canvas
function onDown(e) {
  if (status.value !== 'play') return
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t0: tilt.value }
  canvasRef.value.setPointerCapture?.(e.pointerId)
}
function onMove(e) {
  if (!drag || drag.id !== e.pointerId) return
  const d = (e.clientX - drag.x + (e.clientY - drag.y)) / Math.max(scale, 0.5)
  tilt.value = Math.max(0, Math.min(100, drag.t0 + d * 0.5))
}
function onUp(e) {
  if (drag && drag.id === e.pointerId) drag = null
}

onMounted(() => {
  resize()
  window.addEventListener('resize', resize)
  rafId = requestAnimationFrame(loop)
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('resize', resize)
  clearTimeout(winTimer)
})
</script>

<template>
  <div class="pour-game">
    <p class="instruction">
      Incline le poignet du robot pour remplir le verre jusqu'au trait, sans déborder.
    </p>
    <div ref="wrapRef" class="stage">
      <canvas
        ref="canvasRef"
        class="canvas"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onUp"
      ></canvas>
      <div v-if="status === 'win'" class="overlay win">
        <div class="bubble">Bravo !</div>
      </div>
      <div v-else-if="status === 'overflow' || status === 'empty'" class="overlay fail">
        <div class="bubble">
          {{ status === 'overflow' ? 'Ça déborde !' : 'La carafe est vide !' }}
        </div>
        <button class="retry" type="button" @click="reset">Réessayer</button>
      </div>
    </div>
    <div class="controls">
      <label class="slider-label" for="wrist-tilt">
        Incline le poignet <span class="level">Verre : {{ levelPct }} %</span>
      </label>
      <input
        id="wrist-tilt"
        v-model.number="tilt"
        class="slider"
        type="range"
        min="0"
        max="100"
        step="1"
        :disabled="status !== 'play'"
      />
    </div>
  </div>
</template>

<style scoped>
.pour-game {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  font-family: system-ui, -apple-system, sans-serif;
  color: #2f3a55;
}
.instruction {
  margin: 0;
  text-align: center;
  font-size: 1rem;
  line-height: 1.4;
  font-weight: 600;
}
.stage {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
}
.canvas {
  display: block;
  touch-action: none;
  border-radius: 18px;
  box-shadow: 0 6px 20px rgba(47, 58, 85, 0.15);
  cursor: grab;
}
.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  border-radius: 18px;
  animation: pop 0.3s ease-out;
}
.overlay.win {
  background: rgba(46, 204, 113, 0.25);
}
.overlay.fail {
  background: rgba(231, 76, 60, 0.2);
}
.bubble {
  background: #fff;
  padding: 16px 28px;
  border-radius: 20px;
  font-size: 2rem;
  font-weight: 800;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.15);
}
.win .bubble {
  color: #1e9e57;
}
.fail .bubble {
  color: #d64531;
}
.retry {
  font-size: 1.2rem;
  font-weight: 700;
  padding: 12px 28px;
  border: none;
  border-radius: 999px;
  background: #ff8a3d;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(255, 138, 61, 0.4);
}
.controls {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 4px;
  box-sizing: border-box;
}
.slider-label {
  display: flex;
  justify-content: space-between;
  font-weight: 700;
  font-size: 1.05rem;
}
.level {
  color: #2d8fe0;
}
.slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 16px;
  border-radius: 999px;
  background: linear-gradient(90deg, #cfe6ff 0%, #cfe6ff 40%, #9fd8b4 40%, #9fd8b4 75%, #ffc2b8 75%);
  outline: none;
  touch-action: none;
}
.slider:disabled {
  opacity: 0.5;
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f5a800;
  border: 4px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  cursor: pointer;
}
.slider::-moz-range-thumb {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #f5a800;
  border: 4px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  cursor: pointer;
}
@keyframes pop {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
