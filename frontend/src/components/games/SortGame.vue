<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['win'])

const GOAL = 5
const W = 400 // logical width
const H = 500 // logical height (4:5)
const BASE = { x: 200, y: 478 }
const L1 = 200
const L2 = 195
const BELT_Y = 190
const BELT_H = 96
const BIN = { x: 64, y: 400, w: 96, h: 70 }
const HOME = { x: 200, y: 330 }
const COLORS = ['#3aa0ff', '#3ccf6e', '#ffc93f', '#a66cff']
const RED = '#ff3b4e'
const SPEED = 55 // belt speed (logical px / s)

const wrap = ref(null)
const canvas = ref(null)
const score = ref(0)
const won = ref(false)

let ctx = null
let cssW = 0
let dpr = 1
let raf = 0
let lastT = 0
let spawnTimer = 0
let beltOffset = 0
let winTimeout = 0
let nextId = 1

const candies = []
const texts = []
const queue = []

// Arm state
const arm = {
  q1: 0,
  q2: 0,
  phase: 'idle', // idle | toTarget | pick | toBin | drop | home
  t: 0,
  dur: 0,
  from: [0, 0],
  to: [0, 0],
  target: null,
  carried: null,
}

function ik(x, y) {
  const dx = x - BASE.x
  const dy = y - BASE.y
  let d = Math.hypot(dx, dy)
  d = Math.max(Math.abs(L1 - L2) + 1, Math.min(L1 + L2 - 0.5, d))
  let c2 = (d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2)
  c2 = Math.max(-1, Math.min(1, c2))
  const q2 = Math.acos(c2)
  const q1 = Math.atan2(dy, dx) - Math.atan2(L2 * Math.sin(q2), L1 + L2 * Math.cos(q2))
  return [q1, q2]
}

function fk(q1, q2) {
  const ex = BASE.x + L1 * Math.cos(q1)
  const ey = BASE.y + L1 * Math.sin(q1)
  return {
    elbow: { x: ex, y: ey },
    tip: { x: ex + L2 * Math.cos(q1 + q2), y: ey + L2 * Math.sin(q1 + q2) },
  }
}

function angDiff(a, b) {
  let d = b - a
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return d
}

function startMove(phase, x, y, dur) {
  const [t1, t2] = ik(x, y)
  arm.phase = phase
  arm.t = 0
  arm.dur = dur
  arm.from = [arm.q1, arm.q2]
  arm.to = [arm.q1 + angDiff(arm.q1, t1), t2]
}

