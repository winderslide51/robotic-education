<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['win'])

const wrap = ref(null)
const canvas = ref(null)
const message = ref('')
let ctx, W = 0, H = 0, raf = 0, won = false

// Positions normalisées (0..1) du chariot X, du portique Y (profondeur) et de la pince Z
const claw = { x: 0.2, y: 0.5, z: 0, state: 'idle', holding: false }
const plush = { x: 0.7, y: 0.5, caught: false, fallen: false }
const chute = { x: 0.1 }
const held = { left: false, right: false, up: false, down: false }
const SPEED = 0.006

function resize() {
  const w = Math.min(wrap.value.clientWidth, 480)
  const h = Math.round(w * 0.8)
  const dpr = window.devicePixelRatio || 1
  canvas.value.width = w * dpr
  canvas.value.height = h * dpr
  canvas.value.style.width = w + 'px'
  canvas.value.style.height = h + 'px'
  ctx = canvas.value.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  W = w
  H = h
}

function drop() {
  if (claw.state !== 'idle' || won) return
  claw.state = 'down'
  message.value = ''
}

function update() {
  if (claw.state === 'idle') {
    if (held.left) claw.x = Math.max(0.08, claw.x - SPEED)
    if (held.right) claw.x = Math.min(0.92, claw.x + SPEED)
    if (held.up) claw.y = Math.max(0.2, claw.y - SPEED)
    if (held.down) claw.y = Math.min(0.8, claw.y + SPEED)
  } else if (claw.state === 'down') {
    claw.z += 0.02
    if (claw.z >= 1) {
      claw.z = 1
      const dx = Math.abs(claw.x - plush.x)
      const dy = Math.abs(claw.y - plush.y)
      if (dx < 0.07 && dy < 0.12) {
        claw.holding = true
        plush.caught = true
      } else {
        message.value = dx >= 0.07 ? 'Raté ! Ajuste l’axe X (gauche / droite).' : 'Raté ! Ajuste l’axe Y (avant / arrière).'
      }
      claw.state = 'up'
    }
  } else if (claw.state === 'up') {
    claw.z -= 0.02
    if (claw.z <= 0) {
      claw.z = 0
      claw.state = claw.holding ? 'home' : 'idle'
    }
  } else if (claw.state === 'home') {
    claw.x -= 0.008
    claw.y += (0.5 - claw.y) * 0.05
    if (claw.x <= chute.x) {
      claw.x = chute.x
      claw.holding = false
      plush.fallen = true
      claw.state = 'done'
      won = true
      message.value = 'Bravo ! Tu as piloté 3 axes : X, Y et Z.'
      setTimeout(() => emit('win'), 1200)
    }
  }
  if (plush.caught && !plush.fallen) {
    plush.x = claw.x
    plush.y = claw.y
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H)
  // Cabine de la machine
  const top = H * 0.12, floor = H * 0.88
  ctx.fillStyle = '#fff4e0'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#ffd6e7'
  ctx.fillRect(W * 0.04, top, W * 0.92, floor - top)
  ctx.strokeStyle = '#e8467c'
  ctx.lineWidth = 6
  ctx.strokeRect(W * 0.04, top, W * 0.92, floor - top)

  // Trappe de sortie
  ctx.fillStyle = '#5b3a8c'
  ctx.fillRect(W * 0.05, floor - 40, W * 0.12, 40)

  // Rail X (portique)
  const railY = top + 14
  ctx.fillStyle = '#8a8fa0'
  ctx.fillRect(W * 0.06, railY - 4, W * 0.88, 8)

  // Profondeur Y : taille et hauteur apparente
  const depthScale = (y) => 0.75 + y * 0.5
  const groundAt = (y) => floor - 20 - (1 - y) * (floor - top) * 0.25

  // Peluche
  if (!plush.fallen || true) {
    const px = W * plush.x
    const s = depthScale(plush.y)
    let py
    if (plush.fallen) py = floor - 18
    else if (plush.caught) py = railY + 30 + claw.z * (groundAt(claw.y) - railY - 40) + 22 * s
    else py = groundAt(plush.y)
    drawPlush(px, py, 18 * s)
  }

  // Chariot + câble + pince
  const cx = W * claw.x
  const s = depthScale(claw.y)
  const cableEnd = railY + 30 + claw.z * (groundAt(claw.y) - railY - 40)
  ctx.fillStyle = '#394060'
  ctx.fillRect(cx - 18, railY - 10, 36, 20)
  ctx.strokeStyle = '#394060'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx, railY + 10)
  ctx.lineTo(cx, cableEnd)
  ctx.stroke()
  const open = claw.state === 'down' ? 1 : 0.4
  ctx.lineWidth = 4
  ctx.strokeStyle = '#f2b705'
  ctx.beginPath()
  ctx.moveTo(cx, cableEnd)
  ctx.lineTo(cx - 14 * s * open - 4, cableEnd + 16 * s)
  ctx.moveTo(cx, cableEnd)
  ctx.lineTo(cx + 14 * s * open + 4, cableEnd + 16 * s)
  ctx.stroke()

  // Ombre au sol : aide à viser en profondeur
  ctx.fillStyle = 'rgba(0,0,0,0.15)'
  ctx.beginPath()
  ctx.ellipse(cx, groundAt(claw.y) + 14, 16 * s, 5 * s, 0, 0, Math.PI * 2)
  ctx.fill()

  // Indicateurs d'axes
  ctx.fillStyle = '#394060'
  ctx.font = 'bold 13px system-ui, sans-serif'
  ctx.fillText(`X ${Math.round(claw.x * 100)}   Y ${Math.round(claw.y * 100)}   Z ${Math.round(claw.z * 100)}`, W * 0.06, H * 0.07)
}

