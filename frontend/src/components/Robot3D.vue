<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

// three est chargé à la demande, comme dans les jeux
let THREE

const props = defineProps({
  pieces: { type: Array, default: () => [] }, // pièces obtenues ({ slot: 'legs' | 'hand' | 'arm' })
  color: { type: String, default: '#EA580C' }, // couleur des coques du robot
  newSlot: { type: String, default: '' }, // pièce qui vient d'être gagnée : elle arrive en s'animant
})

const SLOTS = ['legs', 'arm', 'hand']
const wrap = ref(null)
const canvas = ref(null)
const loading = ref(true)
const failed = ref(false)
const fallbackUrl = ref('')

let renderer, scene, camera, root, raf = 0, last = 0, resizeObs, alive = true
let colorMats = []
const real = {}
const ghost = {}
const anims = [] // { slot, t }
const ARRIVE = 1.3 // durée de l'arrivée d'une pièce, en secondes
const DELAY = 0.35

// Promesse résolue quand le robot est affiché (en 3D ou en image fixe), pour le capturer au bon moment
let resolveReady
const ready = new Promise((r) => (resolveReady = r))

const slotsOf = (list) => new Set(list.map((p) => p?.slot).filter(Boolean))

// --- Construction du robot ---
function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.1, ...opts })
}

// Membre en forme de gélule, tendu entre deux points
function limb(a, b, r, material) {
  const dir = new THREE.Vector3().subVectors(b, a)
  const len = dir.length()
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.01, len - 2 * r), 6, 16), material)
  m.position.copy(a).add(b).multiplyScalar(0.5)
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
  return m
}

function cyl(rTop, rBottom, h, material, seg = 24) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, seg), material)
}

const V = (x, y, z) => new THREE.Vector3(x, y, z)

// Points clés du bras droit (celui qui reçoit le poignet et la ventouse)
const R = { shoulder: [0.78, 3.02, 0], elbow: [0.98, 2.4, 0.12], wrist: [1.0, 2.36, 0.72] }

function buildBody(shell, dark, accent) {
  const body = new THREE.Group()
  // Bassin et torse
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.46), dark)
  pelvis.position.y = 1.86
  body.add(pelvis)
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 0.55, 8, 24), shell)
  torso.scale.set(1.08, 1, 0.72)
  torso.position.y = 2.62
  body.add(torso)
  // Plastron coloré avec un voyant
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.42, 0.06), accent)
  chest.position.set(0, 2.78, 0.35)
  body.add(chest)
  const led = new THREE.Mesh(new THREE.CircleGeometry(0.08, 24), new THREE.MeshBasicMaterial({ color: '#7DD3FC' }))
  led.position.set(0, 2.78, 0.385)
  body.add(led)
  // Cou et tête
  const neck = cyl(0.12, 0.14, 0.22, dark)
  neck.position.y = 3.42
  body.add(neck)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 24), shell)
  head.scale.set(1, 0.86, 0.9)
  head.position.y = 3.86
  body.add(head)
  // Visière sombre et yeux lumineux
  const visor = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.5, 6, 16), mat('#0F172A', { roughness: 0.15, metalness: 0.3 }))
  visor.rotation.z = Math.PI / 2
  visor.scale.set(1, 1, 0.6)
  visor.position.set(0, 3.88, 0.36)
  body.add(visor)
  const eyeMat = new THREE.MeshBasicMaterial({ color: '#7DD3FC' })
  for (const x of [-0.16, 0.16]) {
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.06, 20), eyeMat)
    eye.scale.set(1.5, 0.7, 1)
    eye.position.set(x, 3.89, 0.465)
    body.add(eye)
  }
  // Oreilles colorées et antenne
  for (const s of [-1, 1]) {
    const ear = cyl(0.13, 0.13, 0.1, accent)
    ear.rotation.z = Math.PI / 2
    ear.position.set(s * 0.5, 3.86, 0)
    body.add(ear)
  }
  const antenna = cyl(0.02, 0.02, 0.3, dark, 8)
  antenna.position.y = 4.4
  body.add(antenna)
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), accent)
  tip.position.y = 4.57
  body.add(tip)
  // Épaules
  for (const s of [-1, 1]) {
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 16), accent)
    sh.position.set(s * 0.78, 3.02, 0)
    body.add(sh)
  }
  // Bras gauche, au repos
  body.add(limb(V(-0.8, 3.0, 0), V(-0.98, 2.38, 0.02), 0.12, shell))
  body.add(limb(V(-0.98, 2.38, 0.02), V(-1.02, 1.8, 0.14), 0.1, shell))
  const elbowL = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), dark)
  elbowL.position.set(-0.98, 2.38, 0.02)
  body.add(elbowL)
  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), dark)
  handL.position.set(-1.02, 1.72, 0.15)
  body.add(handL)
  // Bras droit, tendu vers l'avant
  body.add(limb(V(...R.shoulder), V(...R.elbow), 0.12, shell))
  body.add(limb(V(...R.elbow), V(...R.wrist), 0.1, shell))
  const elbowR = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), dark)
  elbowR.position.set(...R.elbow)
  body.add(elbowR)
  // Hanches
  for (const s of [-1, 1]) {
    const hip = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), dark)
    hip.position.set(s * 0.26, 1.72, 0)
    body.add(hip)
  }
  return body
}

