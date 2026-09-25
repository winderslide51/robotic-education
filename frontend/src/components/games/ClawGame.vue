<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

// three est chargé à la demande, pour ne pas alourdir l'écran d'accueil
let THREE

const emit = defineEmits(['win'])

const wrap = ref(null)
const canvas = ref(null)
const message = ref('')
const hud = ref({ x: 0, y: 0, z: 0 })
const showWin = ref(false)
const failed = ref(false)
const loading = ref(true)
const continueBtn = ref(null)

// --- Modèle du jeu, en coordonnées normalisées ---
// x : gauche → droite (axe X), y : fond → avant (axe Y), z : 0 en haut → 1 en bas (axe Z)
const LIMITS = { xMin: 0.08, xMax: 0.92, yMin: 0.2, yMax: 0.8 }
const START = { x: 0.2, y: 0.5 }
const EXIT = { x: 0.1, y: 0.5 }
const MIN_GAP = { x: 0.25, y: 0.2 }
const TOLERANCE = { x: 0.06, y: 0.08 }
const SPEED = 0.35 // unités normalisées par seconde (X et Y)
const Z_SPEED = 1.2
const HOME_SPEED = 0.5

const claw = { x: START.x, y: START.y, z: 0, state: 'idle', holding: false }
const parcel = { x: 0.7, y: 0.3, caught: false, falling: false, gone: false, drop: 0, fromY: 0 }
const held = { left: false, right: false, up: false, down: false }
let emitted = false

// Tire la position du colis jusqu'à obtenir un écart franc sur X ET sur Y.
function placeParcel() {
  let x, y
  do {
    x = 0.35 + Math.random() * 0.53
    y = LIMITS.yMin + 0.02 + Math.random() * (LIMITS.yMax - LIMITS.yMin - 0.04)
  } while (Math.abs(x - START.x) < MIN_GAP.x || Math.abs(y - START.y) < MIN_GAP.y)
  parcel.x = x
  parcel.y = y
}
placeParcel()
const parcelStart = { x: parcel.x, y: parcel.y }

// --- Géométrie de la scène (unités three.js) ---
const CASE = { w: 4, d: 3, h: 3.4 }
const RAIL_Y = 3.05
const BOX = { w: 0.6, h: 0.45, d: 0.5 }
const HUB_TOP = 2.55
const HUB_BOTTOM = BOX.h + 0.1
const wx = (x) => (x - 0.5) * CASE.w
const wz = (y) => (y - 0.5) * CASE.d
const hubY = (z) => HUB_TOP - z * (HUB_TOP - HUB_BOTTOM)

const COLORS = { x: '#e74c3c', y: '#27ae60', z: '#2e86de' }

let renderer, scene, camera, raf = 0, last = 0, resizeObs, alive = true
const parts = {}

function drop() {
  if (claw.state !== 'idle' || showWin.value || failed.value || loading.value) return
  claw.state = 'down'
  message.value = ''
}

function missMessage(dx, dy) {
  const tips = []
  if (Math.abs(dx) >= TOLERANCE.x) tips.push(`axe X : va ${dx > 0 ? 'vers la droite ▶' : 'vers la gauche ◀'}`)
  if (Math.abs(dy) >= TOLERANCE.y) tips.push(`axe Y : va ${dy > 0 ? 'vers l’avant ▼' : 'vers le fond ▲'}`)
  return 'Raté ! Corrige l’' + tips.join(', et l’') + '.'
}