function drawPlush(x, y, r) {
  ctx.fillStyle = '#9b6b43'
  ctx.beginPath()
  ctx.arc(x - r * 0.7, y - r * 0.8, r * 0.4, 0, Math.PI * 2)
  ctx.arc(x + r * 0.7, y - r * 0.8, r * 0.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#222'
  ctx.beginPath()
  ctx.arc(x - r * 0.35, y - r * 0.15, r * 0.12, 0, Math.PI * 2)
  ctx.arc(x + r * 0.35, y - r * 0.15, r * 0.12, 0, Math.PI * 2)
  ctx.fill()
}

function loop() {
  update()
  draw()
  raf = requestAnimationFrame(loop)
}

function press(dir, v) {
  held[dir] = v
}

onMounted(() => {
  resize()
  window.addEventListener('resize', resize)
  loop()
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', resize)
})
</script>

<template>
  <div class="claw">
    <p class="hint">Déplace la pince avec les flèches, puis appuie sur <b>Attraper</b> et dépose la peluche dans la trappe violette.</p>
    <div ref="wrap" class="stage"><canvas ref="canvas" /></div>
    <p class="msg" :class="{ ok: message.startsWith('Bravo') }">{{ message }}</p>
    <div class="pad">
      <div class="arrows">
        <button class="up" @pointerdown="press('up', true)" @pointerup="press('up', false)" @pointerleave="press('up', false)">▲<small>Y</small></button>
        <button class="left" @pointerdown="press('left', true)" @pointerup="press('left', false)" @pointerleave="press('left', false)">◀<small>X</small></button>
        <button class="right" @pointerdown="press('right', true)" @pointerup="press('right', false)" @pointerleave="press('right', false)">▶<small>X</small></button>
        <button class="down" @pointerdown="press('down', true)" @pointerup="press('down', false)" @pointerleave="press('down', false)">▼<small>Y</small></button>
      </div>
      <button class="grab" @click="drop">Attraper<small>axe Z</small></button>
    </div>
  </div>
</template>

<style scoped>
.claw { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.hint { margin: 0; text-align: center; font-size: 0.95rem; }
.stage { width: 100%; max-width: 480px; display: flex; justify-content: center; }
canvas { border-radius: 16px; touch-action: none; }
.msg { min-height: 1.4em; margin: 0; font-weight: 600; color: #c0392b; text-align: center; }
.msg.ok { color: #1e8449; }
.pad { display: flex; align-items: center; gap: 24px; user-select: none; -webkit-user-select: none; }
.arrows { display: grid; grid-template-columns: repeat(3, 56px); grid-template-rows: repeat(3, 48px); gap: 4px; }
.arrows button { font-size: 1.2rem; border-radius: 12px; border: none; background: #394060; color: #fff; touch-action: none; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1; }
.arrows small { font-size: 0.6rem; opacity: 0.8; }
.up { grid-column: 2; grid-row: 1; }
.left { grid-column: 1; grid-row: 2; }
.right { grid-column: 3; grid-row: 2; }
.down { grid-column: 2; grid-row: 3; }
.grab { width: 96px; height: 96px; border-radius: 50%; border: none; background: #e8467c; color: #fff; font-weight: 700; font-size: 1rem; box-shadow: 0 6px 0 #a82d57; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.grab:active { transform: translateY(4px); box-shadow: 0 2px 0 #a82d57; }
.grab small { font-weight: 400; font-size: 0.7rem; }
</style>