// Jambes : deux axes linéaires (rail, chariot, moteur)
function buildLegs(m) {
  const g = new THREE.Group()
  for (const s of [-1, 1]) {
    const x = s * 0.26
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.5, 0.24), m.rail)
    rail.position.set(x, 0.92, 0)
    g.add(rail)
    const groove = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 0.02), m.dark)
    groove.position.set(x, 0.92, 0.125)
    g.add(groove)
    const carriage = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.3), m.yellow)
    carriage.position.set(x, s < 0 ? 1.1 : 0.72, 0.03)
    g.add(carriage)
    const motor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.24), m.dark)
    motor.position.set(x, 1.62, 0)
    g.add(motor)
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.5), m.dark)
    foot.position.set(x, 0.17, 0.06)
    g.add(foot)
  }
  return g
}

// Poignet 3 axes : trois articulations au bout du bras droit
function buildArm(m) {
  const g = new THREE.Group()
  const [x, y, z] = R.wrist
  const j4 = cyl(0.13, 0.13, 0.2, m.yellow)
  j4.rotation.x = Math.PI / 2
  j4.position.set(x, y, z + 0.06)
  g.add(j4)
  const j5 = cyl(0.12, 0.12, 0.3, m.dark)
  j5.rotation.z = Math.PI / 2
  j5.position.set(x, y, z + 0.24)
  g.add(j5)
  const j6 = cyl(0.1, 0.1, 0.16, m.yellow)
  j6.rotation.x = Math.PI / 2
  j6.position.set(x, y, z + 0.42)
  g.add(j6)
  const flange = cyl(0.12, 0.12, 0.04, m.rail)
  flange.rotation.x = Math.PI / 2
  flange.position.set(x, y, z + 0.52)
  g.add(flange)
  return g
}

// Ventouse : soufflet et lèvre en caoutchouc, au bout du poignet
function buildHand(m) {
  const g = new THREE.Group()
  const [x, y, z] = R.wrist
  const stem = cyl(0.04, 0.04, 0.16, m.rail, 12)
  stem.rotation.x = Math.PI / 2
  stem.position.set(x, y, z + 0.62)
  g.add(stem)
  for (let i = 0; i < 2; i++) {
    const fold = new THREE.Mesh(new THREE.TorusGeometry(0.07 + i * 0.02, 0.03, 10, 24), m.rubber)
    fold.position.set(x, y, z + 0.7 + i * 0.06)
    g.add(fold)
  }
  const cup = cyl(0.2, 0.09, 0.12, m.rubber)
  cup.rotation.x = Math.PI / 2
  cup.position.set(x, y, z + 0.86)
  g.add(cup)
  return g
}

function buildScene() {
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(30, 1 / 1.1, 0.1, 100)
  camera.position.set(0, 3.0, 10.5)
  camera.lookAt(0, 2.3, 0)

  scene.add(new THREE.HemisphereLight('#ffffff', '#94A3B8', 1.7))
  const key = new THREE.DirectionalLight('#ffffff', 1.8)
  key.position.set(3, 6, 5)
  scene.add(key)
  const rim = new THREE.DirectionalLight('#FDBA74', 0.8)
  rim.position.set(-4, 3, -4)
  scene.add(rim)

  root = new THREE.Group()
  root.rotation.y = -0.5
  scene.add(root)

  // Socle
  const base = cyl(1.3, 1.4, 0.14, mat('#F8FAFC', { roughness: 0.6 }), 48)
  base.position.y = 0.05
  scene.add(base)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.36, 0.025, 8, 64), new THREE.MeshBasicMaterial({ color: '#EA580C' }))
  ring.rotation.x = Math.PI / 2
  ring.position.y = 0.12
  scene.add(ring)

  const shell = mat('#F8FAFC', { roughness: 0.3 })
  const dark = mat('#334155', { roughness: 0.4, metalness: 0.4 })
  const accent = mat(props.color, { roughness: 0.35 })
  colorMats = [accent]
  root.add(buildBody(shell, dark, accent))

  const parts = {
    rail: mat('#CBD5E1', { metalness: 0.7, roughness: 0.3 }),
    yellow: mat('#FACC15', { roughness: 0.4 }),
    dark: mat('#1E293B', { roughness: 0.4, metalness: 0.4 }),
    rubber: mat('#1E293B', { roughness: 0.9 }),
  }
  const ghostMat = new THREE.MeshBasicMaterial({ color: '#94A3B8', transparent: true, opacity: 0.22, depthWrite: false })
  const ghostParts = { rail: ghostMat, yellow: ghostMat, dark: ghostMat, rubber: ghostMat }
  const builders = { legs: buildLegs, arm: buildArm, hand: buildHand }
  for (const slot of SLOTS) {
    real[slot] = builders[slot](parts)
    ghost[slot] = builders[slot](ghostParts)
    root.add(real[slot], ghost[slot])
  }
}