function update(dt) {
  if (claw.state === 'idle') {
    const s = SPEED * dt
    // Le conseil reste affiché jusqu'à ce que le joueur reprenne les commandes
    if (message.value && (held.left || held.right || held.up || held.down)) message.value = ''
    if (held.left) claw.x = Math.max(LIMITS.xMin, claw.x - s)
    if (held.right) claw.x = Math.min(LIMITS.xMax, claw.x + s)
    if (held.up) claw.y = Math.max(LIMITS.yMin, claw.y - s)
    if (held.down) claw.y = Math.min(LIMITS.yMax, claw.y + s)
  } else if (claw.state === 'down') {
    claw.z += Z_SPEED * dt
    if (claw.z >= 1) {
      claw.z = 1
      const dx = parcel.x - claw.x
      const dy = parcel.y - claw.y
      if (Math.abs(dx) < TOLERANCE.x && Math.abs(dy) < TOLERANCE.y) {
        claw.holding = true
        parcel.caught = true
        message.value = 'Attrapé ! La pince remonte (axe Z)…'
      } else {
        message.value = missMessage(dx, dy)
      }
      claw.state = 'up'
    }
  } else if (claw.state === 'up') {
    claw.z -= Z_SPEED * dt
    if (claw.z <= 0) {
      claw.z = 0
      claw.state = claw.holding ? 'home' : 'idle'
    }
  } else if (claw.state === 'home') {
    // Retour automatique vers la trappe de sortie, en ligne droite sur X puis Y
    const k = HOME_SPEED * dt
    claw.y += Math.sign(EXIT.y - claw.y) * Math.min(k, Math.abs(EXIT.y - claw.y))
    claw.x += Math.sign(EXIT.x - claw.x) * Math.min(k, Math.abs(EXIT.x - claw.x))
    if (Math.abs(claw.x - EXIT.x) < 1e-4 && Math.abs(claw.y - EXIT.y) < 1e-4) {
      claw.holding = false
      parcel.caught = false
      parcel.falling = true
      // La chute part de la hauteur où la pince lâche le colis
      parcel.fromY = heldY()
      claw.state = 'done'
      message.value = ''
    }
  }
  if (parcel.caught) {
    // Le colis suit la pince (petit recentrage pour qu'il pende bien sous elle)
    parcel.x += (claw.x - parcel.x) * Math.min(1, dt * 10)
    parcel.y += (claw.y - parcel.y) * Math.min(1, dt * 10)
  }
  if (parcel.falling && !parcel.gone) {
    parcel.drop += dt * 3.5
    if (parcel.fromY - parcel.drop < -0.6) {
      parcel.gone = true
      showWin.value = true
    }
  }
  const x = Math.round(claw.x * 100), y = Math.round(claw.y * 100), z = Math.round(claw.z * 100)
  const h = hud.value
  if (h.x !== x || h.y !== y || h.z !== z) hud.value = { x, y, z }
}

// --- Construction de la scène three.js ---
function labelTexture(text, color, w = 128, h = 128, font = 'bold 84px system-ui, sans-serif') {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  if (color) {
    g.fillStyle = color
    g.beginPath()
    if (w === h) g.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2)
    else if (g.roundRect) g.roundRect(2, 2, w - 4, h - 4, h / 2 - 2)
    else g.rect(2, 2, w - 4, h - 4) // Safari < 16
    g.fill()
  }
  g.fillStyle = '#fff'
  g.font = font
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(text, w / 2, h / 2 + 4)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function axisLabel(text, color, size = 0.42) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(text, color), depthTest: false }))
  sprite.scale.set(size, size, 1)
  sprite.renderOrder = 10
  return sprite
}

// Flèche à double pointe entre a et b, avec étiquette au bout b
function axisArrow(a, b, color, text) {
  const group = new THREE.Group()
  const mat = new THREE.MeshBasicMaterial({ color })
  const dir = new THREE.Vector3().subVectors(b, a)
  const len = dir.length()
  dir.normalize()
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, len - 0.3, 8), mat)
  shaft.position.copy(a).add(b).multiplyScalar(0.5)
  shaft.quaternion.copy(q)
  group.add(shaft)
  for (const [p, sign] of [[b, 1], [a, -1]]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 12), mat)
    cone.position.copy(p).addScaledVector(dir, -0.1 * sign)
    cone.quaternion.copy(q)
    if (sign < 0) cone.rotateX(Math.PI)
    group.add(cone)
  }
  const label = axisLabel(text, color)
  label.position.copy(b).addScaledVector(dir, 0.32)
  group.add(label)
  return group
}

function buildParcel() {
  const group = new THREE.Group()
  const carton = new THREE.MeshStandardMaterial({ color: '#c08a52', roughness: 0.9 })
  const box = new THREE.Mesh(new THREE.BoxGeometry(BOX.w, BOX.h, BOX.d), carton)
  group.add(box)
  const tape = new THREE.MeshStandardMaterial({ color: '#e2c48f', roughness: 0.5 })
  // Scotch : une bande sur le dessus qui redescend sur les deux faces avant et arrière
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, BOX.d + 0.01), tape)
  top.position.y = BOX.h / 2 + 0.003
  group.add(top)
  for (const s of [1, -1]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.01), tape)
    side.position.set(0, BOX.h / 2 - 0.08, s * (BOX.d / 2 + 0.003))
    group.add(side)
  }
  // Étiquette d'expédition sur la face avant
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 96
  const g = c.getContext('2d')
  g.fillStyle = '#fff'
  g.fillRect(0, 0, 128, 96)
  g.fillStyle = '#333'
  for (let i = 0; i < 5; i++) g.fillRect(10 + i * 7 + (i % 2) * 2, 10, i % 2 ? 3 : 5, 30)
  g.fillRect(58, 12, 60, 6)
  g.fillRect(58, 26, 44, 6)
  g.font = 'bold 30px system-ui, sans-serif'
  g.fillText('↑↑', 10, 82)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.165), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }))
  label.position.set(0.15, -0.06, BOX.d / 2 + 0.006)
  group.add(label)
  return group
}

