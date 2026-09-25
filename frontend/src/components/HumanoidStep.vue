<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({ pieces: Array, points: Number })
const canvas = ref(null)
const name = ref('Robby')
const color = ref('#2e86de')
const colors = ['#2e86de', '#e8467c', '#f2b705', '#26890c', '#5b3a8c']
const has = (slot) => props.pieces.some((p) => p.slot === slot)

function draw() {
  const c = canvas.value
  const ctx = c.getContext('2d')
  const W = c.width, H = c.height
  const css = getComputedStyle(document.documentElement)
  const bg = css.getPropertyValue('--accent-50').trim()
  const ink = css.getPropertyValue('--ink').trim()
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = ink
  ctx.font = 'bold 36px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(name.value || 'Mon robot', W / 2, 60)

  const cx = W / 2
  ctx.lineCap = 'round'
  // Tête et corps
  ctx.fillStyle = color.value
  roundRect(ctx, cx - 50, 100, 100, 80, 20)
  ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.arc(cx - 20, 140, 10, 0, 7); ctx.arc(cx + 20, 140, 10, 0, 7); ctx.fill()
  ctx.fillStyle = color.value
  roundRect(ctx, cx - 70, 195, 140, 160, 24)

  // Jambes : rails linéaires
  ctx.strokeStyle = has('legs') ? '#8a8fa0' : '#ddd'
  ctx.lineWidth = 22
  ctx.beginPath(); ctx.moveTo(cx - 35, 360); ctx.lineTo(cx - 35, 470); ctx.moveTo(cx + 35, 360); ctx.lineTo(cx + 35, 470); ctx.stroke()
  if (has('legs')) {
    ctx.fillStyle = ink
    ctx.fillRect(cx - 50, 400, 30, 20); ctx.fillRect(cx + 20, 420, 30, 20)
  }

  // Bras gauche simple, bras droit : poignet motorisé 6 axes
  ctx.strokeStyle = color.value
  ctx.lineWidth = 20
  ctx.beginPath(); ctx.moveTo(cx - 70, 215); ctx.lineTo(cx - 120, 300); ctx.lineTo(cx - 110, 370); ctx.stroke()
  ctx.strokeStyle = has('arm') ? ink : '#ddd'
  ctx.beginPath(); ctx.moveTo(cx + 70, 215); ctx.lineTo(cx + 130, 280); ctx.lineTo(cx + 170, 220); ctx.stroke()
  if (has('arm')) {
    ctx.fillStyle = '#f2b705'
    for (const [x, y] of [[cx + 70, 215], [cx + 130, 280], [cx + 170, 220]]) { ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.fill() }
  }
  // Main : ventouse
  if (has('hand')) {
    ctx.fillStyle = '#e8467c'
    ctx.beginPath(); ctx.moveTo(cx + 160, 200); ctx.lineTo(cx + 190, 180); ctx.lineTo(cx + 200, 200); ctx.closePath(); ctx.fill()
  }

  ctx.fillStyle = ink
  ctx.font = '20px system-ui, sans-serif'
  ctx.fillText(props.pieces.map((p) => p.name).join(' · '), W / 2, 520)
  ctx.fillText(`⭐ ${props.points} points · Permis cartésien, SCARA et 6 axes`, W / 2, 555)
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}

function download() {
  const a = document.createElement('a')
  a.href = canvas.value.toDataURL('image/png')
  a.download = `${(name.value || 'mon-robot').replace(/\s+/g, '-')}.png`
  a.click()
}

onMounted(draw)
watch([name, color], draw)
</script>

<template>
  <div class="humanoid">
    <h2>Ton robot est prêt !</h2>
    <p>Toutes ses pièces sont de vrais composants de robot. D'ailleurs, son bras droit est… un robot 6 axes 😉</p>
    <canvas ref="canvas" width="600" height="600" />
    <label>Son nom <input v-model="name" maxlength="20" /></label>
    <div class="colors">
      <button v-for="c in colors" :key="c" :style="{ background: c }" :class="{ on: c === color }" @click="color = c" :aria-label="c" />
    </div>
    <button class="dl" @click="download">📥 Télécharger mon robot</button>
  </div>
</template>

<style scoped>
.humanoid { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; }
canvas { width: 100%; max-width: 360px; border-radius: 16px; }
label { font-weight: 600; color: var(--ink); font-size: 0.875rem; }
input { margin-left: 8px; padding: 10px 12px; border: 1px solid var(--border); color: var(--ink); font: inherit; font-weight: 400; font-size: 1rem; }
input:focus { border-color: var(--accent); }
.colors { display: flex; gap: 10px; }
.colors button { width: 36px; height: 36px; border-radius: 50%; border: 3px solid var(--white); outline: 1px solid var(--border); padding: 0; }
.colors button.on { outline: 3px solid var(--ink); }
.dl { width: 100%; max-width: 360px; }
</style>