// --- Pièces : visibles, fantômes, ou en train d'arriver ---
function applyPieces(animateNew) {
  if (!root) return
  const have = slotsOf(props.pieces)
  for (const slot of SLOTS) {
    const on = have.has(slot)
    const arriving = anims.some((a) => a.slot === slot)
    real[slot].visible = on
    ghost[slot].visible = !on || arriving
    if (on && animateNew?.has(slot) && !arriving) {
      anims.push({ slot, t: -DELAY })
      ghost[slot].visible = true
      pose(slot, 0)
    }
  }
}

const easeOutBack = (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2

// k = 0 : la pièce flotte au-dessus du robot ; k = 1 : elle est en place
function pose(slot, k) {
  const g = real[slot]
  const e = easeOutBack(Math.min(1, Math.max(0, k)))
  g.position.y = (1 - e) * 2.2
  g.rotation.y = (1 - e) * Math.PI * 1.5
  const s = 0.4 + 0.6 * Math.min(1, e)
  g.scale.setScalar(s)
}

function updateAnims(dt) {
  for (let i = anims.length - 1; i >= 0; i--) {
    const a = anims[i]
    a.t += dt
    pose(a.slot, a.t / ARRIVE)
    if (a.t >= ARRIVE) {
      pose(a.slot, 1)
      ghost[a.slot].visible = false
      anims.splice(i, 1)
    }
  }
}

function finishAnims() {
  for (const a of anims) {
    pose(a.slot, 1)
    ghost[a.slot].visible = false
  }
  anims.length = 0
}

function resize() {
  if (!renderer || !wrap.value) return
  const w = Math.min(wrap.value.clientWidth || 300, 360)
  const h = Math.round(w * 1.1)
  renderer.setSize(w, h)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}

function loop(t) {
  const dt = Math.min(0.05, last ? (t - last) / 1000 : 0)
  last = t
  root.rotation.y += dt * 0.45
  updateAnims(dt)
  renderer.render(scene, camera)
  raf = requestAnimationFrame(loop)
}

// --- Repli : image fixe dessinée en 2D si WebGL échoue ---
function drawFallback() {
  const c = document.createElement('canvas')
  c.width = 600
  c.height = 660
  const g = c.getContext('2d')
  const have = slotsOf(props.pieces)
  const cx = 300
  const ghostCol = 'rgba(148, 163, 184, 0.3)'
  const rect = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h) }
  // Socle
  g.fillStyle = '#E2E8F0'
  g.beginPath(); g.ellipse(cx, 610, 180, 30, 0, 0, Math.PI * 2); g.fill()
  // Jambes : axes linéaires
  for (const s of [-1, 1]) {
    const x = cx + s * 55
    rect(x - 20, 380, 40, 220, have.has('legs') ? '#CBD5E1' : ghostCol)
    if (have.has('legs')) {
      rect(x - 28, s < 0 ? 440 : 500, 56, 50, '#FACC15')
      rect(x - 32, 590, 64, 16, '#1E293B')
    }
  }
  // Torse et tête
  rect(cx - 90, 230, 180, 150, '#F8FAFC')
  g.strokeStyle = '#CBD5E1'; g.lineWidth = 4; g.strokeRect(cx - 90, 230, 180, 150)
  rect(cx - 55, 255, 110, 70, props.color)
  rect(cx - 70, 90, 140, 115, '#F8FAFC'); g.strokeRect(cx - 70, 90, 140, 115)
  rect(cx - 55, 125, 110, 40, '#0F172A')
  rect(cx - 38, 138, 22, 12, '#7DD3FC'); rect(cx + 16, 138, 22, 12, '#7DD3FC')
  rect(cx - 82, 130, 12, 36, props.color); rect(cx + 70, 130, 12, 36, props.color)
  // Bras gauche
  rect(cx - 125, 240, 32, 140, '#F8FAFC'); g.strokeRect(cx - 125, 240, 32, 140)
  // Bras droit, tendu, avec poignet et ventouse
  rect(cx + 93, 240, 32, 90, '#F8FAFC'); g.strokeRect(cx + 93, 240, 32, 90)
  rect(cx + 93, 300, 90, 30, '#F8FAFC'); g.strokeRect(cx + 93, 300, 90, 30)
  const armCol = have.has('arm') ? '#FACC15' : ghostCol
  rect(cx + 185, 296, 22, 38, armCol); rect(cx + 209, 300, 22, 30, have.has('arm') ? '#1E293B' : ghostCol); rect(cx + 233, 298, 16, 34, armCol)
  g.fillStyle = have.has('hand') ? '#1E293B' : ghostCol
  g.beginPath(); g.moveTo(cx + 252, 305); g.lineTo(cx + 280, 285); g.lineTo(cx + 280, 345); g.lineTo(cx + 252, 325); g.fill()
  return c.toDataURL('image/png')
}