function buildScene() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#eef1f6')

  camera = new THREE.PerspectiveCamera(36, 1.25, 0.1, 100)
  camera.position.set(3.4, 6.0, 8.0)
  camera.lookAt(0, 1.4, 0)

  scene.add(new THREE.HemisphereLight('#ffffff', '#8a8fa0', 1.6))
  const sun = new THREE.DirectionalLight('#ffffff', 1.6)
  sun.position.set(3, 8, 5)
  scene.add(sun)

  const { w, d, h } = CASE
  // Socle et sol
  const base = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.3, d + 0.4), new THREE.MeshStandardMaterial({ color: '#394060' }))
  base.position.y = -0.15
  scene.add(base)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: '#d5d9e2', roughness: 1 }))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = 0.001
  scene.add(floor)

  // Trappe de sortie, bordée de bandes jaunes et noires
  const hatch = new THREE.Group()
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ color: '#15171f' }))
  hole.rotation.x = -Math.PI / 2
  hatch.add(hole)
  const stripe = new THREE.MeshStandardMaterial({ color: '#f2b705' })
  for (const [x, z, sx, sz] of [[0, 0.45, 1, 0.1], [0, -0.45, 1, 0.1], [0.45, 0, 0.1, 0.8], [-0.45, 0, 0.1, 0.8]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.03, sz), stripe)
    b.position.set(x, 0.015, z)
    hatch.add(b)
  }
  const exitLabel = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture('SORTIE', '#394060', 256, 64, 'bold 44px system-ui, sans-serif') }))
  exitLabel.scale.set(0.9, 0.225, 1)
  exitLabel.position.set(0, 0.3, 0.7)
  hatch.add(exitLabel)
  hatch.position.set(wx(EXIT.x), 0.003, wz(EXIT.y))
  scene.add(hatch)

  // Caisse vitrée : montants + parois transparentes
  const frameMat = new THREE.MeshStandardMaterial({ color: '#8a8fa0', metalness: 0.4, roughness: 0.5 })
  for (const x of [-w / 2, w / 2]) {
    for (const z of [-d / 2, d / 2]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, h, 0.08), frameMat)
      post.position.set(x, h / 2, z)
      scene.add(post)
    }
  }
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color: '#bfe3ff', transparent: true, opacity: 0.12, side: THREE.BackSide, depthWrite: false }),
  )
  glass.position.y = h / 2
  scene.add(glass)
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), new THREE.LineBasicMaterial({ color: '#8a8fa0' }))
  edges.position.y = h / 2
  scene.add(edges)

  // Portique : deux rails fixes (axe Y) et un pont mobile (axe X)
  const railMat = new THREE.MeshStandardMaterial({ color: '#5b6178', metalness: 0.5, roughness: 0.4 })
  for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, d), railMat)
    rail.position.set(x, RAIL_Y, 0)
    scene.add(rail)
  }
  const bridge = new THREE.Group()
  const beam = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, 0.14, 0.18), new THREE.MeshStandardMaterial({ color: '#f2b705', metalness: 0.3, roughness: 0.5 }))
  beam.position.y = RAIL_Y + 0.12
  bridge.add(beam)
  bridge.add(axisArrow(new THREE.Vector3(-1.6, RAIL_Y + 0.45, 0), new THREE.Vector3(1.6, RAIL_Y + 0.45, 0), COLORS.x, 'X'))
  scene.add(bridge)

  // Axe Y : le long du rail droit ; axe Z : vertical, sur le montant avant gauche
  scene.add(axisArrow(new THREE.Vector3(w / 2 + 0.35, RAIL_Y, -d / 2 + 0.2), new THREE.Vector3(w / 2 + 0.35, RAIL_Y, d / 2 - 0.2), COLORS.y, 'Y'))
  scene.add(axisArrow(new THREE.Vector3(-w / 2 - 0.3, h - 0.5, d / 2), new THREE.Vector3(-w / 2 - 0.3, 0.3, d / 2), COLORS.z, 'Z'))

  // Chariot, câble et pince
  const carriage = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.32), new THREE.MeshStandardMaterial({ color: '#394060', metalness: 0.3 }))
  carriage.position.y = RAIL_Y - 0.03
  scene.add(carriage)
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 6), new THREE.MeshStandardMaterial({ color: '#26293b' }))
  scene.add(cable)
  const clawGroup = new THREE.Group()
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.12, 16), new THREE.MeshStandardMaterial({ color: '#5b6178', metalness: 0.6, roughness: 0.3 }))
  hub.position.y = 0.06
  clawGroup.add(hub)
  const fingerMat = new THREE.MeshStandardMaterial({ color: '#e8467c', metalness: 0.2, roughness: 0.4 })
  const fingers = []
  for (let i = 0; i < 4; i++) {
    const pivot = new THREE.Group()
    pivot.rotation.y = (i * Math.PI) / 2
    const hinge = new THREE.Group()
    hinge.position.x = 0.2
    const finger = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.07), fingerMat)
    finger.position.y = -0.21
    hinge.add(finger)
    pivot.add(hinge)
    clawGroup.add(pivot)
    fingers.push(hinge)
  }
  scene.add(clawGroup)

  // Cible au sol : montre où la pince va descendre
  const target = new THREE.Mesh(new THREE.RingGeometry(0.14, 0.2, 32), new THREE.MeshBasicMaterial({ color: '#e8467c', transparent: true, opacity: 0.8 }))
  target.rotation.x = -Math.PI / 2
  scene.add(target)

  const parcelMesh = buildParcel()
  scene.add(parcelMesh)
  const parcelShadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.18, depthWrite: false }))
  parcelShadow.rotation.x = -Math.PI / 2
  parcelShadow.scale.set(1, 0.8, 1)
  scene.add(parcelShadow)

  Object.assign(parts, { bridge, carriage, cable, clawGroup, fingers, target, parcelMesh, parcelShadow })
}