function ease(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

function nextTarget() {
  while (queue.length) {
    const c = queue.shift()
    if (candies.includes(c) && !c.picked) {
      arm.target = c
      startMove('toTarget', c.x, c.y, 380)
      return true
    }
  }
  return false
}

function addText(text, x, y, color) {
  texts.push({ text, x, y, t: 0, color })
}

function spawn() {
  const isRed = Math.random() < 0.45
  candies.push({
    id: nextId++,
    x: -24,
    y: BELT_Y + (Math.random() - 0.5) * (BELT_H - 40),
    r: 15,
    red: isRed,
    color: isRed ? RED : COLORS[Math.floor(Math.random() * COLORS.length)],
    spin: Math.random() * Math.PI,
    frozen: false,
    picked: false,
  })
}

function update(dt) {
  if (!won.value) {
    spawnTimer -= dt
    if (spawnTimer <= 0) {
      spawn()
      spawnTimer = 0.85 + Math.random() * 0.5
    }
  }
  beltOffset = (beltOffset + SPEED * dt) % 24

  for (let i = candies.length - 1; i >= 0; i--) {
    const c = candies[i]
    if (c.picked) continue
    if (!c.frozen) {
      c.x += SPEED * dt
      c.spin += dt * 1.5
    }
    if (c.x > W + 30) {
      if (c.red && !won.value) addText('raté !', W - 40, BELT_Y - 50, '#ff7a59')
      candies.splice(i, 1)
    }
  }

  // Arm
  if (arm.phase !== 'idle') {
    arm.t += dt * 1000
    const k = Math.min(1, arm.dur ? arm.t / arm.dur : 1)
    const e = ease(k)
    arm.q1 = arm.from[0] + (arm.to[0] - arm.from[0]) * e
    arm.q2 = arm.from[1] + (arm.to[1] - arm.from[1]) * e
    if (arm.carried) {
      const { tip } = fk(arm.q1, arm.q2)
      arm.carried.x = tip.x
      arm.carried.y = tip.y
    }
    if (k >= 1) {
      if (arm.phase === 'toTarget') {
        arm.carried = arm.target
        arm.carried.picked = true
        arm.phase = 'pick'
        arm.t = 0
        arm.dur = 120
        arm.from = [arm.q1, arm.q2]
        arm.to = [arm.q1, arm.q2]
      } else if (arm.phase === 'pick') {
        startMove('toBin', BIN.x, BIN.y - 6, 420)
      } else if (arm.phase === 'toBin') {
        const c = arm.carried
        arm.carried = null
        arm.target = null
        const idx = candies.indexOf(c)
        if (idx >= 0) candies.splice(idx, 1)
        score.value++
        addText('+1', BIN.x, BIN.y - 50, '#2bb673')
        arm.phase = 'drop'
        arm.t = 0
        arm.dur = 100
        arm.from = [arm.q1, arm.q2]
        arm.to = [arm.q1, arm.q2]
        if (score.value >= GOAL && !won.value) {
          won.value = true
          queue.length = 0
          winTimeout = setTimeout(() => emit('win'), 800)
        }
      } else if (arm.phase === 'drop') {
        if (!nextTarget()) startMove('home', HOME.x, HOME.y, 350)
      } else if (arm.phase === 'home') {
        arm.phase = 'idle'
      }
    }
  }

  for (let i = texts.length - 1; i >= 0; i--) {
    texts[i].t += dt
    texts[i].y -= 30 * dt
    if (texts[i].t > 0.9) texts.splice(i, 1)
  }
}

// ---------- Drawing ----------
function roundRect(x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(1, '#ffe1ec')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  // Bunting flags
  const flagCols = ['#ff3b4e', '#ffc93f', '#3aa0ff', '#3ccf6e', '#a66cff']
  ctx.strokeStyle = '#c98a5a'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(0, 18)
  ctx.quadraticCurveTo(W / 2, 44, W, 18)
  ctx.stroke()
  for (let i = 0; i < 12; i++) {
    const x = 12 + i * 34
    const tt = x / W
    const y = (1 - tt) * (1 - tt) * 18 + 2 * (1 - tt) * tt * 44 + tt * tt * 18
    ctx.fillStyle = flagCols[i % flagCols.length]
    ctx.beginPath()
    ctx.moveTo(x - 9, y)
    ctx.lineTo(x + 9, y)
    ctx.lineTo(x, y + 18)
    ctx.closePath()
    ctx.fill()
  }
}

function drawBelt() {
  const top = BELT_Y - BELT_H / 2
  ctx.fillStyle = '#5b4a6b'
  roundRect(-10, top - 8, W + 20, BELT_H + 16, 10)
  ctx.fill()
  ctx.fillStyle = '#3a3046'
  ctx.fillRect(0, top, W, BELT_H)
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 3
  for (let x = -24 + beltOffset; x < W + 24; x += 24) {
    ctx.beginPath()
    ctx.moveTo(x, top)
    ctx.lineTo(x, top + BELT_H)
    ctx.stroke()
  }
  // arrows
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  for (let x = 30; x < W; x += 110) {
    ctx.beginPath()
    ctx.moveTo(x, top + BELT_H + 14)
    ctx.lineTo(x + 14, top + BELT_H + 20)
    ctx.lineTo(x, top + BELT_H + 26)
    ctx.fill()
  }
}

function drawBin() {
  ctx.fillStyle = '#2bb673'
  roundRect(BIN.x - BIN.w / 2, BIN.y - BIN.h / 2 + 10, BIN.w, BIN.h, 12)
  ctx.fill()
  ctx.fillStyle = '#1f8c58'
  roundRect(BIN.x - BIN.w / 2 + 8, BIN.y - BIN.h / 2 + 18, BIN.w - 16, BIN.h - 26, 8)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 14px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('BAC', BIN.x, BIN.y + BIN.h / 2 + 22)
  // mini red candies in bin
  for (let i = 0; i < score.value; i++) {
    ctx.fillStyle = RED
    ctx.beginPath()
    ctx.arc(BIN.x - 28 + i * 14, BIN.y + 22 - (i % 2) * 6, 7, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawCandy(c) {
  ctx.save()
  ctx.translate(c.x, c.y)
  ctx.rotate(c.spin)
  ctx.fillStyle = c.color
  // wrapper ends
  ctx.beginPath()
  ctx.moveTo(-c.r + 2, 0)
  ctx.lineTo(-c.r - 10, -9)
  ctx.lineTo(-c.r - 10, 9)
  ctx.closePath()
  ctx.moveTo(c.r - 2, 0)
  ctx.lineTo(c.r + 10, -9)
  ctx.lineTo(c.r + 10, 9)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.arc(0, 0, c.r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.beginPath()
  ctx.arc(-5, -5, 4.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  if (c === arm.target && !c.picked) {
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2.5
    ctx.setLineDash([5, 4])
    ctx.beginPath()
    ctx.arc(c.x, c.y, c.r + 12, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
  }
}

function link(a, b, w, color) {
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'
  ctx.lineWidth = w + 4
  ctx.beginPath()
  ctx.moveTo(a.x + 3, a.y + 4)
  ctx.lineTo(b.x + 3, b.y + 4)
  ctx.stroke()
  ctx.strokeStyle = color
  ctx.lineWidth = w
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.stroke()
}

function drawArm() {
  const { elbow, tip } = fk(arm.q1, arm.q2)
  // base
  ctx.fillStyle = '#5b4a6b'
  ctx.beginPath()
  ctx.arc(BASE.x, BASE.y, 30, 0, Math.PI * 2)
  ctx.fill()
  link(BASE, elbow, 26, '#ff9f1c')
  link(elbow, tip, 20, '#ffc93f')
  // joints
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#5b4a6b'
  ctx.lineWidth = 4
  for (const p of [BASE, elbow]) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
  if (arm.carried) drawCandy(arm.carried)
  // suction cup
  ctx.fillStyle = arm.carried ? 'rgba(58,160,255,0.55)' : '#3aa0ff'
  ctx.strokeStyle = '#1f6fbf'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(tip.x, tip.y, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
}

function draw() {
  ctx.setTransform(dpr * (cssW / W), 0, 0, dpr * (cssW / W), 0, 0)
  drawBackground()
  drawBelt()
  drawBin()
  for (const c of candies) if (!c.picked) drawCandy(c)
  drawArm()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = 'bold 20px system-ui, sans-serif'
  for (const t of texts) {
    ctx.globalAlpha = Math.max(0, 1 - t.t / 0.9)
    ctx.fillStyle = t.color
    ctx.fillText(t.text, t.x, t.y)
  }
  ctx.globalAlpha = 1
}

function loop(t) {
  const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0
  lastT = t
  update(dt)
  draw()
  raf = requestAnimationFrame(loop)
}

// ---------- Input & sizing ----------
function onPointerDown(e) {
  if (won.value) return
  e.preventDefault()
  const rect = canvas.value.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * W
  const y = ((e.clientY - rect.top) / rect.height) * H
  let best = null
  let bestD = 34
  for (const c of candies) {
    if (c.picked) continue
    let d = Math.hypot(c.x - x, c.y - y)
    if (c.red) d -= 6 // favor red when candies overlap
    if (d < bestD) {
      bestD = d
      best = c
    }
  }
  if (!best) return
  if (!best.red) {
    addText('oups !', best.x, best.y - 28, '#a66cff')
    return
  }
  if (best.frozen) return
  best.frozen = true
  queue.push(best)
  if (arm.phase === 'idle' || arm.phase === 'home') nextTarget()
}

function resize() {
  if (!wrap.value || !canvas.value) return
  cssW = Math.min(480, wrap.value.clientWidth || 320)
  dpr = window.devicePixelRatio || 1
  const cssH = cssW * (H / W)
  canvas.value.style.width = cssW + 'px'
  canvas.value.style.height = cssH + 'px'
  canvas.value.width = Math.round(cssW * dpr)
  canvas.value.height = Math.round(cssH * dpr)
}

onMounted(() => {
  ctx = canvas.value.getContext('2d')
  const [a, b] = ik(HOME.x, HOME.y)
  arm.q1 = a
  arm.q2 = b
  resize()
  window.addEventListener('resize', resize)
  spawn()
  spawnTimer = 0.6
  raf = requestAnimationFrame(loop)
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
  clearTimeout(winTimeout)
  window.removeEventListener('resize', resize)
})
</script>

<template>
  <div class="sort-game">
    <p class="instruction">
      Touche les bonbons rouges : le bras SCARA les attrape et les dépose dans le bac.
    </p>
    <div class="counter">
      <span class="dot"></span>
      {{ score }} / {{ GOAL }}
    </div>
    <div ref="wrap" class="stage">
      <canvas ref="canvas" class="board" @pointerdown="onPointerDown"></canvas>
      <transition name="pop">
        <div v-if="won" class="overlay">
          <div class="bravo">Bravo !</div>
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.sort-game {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
}
.instruction {
  margin: 0;
  text-align: center;
  font-size: 0.98rem;
  line-height: 1.35;
  color: #4a3a5a;
  font-weight: 600;
}
.counter {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 14px;
  border-radius: 999px;
  background: #fff;
  color: #3a3046;
  font-weight: 800;
  font-size: 1.1rem;
  box-shadow: 0 2px 0 #ffb4c4;
}
.dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #ff3b4e;
}
.stage {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
}
.board {
  display: block;
  border-radius: 18px;
  box-shadow: 0 6px 18px rgba(90, 40, 80, 0.18);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  cursor: pointer;
}
.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.bravo {
  padding: 18px 34px;
  border-radius: 0;
  background: #ffc93f;
  color: #3a3046;
  font-size: 2.2rem;
  font-weight: 900;
  box-shadow: 0 6px 0 #ff9f1c, 0 10px 24px rgba(0, 0, 0, 0.2);
  transform: rotate(-4deg);
}
.pop-enter-active {
  transition: transform 0.35s cubic-bezier(0.2, 1.6, 0.4, 1), opacity 0.2s;
}
.pop-enter-from {
  transform: scale(0.4);
  opacity: 0;
}
</style>