function fail() {
  failed.value = true
  cancelAnimationFrame(raf)
  fallbackUrl.value = drawFallback()
}

function onContextLost(e) {
  e.preventDefault()
  fail()
}

// Capture de l'image du robot (pour le diplôme), vue de trois quarts, toutes pièces en place.
// Rendu temporaire à taille fixe (net sur le diplôme), lu dans la même tâche que le rendu.
const CAPTURE = { w: 900, h: 1000 }
function toDataURL() {
  if (failed.value || !renderer) return fallbackUrl.value || drawFallback()
  finishAnims()
  const angle = root.rotation.y
  const ratio = renderer.getPixelRatio()
  root.rotation.y = 0.7
  renderer.setPixelRatio(1)
  renderer.setSize(CAPTURE.w, CAPTURE.h, false)
  camera.aspect = CAPTURE.w / CAPTURE.h
  camera.updateProjectionMatrix()
  renderer.render(scene, camera)
  const url = renderer.domElement.toDataURL('image/png')
  root.rotation.y = angle
  renderer.setPixelRatio(ratio)
  resize()
  renderer.render(scene, camera)
  return url
}

// Description accessible : les pièces réellement montées
const label = computed(() => {
  const names = props.pieces.map((p) => p?.name).filter(Boolean).map((n) => n.charAt(0).toLowerCase() + n.slice(1))
  return names.length ? `Ton robot : ${names.join(', ')}` : 'Ton robot, encore sans pièce'
})
defineExpose({ toDataURL, whenReady: () => ready })

watch(() => props.color, (c) => {
  for (const m of colorMats) m.color.set(c)
  if (failed.value) fallbackUrl.value = drawFallback()
})

watch(() => props.pieces.map((p) => p?.slot).join(), (now, before) => {
  const prev = new Set((before || '').split(',').filter(Boolean))
  applyPieces(new Set(now.split(',').filter((s) => s && !prev.has(s))))
  if (failed.value) fallbackUrl.value = drawFallback()
})

onMounted(async () => {
  try {
    THREE = await import('three')
    if (!alive) return
    renderer = new THREE.WebGLRenderer({ canvas: canvas.value, antialias: true, alpha: true })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    buildScene()
  } catch (e) {
    console.warn('3D indisponible :', e)
    renderer?.dispose()
    renderer = null
    loading.value = false
    fail()
    resolveReady()
    return
  }
  loading.value = false
  resolveReady()
  applyPieces(props.newSlot ? new Set([props.newSlot]) : null)
  canvas.value.addEventListener('webglcontextlost', onContextLost)
  resize()
  resizeObs = new ResizeObserver(resize)
  resizeObs.observe(wrap.value)
  raf = requestAnimationFrame(loop)
})

onUnmounted(() => {
  alive = false
  resolveReady()
  cancelAnimationFrame(raf)
  resizeObs?.disconnect()
  canvas.value?.removeEventListener('webglcontextlost', onContextLost)
  scene?.traverse((o) => {
    o.geometry?.dispose()
    for (const m of [].concat(o.material || [])) m.dispose()
  })
  renderer?.forceContextLoss()
  renderer?.dispose()
  renderer = null
})
</script>

<template>
  <div ref="wrap" class="robot3d" :data-slots="[...slotsOf(pieces)].join(',')" :data-state="failed ? 'fallback' : loading ? 'loading' : 'ready'">
    <canvas v-show="!failed" ref="canvas" role="img" :aria-label="label" />
    <img v-if="failed && fallbackUrl" :src="fallbackUrl" :alt="label" />
    <p v-if="loading" class="loading">Chargement du robot…</p>
  </div>
</template>

<style scoped>
.robot3d { position: relative; width: 100%; max-width: 360px; min-height: 200px; margin: 0 auto; display: flex; justify-content: center; }
canvas { display: block; }
img { width: 100%; height: auto; display: block; }
.loading { position: absolute; inset: 0; margin: 0; display: flex; align-items: center; justify-content: center; font: 400 0.9rem Geist, system-ui, sans-serif; color: var(--muted, #64748B); }
</style>