const heldY = () => hubY(claw.z) - 0.1 - BOX.h / 2

function sync(dt) {
  const x = wx(claw.x)
  const z = wz(claw.y)
  const y = hubY(claw.z)
  parts.bridge.position.z = z
  parts.carriage.position.set(x, RAIL_Y - 0.03, z)
  const top = RAIL_Y - 0.15
  parts.cable.position.set(x, (top + y + 0.12) / 2, z)
  parts.cable.scale.y = Math.max(0.01, top - y - 0.12)
  parts.clawGroup.position.set(x, y, z)
  const open = claw.state === 'down' ? 0.75 : claw.holding ? 0.18 : 0.4
  for (const f of parts.fingers) f.rotation.z += (open - f.rotation.z) * Math.min(1, dt * 15)
  parts.target.position.set(x, 0.01, z)
  parts.target.visible = claw.state === 'idle' || claw.state === 'down'

  let py = BOX.h / 2
  if (parcel.caught) py = heldY()
  else if (parcel.falling) py = parcel.fromY - parcel.drop
  parts.parcelMesh.position.set(wx(parcel.x), py, wz(parcel.y))
  parts.parcelMesh.visible = !parcel.gone
  parts.parcelShadow.position.set(wx(parcel.x), 0.006, wz(parcel.y))
  parts.parcelShadow.visible = !parcel.falling && !parcel.gone
}

function resize() {
  if (!renderer || !wrap.value) return
  const w = Math.min(wrap.value.clientWidth, 480)
  // Garder la scène ET les commandes visibles sans défiler, même sur un petit écran
  const h = Math.round(Math.max(190, Math.min(w * 0.8, window.innerHeight - 400)))
  renderer.setSize(w, h)
  camera.aspect = w / h
  // Élargit un peu le champ quand la scène est plus étroite, pour garder toute la caisse visible
  camera.fov = w / h < 1.25 ? 36 * (1.25 / (w / h)) ** 0.8 : 36
  camera.updateProjectionMatrix()
}

function loop(t) {
  const dt = Math.min(0.05, last ? (t - last) / 1000 : 0)
  last = t
  update(dt)
  sync(dt)
  renderer.render(scene, camera)
  raf = requestAnimationFrame(loop)
}

function press(dir, v) {
  held[dir] = v
}

