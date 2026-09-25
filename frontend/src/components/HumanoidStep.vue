<script setup>
import { ref, watch, nextTick, onUnmounted } from 'vue'
import Robot3D from './Robot3D.vue'

const props = defineProps({
  pieces: { type: Array, default: () => [] },
  points: { type: Number, default: 0 },
  ateliers: { type: Array, default: () => ['Robot cartésien', 'Robot SCARA', 'Robot 6 axes'] },
})

const COLORS = [
  { hex: '#EA580C', name: 'Orange' },
  { hex: '#2563EB', name: 'Bleu' },
  { hex: '#16A34A', name: 'Vert' },
  { hex: '#9333EA', name: 'Violet' },
  { hex: '#0F172A', name: 'Noir' },
]
const BASE = import.meta.env.BASE_URL || '/'

const robot = ref(null)
const video = ref(null)
const fileInput = ref(null)
const name = ref('')
const color = ref(COLORS[0].hex)

// La photo ne vit que dans la mémoire de la page : jamais envoyée, jamais enregistrée.
const photo = ref('') // image carrée (data URL), ou '' sans photo
const photoStep = ref('ask') // ask | camera | done
const cameraError = ref('')
const videoReady = ref(false)
const diplomaUrl = ref('')
const composing = ref(false)
const composeError = ref('')
let stream = null
let alive = true
let camReq = 0 // jeton de la demande de caméra en cours : une réponse périmée est aussitôt coupée
let camPending = false
let lastCanvas = null

// --- Caméra frontale ---
function stopCamera() {
  stream?.getTracks().forEach((t) => t.stop())
  stream = null
  videoReady.value = false
  if (video.value) video.value.srcObject = null
}

function openPicker() {
  fileInput.value?.click()
}

const stopTracks = (s) => s?.getTracks().forEach((t) => t.stop())

// Invalide la demande de caméra en cours (sa réponse sera coupée dès son arrivée)
function dropCameraRequest() {
  camReq += 1
  camPending = false
}

async function startCamera() {
  if (camPending) return // double appui : une seule demande à la fois
  cameraError.value = ''
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraError.value = 'La caméra n’est pas disponible : choisis plutôt une photo.'
    return
  }
  const my = ++camReq
  camPending = true
  let s
  try {
    s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } }, audio: false })
  } catch (e) {
    if (my !== camReq) return
    camPending = false
    console.warn('Caméra indisponible :', e?.name || e)
    if (alive && photoStep.value === 'ask') cameraError.value = 'La caméra n’est pas accessible : choisis plutôt une photo.'
    return
  }
  if (my === camReq) camPending = false
  if (!alive || my !== camReq || photoStep.value !== 'ask') return stopTracks(s)
  stopCamera()
  stream = s
  photoStep.value = 'camera'
  await nextTick()
  const v = video.value
  if (!v || stream !== s) return
  v.srcObject = s
  v.onloadedmetadata = () => (videoReady.value = true)
  await v.play().catch(() => {})
  if (v.videoWidth) videoReady.value = true
}

function cancelCamera() {
  dropCameraRequest()
  stopCamera()
  photoStep.value = photo.value || diplomaUrl.value ? 'done' : 'ask'
}

// Recadre au centre en carré ; la vue de la caméra frontale est retournée comme dans un miroir
function squareCrop(source, sw, sh, mirror) {
  const size = Math.min(sw, sh)
  const c = document.createElement('canvas')
  c.width = c.height = 600
  const g = c.getContext('2d')
  if (mirror) {
    g.translate(600, 0)
    g.scale(-1, 1)
  }
  g.drawImage(source, (sw - size) / 2, (sh - size) / 2, size, size, 0, 0, 600, 600)
  return c.toDataURL('image/jpeg', 0.9)
}

function shoot() {
  const v = video.value
  if (!v?.videoWidth) return
  photo.value = squareCrop(v, v.videoWidth, v.videoHeight, true)
  stopCamera()
  photoStep.value = 'done'
}

function onFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => {
    photo.value = squareCrop(img, img.naturalWidth, img.naturalHeight, false)
    URL.revokeObjectURL(url)
    cameraError.value = ''
    photoStep.value = 'done'
  }
  img.onerror = () => {
    URL.revokeObjectURL(url)
    cameraError.value = 'Cette image ne peut pas être lue. Essaie une autre photo.'
  }
  img.src = url
}

function withoutPhoto() {
  dropCameraRequest()
  stopCamera()
  photo.value = ''
  cameraError.value = ''
  photoStep.value = 'done'
}

function retakePhoto() {
  cameraError.value = ''
  photoStep.value = 'ask'
}

// Annule « Changer / Ajouter ma photo » en gardant la photo actuelle
function keepPhoto() {
  dropCameraRequest()
  cameraError.value = ''
  photoStep.value = 'done'
}

// --- Composition du diplôme (canvas 2D, entièrement sur l'appareil) ---
const W = 1080
const H = 1440
const FONT = 'Geist, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
const INK = '#0F172A'
const TEXT = '#475569'
const MUTED = '#64748B'
const ACCENT = '#EA580C'

function loadImage(src, w, h) {
  return new Promise((resolve) => {
    if (!src) return resolve(null)
    const img = w ? new Image(w, h) : new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

// Logo JVMA : proportions lues dans son viewBox. Un SVG sans width/height peut ne rien dessiner
// (Firefox) : on le recharge alors depuis une copie en mémoire à laquelle on ajoute une taille.
const LOGO_H = 96
async function fetchLogo() {
  try {
    const url = `${BASE}brand/logo-jvma.svg`
    const text = await (await fetch(url)).text()
    const vb = text.match(/viewBox\s*=\s*["']([^"']+)["']/)?.[1].trim().split(/[\s,]+/).map(Number)
    const ratio = vb?.length === 4 && vb[2] > 0 && vb[3] > 0 ? vb[2] / vb[3] : 2
    const w = Math.round(LOGO_H * ratio)
    let img = await loadImage(url, w, LOGO_H)
    if (!img?.naturalWidth && !/<svg\b[^>]*\swidth\s*=/.test(text)) {
      const sized = text.replace(/<svg\b/, `<svg width="${w * 4}" height="${LOGO_H * 4}"`)
      const blobUrl = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }))
      img = await loadImage(blobUrl, w, LOGO_H)
      URL.revokeObjectURL(blobUrl)
    }
    return img ? { img, w, h: LOGO_H } : null
  } catch {
    return null
  }
}
let logoPromise = null
const loadLogo = () => (logoPromise ??= fetchLogo())

// Réduit la police jusqu'au minimum, puis tronque avec « … » ; renvoie le texte à dessiner
function fitText(g, text, max, size, weight = 700, min = 14) {
  let s = size
  for (;;) {
    g.font = `${weight} ${s}px ${FONT}`
    if (g.measureText(text).width <= max || s <= min) break
    s = Math.max(min, s - 2)
  }
  if (g.measureText(text).width <= max) return text
  let t = text
  while (t.length > 1 && g.measureText(`${t}…`).width > max) t = t.slice(0, -1)
  return `${t.trimEnd()}…`
}