const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }
function onKey(e) {
  if (showWin.value || failed.value || loading.value) return
  // Laisser les boutons (« Passer le jeu »…) et les champs réagir normalement au clavier,
  // sauf les commandes du jeu elles-mêmes (focalisées après un clic)
  const t = e.target
  if (t instanceof Element && !t.closest('.claw .pad') && t.closest('button, a[href], input, select, textarea, [contenteditable]:not([contenteditable="false"])')) return
  const down = e.type === 'keydown'
  if (KEYS[e.key]) {
    e.preventDefault()
    held[KEYS[e.key]] = down
  } else if (down && (e.key === ' ' || e.key === 'Enter') && !e.repeat) {
    e.preventDefault()
    drop()
  }
}
function releaseAll() {
  for (const k in held) held[k] = false
}

function fail() {
  failed.value = true
  releaseAll()
  cancelAnimationFrame(raf)
}

function onContextLost(e) {
  e.preventDefault()
  fail()
}

function continuer() {
  if (emitted) return
  emitted = true
  emit('win')
}

watch(showWin, async (v) => {
  if (!v) return
  await nextTick()
  continueBtn.value?.focus()
})

onMounted(async () => {
  window.addEventListener('keydown', onKey)
  window.addEventListener('keyup', onKey)
  window.addEventListener('blur', releaseAll)
  try {
    THREE = await import('three')
    if (!alive) return
    renderer = new THREE.WebGLRenderer({ canvas: canvas.value, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    buildScene()
  } catch (e) {
    console.warn('3D indisponible :', e)
    renderer?.dispose()
    renderer = null
    failed.value = true
    return
  } finally {
    loading.value = false
  }
  canvas.value.addEventListener('webglcontextlost', onContextLost)
  resize()
  window.addEventListener('resize', resize)
  resizeObs = new ResizeObserver(resize)
  resizeObs.observe(wrap.value)
  raf = requestAnimationFrame(loop)
})

onUnmounted(() => {
  alive = false
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('keyup', onKey)
  window.removeEventListener('blur', releaseAll)
  window.removeEventListener('resize', resize)
  resizeObs?.disconnect()
  canvas.value?.removeEventListener('webglcontextlost', onContextLost)
  scene?.traverse((o) => {
    o.geometry?.dispose()
    for (const m of [].concat(o.material || [])) {
      m.map?.dispose()
      m.dispose()
    }
  })
  renderer?.dispose()
  renderer = null
})
</script>

<template>
  <div class="claw" :data-parcel-x="parcelStart.x.toFixed(3)" :data-parcel-y="parcelStart.y.toFixed(3)" :data-claw-x="(hud.x / 100).toFixed(2)" :data-claw-y="(hud.y / 100).toFixed(2)">
    <p class="hint">Pilote la pince sur les axes <b class="ax x">X</b> et <b class="ax y">Y</b>, puis descends sur l’axe <b class="ax z">Z</b> avec <b>Attraper</b>. Dépose le colis dans la trappe de sortie.</p>
    <div ref="wrap" class="stage">
      <canvas ref="canvas" />
      <div v-if="loading" class="loading3d">Chargement de la 3D…</div>
      <div v-if="!failed && !loading" class="hud">
        <span class="x">X {{ hud.x }}</span><span class="y">Y {{ hud.y }}</span><span class="z">Z {{ hud.z }}</span>
      </div>
      <p v-if="message && !failed" class="msg" :class="{ ok: message.startsWith('Attrapé') }" role="status">{{ message }}</p>
      <div v-if="failed" class="fallback" role="alert">
        <p><b>La 3D ne s’affiche pas sur cet appareil.</b></p>
        <p>Appuie sur « Passer le jeu » juste en dessous pour continuer.</p>
      </div>
    </div>
    <div class="pad" :class="{ off: failed || loading }" @contextmenu.prevent>
      <div class="arrows">
        <button class="up" aria-label="Axe Y : vers le fond" @pointerdown="press('up', true)" @pointerup="press('up', false)" @pointerleave="press('up', false)" @pointercancel="press('up', false)">▲<small class="y">Y</small></button>
        <button class="left" aria-label="Axe X : vers la gauche" @pointerdown="press('left', true)" @pointerup="press('left', false)" @pointerleave="press('left', false)" @pointercancel="press('left', false)">◀<small class="x">X</small></button>
        <button class="right" aria-label="Axe X : vers la droite" @pointerdown="press('right', true)" @pointerup="press('right', false)" @pointerleave="press('right', false)" @pointercancel="press('right', false)">▶<small class="x">X</small></button>
        <button class="down" aria-label="Axe Y : vers l’avant" @pointerdown="press('down', true)" @pointerup="press('down', false)" @pointerleave="press('down', false)" @pointercancel="press('down', false)">▼<small class="y">Y</small></button>
      </div>
      <button class="grab" @click="drop">Attraper<small>axe Z</small></button>
    </div>

    <div v-if="showWin" class="win" role="dialog" aria-modal="true" aria-labelledby="claw-win-title claw-win-title-2">
      <div class="trophy">📦</div>
      <p id="claw-win-title" class="big">Tu as piloté 3 axes : <span class="x">X</span>, <span class="y">Y</span>, <span class="z">Z</span>.</p>
      <p id="claw-win-title-2" class="big">C'est un <strong>robot cartésien</strong> !</p>
      <button ref="continueBtn" class="continue" @click="continuer">Continuer</button>
    </div>
  </div>
</template>

<style scoped>
.claw { position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.hint { margin: 0; text-align: center; font-size: 0.9rem; line-height: 1.3; }
.ax { display: inline-block; min-width: 1.3em; border-radius: 6px; color: #fff; text-align: center; }
.ax.x { background: #e74c3c; }
.ax.y { background: #27ae60; }
.ax.z { background: #2e86de; }
.stage { position: relative; width: 100%; max-width: 480px; min-height: 190px; display: flex; justify-content: center; }
canvas { display: block; border-radius: 16px; touch-action: none; }
.hud { position: absolute; top: 6px; left: 8px; display: flex; gap: 4px; pointer-events: none; }
.hud span { font: 700 0.75rem/1 system-ui, sans-serif; color: #fff; padding: 4px 6px; border-radius: 6px; font-variant-numeric: tabular-nums; }
.hud .x, .arrows small.x { background: #e74c3c; }
.hud .y, .arrows small.y { background: #27ae60; }
.hud .z { background: #2e86de; }
.msg { position: absolute; left: 8px; right: 8px; bottom: 8px; margin: 0; padding: 6px 10px; border-radius: 10px; background: rgba(255, 255, 255, 0.92); font-weight: 700; font-size: 0.9rem; color: #c0392b; text-align: center; pointer-events: none; }
.msg.ok { color: #1e8449; }
.fallback, .loading3d { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 16px; background: #eef1f6; border-radius: 16px; }
.fallback p { margin: 4px 0; }
.pad { display: flex; align-items: center; gap: 24px; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
.pad.off { opacity: 0.35; pointer-events: none; }
.arrows { display: grid; grid-template-columns: repeat(3, 56px); grid-template-rows: repeat(3, 46px); gap: 4px; }
.arrows button { font-size: 1.2rem; border-radius: 12px; border: none; background: #394060; color: #fff; touch-action: none; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; line-height: 1; }
.arrows small { font-size: 0.6rem; font-weight: 700; padding: 1px 4px; border-radius: 4px; }
.up { grid-column: 2; grid-row: 1; }
.left { grid-column: 1; grid-row: 2; }
.right { grid-column: 3; grid-row: 2; }
.down { grid-column: 2; grid-row: 3; }
.grab { width: 96px; height: 96px; border-radius: 50%; border: none; background: #e8467c; color: #fff; font-weight: 700; font-size: 1rem; box-shadow: 0 6px 0 #a82d57; display: flex; flex-direction: column; align-items: center; justify-content: center; touch-action: manipulation; }
.grab:active { transform: translateY(4px); box-shadow: 0 2px 0 #a82d57; }
.grab small { font-weight: 700; font-size: 0.7rem; margin-top: 2px; padding: 1px 5px; border-radius: 4px; background: #2e86de; }
.win { position: absolute; inset: -4px; z-index: 5; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 12px; padding: 20px; text-align: center; background: #fffaf2; border-radius: 16px; animation: appear 0.35s ease-out; }
.win .trophy { font-size: 3.5rem; }
.win .big { margin: 0; font-size: 1.7rem; font-weight: 800; line-height: 1.25; }
.win .big strong { color: #e8467c; }
.win .x { color: #e74c3c; }
.win .y { color: #27ae60; }
.win .z { color: #2e86de; }
.continue { margin-top: 8px; border: none; border-radius: 14px; padding: 14px 40px; font-size: 1.15rem; font-weight: 700; background: #394060; color: #fff; box-shadow: 0 4px 0 #22263a; }
.continue:active { transform: translateY(3px); box-shadow: 0 1px 0 #22263a; }
@keyframes appear { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
</style>