// Cadre serré autour des pixels non transparents (la capture 3D a beaucoup de marge)
function opaqueBox(img) {
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const g = c.getContext('2d')
  g.drawImage(img, 0, 0)
  let d
  try { d = g.getImageData(0, 0, c.width, c.height).data } catch { return [0, 0, img.width, img.height] }
  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (d[(y * c.width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  if (x1 < 0) return [0, 0, img.width, img.height]
  return [x0, y0, x1 - x0 + 1, y1 - y0 + 1]
}

function drawContain(g, img, x, y, w, h) {
  const [sx, sy, sw, sh] = opaqueBox(img)
  const k = Math.min(w / sw, h / sh)
  const dw = sw * k
  const dh = sh * k
  g.drawImage(img, sx, sy, sw, sh, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

function mosaic(g, x, y, dir) {
  const cells = [[0, 0, '#E98E5E'], [1, 0, '#F9C4A8'], [0, 1, '#F9C4A8'], [2, 0, '#E98E5E'], [0, 2, '#E98E5E'], [1, 1, '#E98E5E']]
  for (const [i, j, c] of cells) {
    g.fillStyle = c
    g.fillRect(x + dir * i * 30 - (dir < 0 ? 30 : 0), y + dir * j * 30 - (dir < 0 ? 30 : 0), 30, 30)
  }
}

let token = 0
async function compose() {
  const my = ++token
  composing.value = true
  composeError.value = ''
  try {
    await draw(my)
  } catch (e) {
    console.warn('Diplôme impossible à préparer :', e)
    if (my === token) composeError.value = 'Le diplôme n’a pas pu être préparé. Réessaie.'
  } finally {
    if (my === token) composing.value = false
  }
}

async function draw(my) {
  await robot.value?.whenReady()
  const robotUrl = robot.value?.toDataURL() || ''
  const [logo, robotImg, photoImg] = await Promise.all([loadLogo(), loadImage(robotUrl), loadImage(photo.value)])
  await document.fonts?.ready
  if (my !== token || !alive) return

  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  g.fillStyle = '#fff'
  g.fillRect(0, 0, W, H)
  g.strokeStyle = ACCENT
  g.lineWidth = 6
  g.strokeRect(33, 33, W - 66, H - 66)
  mosaic(g, 36, 36, 1)
  mosaic(g, W - 36, H - 36, -1)

  // En-tête : logo JVMA (proportions d'origine) et Robolution
  if (logo) {
    try {
      g.drawImage(logo.img, 150, 80, logo.w, logo.h)
    } catch { /* logo SVG non dessinable sur ce navigateur */ }
  }
  g.textAlign = 'right'
  g.fillStyle = MUTED
  g.font = `600 24px ${FONT}`
  g.fillText('HALLE TECHNIQUE', W - 100, 120)
  g.fillStyle = INK
  g.font = `700 44px ${FONT}`
  g.fillText('Robolution', W - 100, 168)
  g.fillStyle = '#CBD5E1'
  g.fillRect(100, 216, W - 200, 2)

  // Titre
  g.textAlign = 'center'
  g.fillStyle = ACCENT
  g.font = `700 30px ${FONT}`
  g.fillText('D I P L Ô M E', W / 2, 290)
  g.fillStyle = INK
  g.font = `700 84px ${FONT}`
  g.fillText('Roboticien·ne', W / 2, 380)
  g.fillStyle = TEXT
  g.font = `400 32px ${FONT}`
  g.fillText('de la halle technique Robolution', W / 2, 432)

  // Photo et robot
  const top = 490
  const size = 400
  let rx = (W - 460) / 2
  if (photoImg) {
    g.fillStyle = ACCENT
    g.fillRect(100 - 8, top - 8, size + 16, size + 16)
    g.drawImage(photoImg, 100, top, size, size)
    rx = 540
  }
  g.fillStyle = '#FFF7ED'
  g.fillRect(rx, top - 8, 460, size + 16)
  g.strokeStyle = '#FDBA74'
  g.lineWidth = 2
  g.strokeRect(rx, top - 8, 460, size + 16)
  if (robotImg) drawContain(g, robotImg, rx + 20, top + 12, 420, size - 24)

  // Nom
  g.fillStyle = TEXT
  g.font = `400 30px ${FONT}`
  g.fillText('décerné à', W / 2, 976)
  g.fillStyle = INK
  const who = name.value.trim() || 'Recrue Robolution'
  g.fillText(fitText(g, who, W - 240, 76), W / 2, 1056)

  // Les 3 ateliers validés
  const bw = (W - 200 - 40) / 3
  props.ateliers.slice(0, 3).forEach((a, i) => {
    const x = 100 + i * (bw + 20)
    g.fillStyle = '#FFF7ED'
    g.fillRect(x, 1100, bw, 72)
    g.strokeStyle = '#FDBA74'
    g.strokeRect(x, 1100, bw, 72)
    g.fillStyle = ACCENT
    g.fillRect(x + 16, 1122, 28, 28)
    g.fillStyle = '#fff'
    g.font = `700 22px ${FONT}`
    g.fillText('✓', x + 30, 1144)
    g.fillStyle = INK
    const label = fitText(g, a, bw - 72, 26)
    g.textAlign = 'left'
    g.fillText(label, x + 56, 1146)
    g.textAlign = 'center'
  })

  // Score, pièces et date
  g.fillStyle = ACCENT
  g.font = `700 44px ${FONT}`
  g.fillText(`${props.points.toLocaleString('fr-FR')} points`, W / 2, 1248)
  g.fillStyle = MUTED
  const parts = props.pieces.map((p) => p.name).join(' · ')
  if (parts) {
    g.fillText(fitText(g, `Pièces gagnées : ${parts}`, W - 220, 24, 400), W / 2, 1310)
  }
  g.font = `400 24px ${FONT}`
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  g.fillText(`Le ${date}`, W / 2, 1352)

  diplomaUrl.value = c.toDataURL('image/png')
  lastCanvas = c
}

// PNG produit avec toBlob ; partage natif si possible (iOS Safari ignore souvent « download »),
// sinon lien de téléchargement vers une URL blob, révoquée ensuite
async function download() {
  if (!lastCanvas || composing.value) return
  const blob = await new Promise((r) => lastCanvas.toBlob(r, 'image/png'))
  if (!blob) return
  const slug = (name.value.trim() || 'robolution').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
  const filename = `diplome-${slug || 'robolution'}.png`
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Mon diplôme Robolution' })
      return
    } catch (e) {
      if (e?.name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

// Le diplôme se recompose dès qu'on change la photo, le nom ou la couleur
let timer = 0
watch([photoStep, photo, name, color], () => {
  if (photoStep.value !== 'done') return
  composing.value = true
  clearTimeout(timer)
  timer = setTimeout(compose, 250)
})

onUnmounted(() => {
  alive = false
  clearTimeout(timer)
  dropCameraRequest()
  stopCamera()
})
</script>

<template>
  <div class="humanoid">
    <h2>Ton robot est prêt !</h2>
    <p class="lead">Toutes ses pièces sont de vrais composants de robot. D'ailleurs, son bras droit est… un robot 6 axes 😉</p>

    <Robot3D ref="robot" :pieces="pieces" :color="color" />

    <div class="field">
      <span class="label">Sa couleur</span>
      <div class="colors">
        <button v-for="c in COLORS" :key="c.hex" :style="{ background: c.hex }" :class="{ on: c.hex === color }" :aria-label="c.name" :title="c.name" :aria-pressed="c.hex === color" @click="color = c.hex" />
      </div>
    </div>

    <label class="field">
      <span class="label">Ton prénom ou pseudo</span>
      <input v-model="name" maxlength="24" placeholder="Pour ton diplôme" autocomplete="off" />
    </label>

    <section class="photo">
      <span class="label">Ta photo sur le diplôme</span>
      <p class="note">Elle reste sur ton téléphone : elle n'est envoyée nulle part.</p>

      <template v-if="photoStep === 'ask'">
        <div class="row">
          <button class="primary" @click="startCamera">📸 Prendre ma photo</button>
          <button class="secondary" @click="withoutPhoto">Sans photo</button>
        </div>
        <p v-if="cameraError" class="error" role="status">{{ cameraError }}</p>
        <button v-if="cameraError" class="secondary" @click="openPicker">Choisir une photo</button>
        <button v-if="diplomaUrl" class="secondary" @click="keepPhoto">Annuler</button>
      </template>

      <template v-else-if="photoStep === 'camera'">
        <div class="viewfinder">
          <video ref="video" autoplay playsinline muted />
        </div>
        <div class="row">
          <button class="primary" :disabled="!videoReady" @click="shoot">Déclencher</button>
          <button class="secondary" @click="cancelCamera">Annuler</button>
        </div>
      </template>

      <template v-else>
        <div class="row">
          <button class="secondary" @click="retakePhoto">{{ photo ? 'Changer la photo' : 'Ajouter ma photo' }}</button>
          <button v-if="photo" class="secondary" @click="withoutPhoto">Sans photo</button>
        </div>
      </template>

      <input ref="fileInput" class="file" type="file" accept="image/*" tabindex="-1" aria-hidden="true" @change="onFile" />
    </section>

    <section v-if="photoStep === 'done'" class="diploma-box">
      <p v-if="composeError" class="error" role="alert">{{ composeError }}</p>
      <button v-if="composeError" class="secondary" @click="compose">Réessayer</button>
      <p v-else-if="!diplomaUrl" class="note">Préparation du diplôme…</p>
      <img v-else class="diploma" :class="{ busy: composing }" :src="diplomaUrl" alt="Mon diplôme de roboticien·ne" />
      <button class="primary download" :disabled="!diplomaUrl || composing" @click="download">📥 Télécharger mon diplôme</button>
    </section>
  </div>
</template>

<style scoped>
.humanoid { display: flex; flex-direction: column; align-items: stretch; gap: 14px; text-align: center; font-family: Geist, system-ui, sans-serif; }
h2 { margin: 4px 0 0; color: var(--ink, #0F172A); }
.lead { margin: 0; color: var(--text, #475569); line-height: 1.5; }
.field { display: flex; flex-direction: column; gap: 6px; align-items: center; }
.label { font-weight: 700; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink, #0F172A); }
input:not(.file) { width: 100%; max-width: 320px; padding: 12px; border: 1px solid var(--border, #CBD5E1); border-radius: 0; font: inherit; font-size: 1rem; color: var(--ink, #0F172A); text-align: center; }
input:not(.file):focus { outline: 2px solid var(--accent, #EA580C); outline-offset: 1px; }
.colors { display: flex; gap: 10px; }
.colors button { width: 40px; height: 40px; border-radius: 0; border: 3px solid #fff; outline: 1px solid var(--border, #CBD5E1); padding: 0; }
.colors button.on { outline: 3px solid var(--ink, #0F172A); }
.photo { position: relative; display: flex; flex-direction: column; gap: 8px; align-items: center; padding: 14px; border: 1px solid var(--border, #CBD5E1); background: #fff; }
.note { margin: 0; font-size: 0.85rem; color: var(--muted, #64748B); }
.error { margin: 0; font-size: 0.9rem; color: #B91C1C; font-weight: 600; }
.row { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; width: 100%; }
.primary, .secondary { flex: 1 1 140px; border-radius: 0; padding: 12px 20px; font: inherit; font-size: 0.95rem; font-weight: 700; }
.primary { border: none; background: var(--accent, #EA580C); color: #fff; }
.secondary { border: 1px solid var(--border, #CBD5E1); background: #fff; color: var(--text, #475569); font-weight: 600; }
.primary:disabled { opacity: 0.5; cursor: default; }
.viewfinder { width: 100%; max-width: 300px; aspect-ratio: 1; overflow: hidden; background: #0F172A; border: 3px solid var(--accent, #EA580C); }
video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); display: block; }
.file { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.diploma-box { display: flex; flex-direction: column; gap: 10px; align-items: center; }
.diploma { width: 100%; max-width: 400px; height: auto; border: 1px solid var(--border, #CBD5E1); transition: opacity 0.2s; }
.diploma.busy { opacity: 0.6; }
.download { width: 100%; max-width: 400px; flex: none; }
</style>
