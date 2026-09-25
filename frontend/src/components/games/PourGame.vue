<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'

// three est chargé à la demande, pour ne pas alourdir l'écran d'accueil
let THREE

const emit = defineEmits(['win'])

// --- Les 6 axes, en langage simple (valeurs des curseurs en degrés) ---
const AXES = [
  { n: 1, name: 'la base qui tourne', short: 'Base qui tourne', min: -180, max: 180 },
  { n: 2, name: 'l’épaule', short: 'Épaule', min: -30, max: 50 },
  { n: 3, name: 'le coude', short: 'Coude', min: -60, max: 60 },
  { n: 4, name: 'l’avant-bras qui tourne', short: 'Avant-bras qui tourne', min: -120, max: 120 },
  { n: 5, name: 'le poignet qui s’incline', short: 'Poignet qui s’incline', min: -30, max: 130 },
  { n: 6, name: 'la main qui tourne', short: 'Main qui tourne', min: -120, max: 120 },
]
const START_POSE = [0, 0, 0, 0, 0, 0]
// Pose de référence qui verse au centre du verre : sert seulement à placer le verre dans la scène
const SOLUTION = [140, 20, 0, 0, 35, 0]

const FAILS = {
  overflow: 'Ça déborde !',
  toomuch: 'Un peu trop ! Vise le trait vert.',
  empty: 'La carafe est vide !',
}

const q = reactive([...START_POSE])
const active = ref(0) // axe sélectionné (1..6), 0 = aucun
const status = ref('play') // play | overflow | toomuch | empty | win
const levelPct = ref(0)
const over = ref(false)
const message = ref('')
const loading = ref(true)
const failed = ref(false)
const continueBtn = ref(null)
const retryBtn = ref(null)
const wrap = ref(null)
const canvas = ref(null)

const activeAxis = computed(() => AXES[active.value - 1])
const playing = computed(() => status.value === 'play' && !failed.value && !loading.value)

// --- Règles du jeu ---
const CAP = 1.6 // la carafe contient 1,6 verre
const TARGET_MIN = 0.8
const TARGET_MAX = 0.95
const MAX_RATE = 0.3 // verre par seconde, carafe très inclinée
const UPRIGHT = 35 // en dessous de cette inclinaison (degrés), la carafe est « redressée »
const SPLASH_TILT = 120
const GRAVITY = 9.8
const MAX_DROPS = 1500

// --- Géométrie (unités three.js ; la table est à y = 0) ---
const SHOULDER_H = 0.45
const UPPER = 1.3
const FORE_REAR = 0.5
const FORE_FRONT = 0.6
const TOOL = 0.25
const CARAFE_X = 0.24
const RIM_Y = 0.2
const RIM_R = 0.11
const GLASS_R = 0.28
const GLASS_H = 0.55
const HIT_R = GLASS_R - 0.02 // rayon unique : repère, message et comptage
const MIN_POUR_H = GLASS_H + 0.05 // en dessous, la carafe est trop basse pour verser
const GLASS = { x: 0, z: 0 }

let level = 0 // remplissage du verre, 1 = plein
let carafe = 1 // contenu de la carafe, 1 = pleine
let drops = []
let pourMsgUntil = 0
let lastMove = 0
let holding = 0
let emitted = false

let renderer, scene, camera, raf = 0, last = 0, resizeObs, alive = true
const parts = {}
const joints = []
let V // vecteurs de travail, créés une fois three chargé

const rad = (d) => (d * Math.PI) / 180
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

// --- Commandes ---
// Axes déjà bougés au moins une fois : il faut les avoir tous essayés pour gagner
const tried = reactive([false, false, false, false, false, false])
const untried = computed(() => AXES.find((a) => !tried[a.n - 1]))

function moved(n) {
  tried[n - 1] = true
  touch(n)
}
function touch(n) {
  active.value = n
  lastMove = performance.now()
}
function hold(n) {
  holding = n
  touch(n)
}
function release() {
  holding = 0
}

function reset() {
  q.splice(0, 6, ...START_POSE)
  level = 0
  carafe = 1
  drops = []
  pourMsgUntil = 0
  levelPct.value = 0
  message.value = ''
  active.value = 0
  status.value = 'play'
}

function continuer() {
  if (emitted) return
  emitted = true
  emit('win')
}

// --- Construction de la scène three.js ---
function badgeTexture(text, color) {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 128
  const g = c.getContext('2d')
  g.fillStyle = color
  g.beginPath()
  g.arc(64, 64, 58, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = '#fff'
  g.lineWidth = 8
  g.stroke()
  g.fillStyle = '#fff'
  g.font = 'bold 76px system-ui, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(text, 64, 70)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function dropTexture() {
  const c = document.createElement('canvas')
  c.width = 32
  c.height = 32
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(16, 16, 2, 16, 16, 15)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 32, 32)
  return new THREE.CanvasTexture(c)
}

// Flèche courbe autour de l'axe de rotation d'une articulation (visible quand on la bouge)
function rotArrow(axis, radius) {
  const group = new THREE.Group()
  const mat = new THREE.MeshBasicMaterial({ color: '#f5a800', transparent: true, opacity: 0.95, depthTest: false })
  const arc = Math.PI * 1.5
  const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.022, 6, 40, arc), mat)
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.15, 12), mat)
  cone.position.set(radius * Math.cos(arc), radius * Math.sin(arc), 0)
  cone.rotation.z = arc
  for (const m of [torus, cone]) {
    m.renderOrder = 9
    group.add(m)
  }
  if (axis === 'y') group.rotation.x = Math.PI / 2
  if (axis === 'x') group.rotation.y = Math.PI / 2
  group.visible = false
  return group
}

// Carter d'une articulation : cylindre orienté le long de son axe de rotation, avec son propre matériau pour s'allumer
function housing(axis, r, len) {
  const mat = new THREE.MeshStandardMaterial({ color: '#394060', metalness: 0.3, roughness: 0.5, emissive: '#f5a800', emissiveIntensity: 0 })
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 28), mat)
  if (axis === 'z') mesh.rotation.x = Math.PI / 2
  if (axis === 'x') mesh.rotation.z = Math.PI / 2
  return mesh
}

function addJoint(n, axis, group, mesh, arrowRadius, badgePos) {
  group.add(mesh)
  const arrow = rotArrow(axis, arrowRadius)
  arrow.position.copy(mesh.position)
  group.add(arrow)
  const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTexture(String(n), '#394060'), depthTest: false }))
  badge.scale.set(0.2, 0.2, 1)
  badge.renderOrder = 10
  badge.position.copy(badgePos)
  group.add(badge)
  joints[n - 1] = { group, mesh, arrow, glow: 0 }
}

function buildCarafe() {
  const group = new THREE.Group()
  const glassMat = new THREE.MeshStandardMaterial({ color: '#dff0ff', transparent: true, opacity: 0.35, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false })
  const profile = [[0, -0.35], [0.13, -0.35], [0.16, -0.3], [0.165, -0.05], [0.15, 0.08], [0.115, 0.16], [RIM_R, RIM_Y]]
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 32), glassMat)
  body.renderOrder = 2
  group.add(body)
  const edgeMat = new THREE.MeshStandardMaterial({ color: '#6c8fb0', roughness: 0.3 })
  const rim = new THREE.Mesh(new THREE.TorusGeometry(RIM_R, 0.012, 6, 32), edgeMat)
  rim.rotation.x = Math.PI / 2
  rim.position.y = RIM_Y
  group.add(rim)
  // Bec, du côté vers lequel le poignet (axe 5) incline la carafe
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 12, 1, true), edgeMat)
  beak.position.set(0.13, 0.2, 0)
  beak.rotation.z = -Math.PI / 2 + 0.45
  group.add(beak)
  const spout = new THREE.Object3D()
  spout.position.set(0.18, 0.22, 0)
  group.add(spout)
  // Eau de la carafe : sa surface reste horizontale grâce à un plan de coupe en coordonnées monde
  const waterProfile = [[0, -0.335], [0.12, -0.335], [0.148, -0.29], [0.153, -0.05], [0.138, 0.08], [0.104, 0.16], [0, 0.16]]
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)
  const water = new THREE.Mesh(
    new THREE.LatheGeometry(waterProfile.map(([r, y]) => new THREE.Vector2(r, y)), 28),
    new THREE.MeshStandardMaterial({ color: '#3fa4ff', transparent: true, opacity: 0.7, side: THREE.DoubleSide, clippingPlanes: [clip], depthWrite: false }),
  )
  water.renderOrder = 1
  group.add(water)
  Object.assign(parts, { carafe: group, spout, carafeWater: water, carafeClip: clip })
  return group
}

function buildRobot() {
  const orange = new THREE.MeshStandardMaterial({ color: '#f28c28', metalness: 0.2, roughness: 0.45 })
  const grey = new THREE.MeshStandardMaterial({ color: '#8a8fa0', metalness: 0.5, roughness: 0.4 })

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.3, 32), new THREE.MeshStandardMaterial({ color: '#26293b', roughness: 0.6 }))
  pedestal.position.y = 0.15
  scene.add(pedestal)

  // Axe 1 : la base tourne autour de la verticale
  const a1 = new THREE.Group()
  a1.position.y = 0.3
  scene.add(a1)
  const h1 = housing('y', 0.44, 0.14)
  h1.position.y = 0.07
  addJoint(1, 'y', a1, h1, 0.62, new THREE.Vector3(0, 0.12, 0.62))
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, SHOULDER_H - 0.14, 24), orange)
  turret.position.y = 0.14 + (SHOULDER_H - 0.14) / 2
  a1.add(turret)

  // Axe 2 : l'épaule
  const a2 = new THREE.Group()
  a2.position.y = SHOULDER_H
  a1.add(a2)
  addJoint(2, 'z', a2, housing('z', 0.21, 0.5), 0.36, new THREE.Vector3(0, 0, 0.42))
  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.26, UPPER, 0.3), orange)
  upper.position.y = UPPER / 2
  a2.add(upper)

  // Axe 3 : le coude
  const a3 = new THREE.Group()
  a3.position.y = UPPER
  a2.add(a3)
  addJoint(3, 'z', a3, housing('z', 0.19, 0.44), 0.32, new THREE.Vector3(0, 0, 0.38))
  const foreRear = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, FORE_REAR, 20), orange)
  foreRear.rotation.z = Math.PI / 2
  foreRear.position.x = FORE_REAR / 2
  a3.add(foreRear)

  // Axe 4 : l'avant-bras tourne sur lui-même
  const a4 = new THREE.Group()
  a4.position.x = FORE_REAR
  a3.add(a4)
  const h4 = housing('x', 0.16, 0.12)
  h4.position.x = 0.06
  addJoint(4, 'x', a4, h4, 0.28, new THREE.Vector3(0.06, 0.3, 0))
  const foreFront = new THREE.Mesh(new THREE.BoxGeometry(FORE_FRONT - 0.12, 0.2, 0.24), orange)
  foreFront.position.x = 0.12 + (FORE_FRONT - 0.12) / 2 - 0.06
  a4.add(foreFront)
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.06), grey) // repère visible quand l'avant-bras tourne
  fin.position.set(0.3, 0.13, 0)
  a4.add(fin)

  // Axe 5 : le poignet s'incline
  const a5 = new THREE.Group()
  a5.position.x = FORE_FRONT
  a4.add(a5)
  addJoint(5, 'z', a5, housing('z', 0.12, 0.3), 0.24, new THREE.Vector3(0, 0, 0.3))
  const link = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, TOOL, 16), grey)
  link.rotation.z = Math.PI / 2
  link.position.x = TOOL / 2
  a5.add(link)

  // Axe 6 : la main tourne, et tient la carafe
  const a6 = new THREE.Group()
  a6.position.x = TOOL
  a5.add(a6)
  const h6 = housing('x', 0.11, 0.06)
  h6.position.x = 0.03
  addJoint(6, 'x', a6, h6, 0.2, new THREE.Vector3(0.02, 0.3, 0))
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.44), grey)
  bar.position.x = 0.08
  a6.add(bar)
  for (const s of [1, -1]) {
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.04), grey)
    jaw.position.set(0.19, 0, s * 0.2)
    a6.add(jaw)
  }
  const carafeGroup = buildCarafe()
  carafeGroup.position.x = CARAFE_X
  a6.add(carafeGroup)
}

function buildScene() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#eef1f6')

  camera = new THREE.PerspectiveCamera(38, 1.4, 0.1, 100)
  camera.position.set(2.2, 3.5, 6.0)
  camera.lookAt(0.2, 0.85, 0.5)

  scene.add(new THREE.HemisphereLight('#ffffff', '#8a8fa0', 1.6))
  const sun = new THREE.DirectionalLight('#ffffff', 1.5)
  sun.position.set(3, 8, 5)
  scene.add(sun)

  // Table
  const table = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 5), new THREE.MeshStandardMaterial({ color: '#d9b99b', roughness: 0.9 }))
  table.position.set(0.2, -0.1, 0.4)
  scene.add(table)

  buildRobot()

  // Le verre est posé là où la pose de référence verse
  SOLUTION.forEach((v, i) => (q[i] = v))
  applyPose()
  const aim = pourGeometry()
  const hit = predictImpact(aim.point, aim.dir, aim.tilt)
  GLASS.x = hit.x
  GLASS.z = hit.z
  q.splice(0, 6, ...START_POSE)
  applyPose()

  const glass = new THREE.Group()
  glass.position.set(GLASS.x, 0, GLASS.z)
  scene.add(glass)
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(GLASS_R, GLASS_R * 0.9, GLASS_H, 32, 1, true),
    new THREE.MeshStandardMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.3, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false }),
  )
  wall.position.y = GLASS_H / 2
  wall.renderOrder = 3
  glass.add(wall)
  const rimMat = new THREE.MeshStandardMaterial({ color: '#8fb3d6', roughness: 0.3 })
  const rim = new THREE.Mesh(new THREE.TorusGeometry(GLASS_R, 0.012, 6, 40), rimMat)
  rim.rotation.x = Math.PI / 2
  rim.position.y = GLASS_H
  glass.add(rim)
  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(GLASS_R * 0.9, GLASS_R * 0.9, 0.03, 32), new THREE.MeshStandardMaterial({ color: '#eef4fa', transparent: true, opacity: 0.6, roughness: 0.2 }))
  bottom.position.y = 0.015
  glass.add(bottom)
  // Zone cible (80 à 95 %) : bande verte
  const bandH = (TARGET_MAX - TARGET_MIN) * GLASS_H
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(GLASS_R + 0.01, GLASS_R + 0.01, bandH, 32, 1, true),
    new THREE.MeshBasicMaterial({ color: '#27ae60', transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
  )
  band.position.y = ((TARGET_MIN + TARGET_MAX) / 2) * GLASS_H
  band.renderOrder = 4
  glass.add(band)
  const lineMat = new THREE.MeshBasicMaterial({ color: '#1e8449' })
  for (const f of [TARGET_MIN, TARGET_MAX]) {
    const line = new THREE.Mesh(new THREE.TorusGeometry(GLASS_R + 0.012, 0.008, 4, 40), lineMat)
    line.rotation.x = Math.PI / 2
    line.position.y = f * GLASS_H
    glass.add(line)
  }
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(GLASS_R - 0.02, GLASS_R * 0.9 - 0.02, 1, 32),
    new THREE.MeshStandardMaterial({ color: '#3fa4ff', transparent: true, opacity: 0.75, depthWrite: false }),
  )
  water.renderOrder = 2
  glass.add(water)
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.6, 32), new THREE.MeshBasicMaterial({ color: '#3fa4ff', transparent: true, opacity: 0.6 }))
  puddle.rotation.x = -Math.PI / 2
  puddle.position.y = 0.004
  glass.add(puddle)

  // Repère : où tomberait l'eau (rose à côté du verre, vert au-dessus)
  const markerMat = new THREE.MeshBasicMaterial({ color: '#e8467c', transparent: true, opacity: 0.85, depthWrite: false })
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.085, 28), markerMat)
  marker.rotation.x = -Math.PI / 2
  scene.add(marker)
  const guide = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    new THREE.LineDashedMaterial({ color: '#e8467c', dashSize: 0.06, gapSize: 0.05, transparent: true, opacity: 0.8 }),
  )
  scene.add(guide)

  // Gouttes d'eau
  const dropGeo = new THREE.BufferGeometry()
  dropGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_DROPS * 3), 3))
  dropGeo.setDrawRange(0, 0)
  const dropPoints = new THREE.Points(
    dropGeo,
    new THREE.PointsMaterial({ color: '#2d8fe0', size: 0.07, map: dropTexture(), transparent: true, depthWrite: false }),
  )
  dropPoints.frustumCulled = false
  scene.add(dropPoints)

  Object.assign(parts, { water, puddle, marker, markerMat, guide, dropPoints })
}

function applyPose() {
  joints[0].group.rotation.y = -rad(q[0])
  joints[1].group.rotation.z = -rad(q[1])
  joints[2].group.rotation.z = -rad(q[2])
  joints[3].group.rotation.x = rad(q[3])
  joints[4].group.rotation.z = -rad(q[4])
  joints[5].group.rotation.x = rad(q[5])
  scene.updateMatrixWorld(true)
}

// Orientation réelle de la carafe : inclinaison (angle entre son axe et la verticale),
// point d'où l'eau s'échappe (le bec, ou le point le plus bas du bord) et direction du jet.
function pourGeometry() {
  const { up, down, proj, spoutDir, quat } = V
  parts.carafe.getWorldQuaternion(quat)
  up.set(0, 1, 0).applyQuaternion(quat)
  const t = (Math.acos(clamp(up.y, -1, 1)) * 180) / Math.PI
  spoutDir.set(1, 0, 0).applyQuaternion(quat)
  proj.copy(down).addScaledVector(up, -down.dot(up))
  const { point, dir } = V
  if (proj.length() < 0.05 || proj.normalize().dot(spoutDir) > 0.7) {
    parts.spout.getWorldPosition(point)
    dir.copy(spoutDir)
  } else {
    parts.carafe.localToWorld(point.set(0, RIM_Y, 0)).addScaledVector(proj, RIM_R)
    dir.copy(proj)
  }
  dir.y = 0
  if (dir.lengthSq() > 1e-6) dir.normalize()
  return { tilt: t, up, point, dir }
}

const pourStartDeg = () => 35 + (1 - carafe) * 30 // plus la carafe se vide, plus il faut l'incliner
const pourFrac = (t) => clamp((t - pourStartDeg()) / 45, 0, 1)
const jetSpeed = (frac) => 0.15 + 0.2 * frac

// Où le jet franchit la hauteur du bord du verre : vitesse de départ horizontale + gravité
function predictImpact(point, dir, t) {
  const h = Math.max(0, point.y - GLASS_H)
  const time = Math.sqrt((2 * h) / GRAVITY)
  const s = jetSpeed(pourFrac(t)) * time
  return V.impact.set(point.x + dir.x * s, GLASS_H, point.z + dir.z * s)
}

const inGlassXZ = (x, z) => Math.hypot(x - GLASS.x, z - GLASS.z) < HIT_R

function update(dt, now) {
  applyPose()
  const { tilt: t, point, dir } = pourGeometry()
  const tooLow = point.y < MIN_POUR_H
  const impact = predictImpact(point, dir, t)
  const aboveGlass = !tooLow && inGlassXZ(impact.x, impact.z)
  const inTarget = level >= TARGET_MIN && level <= TARGET_MAX
  let msg = ''

  if (status.value === 'play') {
    const frac = pourFrac(t)
    const n = Math.min(Math.max(1, Math.round(frac * 8)), MAX_DROPS - drops.length)
    // Carafe trop basse (sous le bord du verre, ou sous la table) : elle ne verse pas
    const out = tooLow || n <= 0 ? 0 : Math.min(MAX_RATE * frac * dt, carafe * CAP)
    if (tooLow && frac > 0) msg = 'Remonte la carafe'
    if (out > 0) {
      carafe = Math.max(0, carafe - out / CAP)
      if (carafe < 1e-4) carafe = 0
      const splash = t > SPLASH_TILT
      const spread = splash ? 0.9 : 0.06
      const speed = jetSpeed(frac)
      for (let i = 0; i < n; i++) {
        drops.push({
          x: point.x + (Math.random() - 0.5) * 0.02,
          y: point.y,
          z: point.z + (Math.random() - 0.5) * 0.02,
          vx: dir.x * speed + (Math.random() - 0.5) * spread,
          vy: splash ? Math.random() * 0.8 : 0,
          vz: dir.z * speed + (Math.random() - 0.5) * spread,
          vol: out / n,
          checked: false,
          inGlass: false,
        })
      }
      if (!aboveGlass) pourMsgUntil = now + 1500
      if (splash) msg = 'Trop vite, ça éclabousse !'
      else if (inTarget) msg = 'C’est bon ! Redresse la carafe (axe 5).'
    } else if (inTarget && t >= UPRIGHT) {
      msg = 'C’est bon ! Redresse la carafe (axe 5).'
    }
    if (now < pourMsgUntil) msg = 'Place d’abord la carafe au-dessus du verre'
  }
  updateDrops(dt)

  if (status.value === 'play') {
    const settled = drops.length === 0
    if (level > 1) status.value = 'overflow'
    else if (settled && carafe <= 0 && level < TARGET_MIN) status.value = 'empty'
    else if (settled && t < UPRIGHT && level > TARGET_MAX) status.value = 'toomuch'
    else if (settled && t < UPRIGHT && level >= TARGET_MIN) {
      if (!untried.value) status.value = 'win'
      else msg = `Essaie aussi l’axe ${untried.value.n} : ${untried.value.name}`
    }
  }
  if (status.value !== 'play') msg = ''
  if (message.value !== msg) message.value = msg
  const pct = Math.round(level * 100)
  if (levelPct.value !== pct) levelPct.value = pct
  if (over.value !== aboveGlass) over.value = aboveGlass
  return { point, impact, aboveGlass }
}

function updateDrops(dt) {
  const surface = Math.min(level, 1) * GLASS_H * 0.96 + 0.03
  let k = 0
  for (const d of drops) {
    const prevY = d.y
    d.vy -= GRAVITY * dt
    d.x += d.vx * dt
    d.y += d.vy * dt
    d.z += d.vz * dt
    // Seules les gouttes qui franchissent le bord du verre en descendant peuvent y entrer
    if (!d.checked && prevY > GLASS_H && d.y <= GLASS_H) {
      d.checked = true
      d.inGlass = inGlassXZ(d.x, d.z)
    }
    if (d.inGlass && d.y <= surface) level += d.vol
    else if (d.y > 0.01) drops[k++] = d // sinon tombée à côté, sur la table
  }
  drops.length = k
}

function sync(dt, now, point, impact, aboveGlass) {
  // Articulation active : elle s'allume (fort pendant qu'on la bouge), avec sa flèche de rotation
  const moving = holding || now - lastMove < 700
  joints.forEach((j, i) => {
    const on = i + 1 === active.value
    const target = on ? (moving ? 1 : 0.45) : 0
    j.glow += (target - j.glow) * Math.min(1, dt * 10)
    j.mesh.material.emissiveIntensity = j.glow * 1.6
    j.mesh.scale.setScalar(1 + 0.12 * j.glow)
    j.arrow.visible = on && status.value === 'play'
  })

  // Eau du verre
  const lv = Math.min(level, 1)
  parts.water.visible = lv > 0.002
  parts.water.scale.y = Math.max(0.001, lv * GLASS_H * 0.96)
  parts.water.position.y = 0.03 + (lv * GLASS_H * 0.96) / 2
  parts.puddle.visible = status.value === 'overflow'

  // Eau de la carafe : surface horizontale, hauteur selon le contenu
  const { a, b } = V
  parts.carafe.localToWorld(a.set(0, -0.335, 0))
  parts.carafe.localToWorld(b.set(0, 0.16, 0))
  const s = Math.sqrt(Math.max(0, 1 - V.up.y * V.up.y)) * 0.15
  const low = Math.min(a.y, b.y) - s
  const high = Math.max(a.y, b.y) + s
  parts.carafeClip.constant = low + (high - low) * carafe * 0.9
  parts.carafeWater.visible = carafe > 0.002

  // Repère de visée
  const showMarker = status.value === 'play'
  parts.marker.visible = parts.guide.visible = showMarker
  if (showMarker) {
    parts.marker.position.set(impact.x, 0.006, impact.z)
    const color = aboveGlass ? '#27ae60' : '#e8467c'
    parts.markerMat.color.set(color)
    parts.guide.material.color.set(color)
    const pos = parts.guide.geometry.attributes.position
    pos.setXYZ(0, point.x, point.y, point.z)
    pos.setXYZ(1, impact.x, 0.006, impact.z)
    pos.needsUpdate = true
    parts.guide.computeLineDistances()
  }

  // Gouttes
  const arr = parts.dropPoints.geometry.attributes.position
  const n = Math.min(drops.length, MAX_DROPS)
  for (let i = 0; i < n; i++) arr.setXYZ(i, drops[i].x, drops[i].y, drops[i].z)
  arr.needsUpdate = true
  parts.dropPoints.geometry.setDrawRange(0, n)
}

function resize() {
  if (!renderer || !wrap.value) return
  const w = Math.min(wrap.value.clientWidth, 480)
  // Garder la scène ET les 6 curseurs visibles sans défiler, même sur un petit écran
  const h = Math.round(Math.max(170, Math.min(w * 0.75, window.innerHeight - 440)))
  renderer.setSize(w, h)
  camera.aspect = w / h
  // Élargit un peu le champ quand la scène est plus étroite, pour garder le robot et le verre visibles
  camera.fov = w / h < 1.4 ? 38 * (1.4 / (w / h)) ** 0.8 : 38
  camera.updateProjectionMatrix()
}

function loop(t) {
  const dt = Math.min(0.05, last ? (t - last) / 1000 : 0)
  last = t
  const now = performance.now()
  const { point, impact, aboveGlass } = update(dt, now)
  sync(dt, now, point, impact, aboveGlass)
  renderer.render(scene, camera)
  raf = requestAnimationFrame(loop)
}

function fail() {
  failed.value = true
  holding = 0
  cancelAnimationFrame(raf)
}

function onContextLost(e) {
  e.preventDefault()
  fail()
}

watch(status, async (v) => {
  if (v === 'play') return
  holding = 0
  await nextTick()
  ;(v === 'win' ? continueBtn : retryBtn).value?.focus()
})

onMounted(async () => {
  window.addEventListener('pointerup', release)
  window.addEventListener('blur', release)
  try {
    THREE = await import('three')
    if (!alive) return
    V = {
      up: new THREE.Vector3(),
      down: new THREE.Vector3(0, -1, 0),
      proj: new THREE.Vector3(),
      spoutDir: new THREE.Vector3(),
      quat: new THREE.Quaternion(),
      a: new THREE.Vector3(),
      b: new THREE.Vector3(),
      point: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      impact: new THREE.Vector3(),
    }
    renderer = new THREE.WebGLRenderer({ canvas: canvas.value, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.localClippingEnabled = true
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
  window.removeEventListener('pointerup', release)
  window.removeEventListener('blur', release)
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
  <div class="pour" :data-level="levelPct" :data-over="over ? 1 : 0" :data-status="status" :data-active="active">
    <p class="hint">Place la carafe au-dessus du verre (axes <b>1</b>, <b>2</b>, <b>3</b>), puis incline-la (axe <b>5</b>) jusqu’au trait vert.</p>
    <div ref="wrap" class="stage">
      <canvas ref="canvas" />
      <div v-if="loading" class="loading3d">Chargement de la 3D…</div>
      <template v-if="!failed && !loading">
        <p class="axis-name" :class="{ on: activeAxis }" aria-live="polite">
          {{ activeAxis ? `Axe ${activeAxis.n} : ${activeAxis.name}` : 'Bouge un curseur' }}
        </p>
        <span class="glass-level">Verre : {{ levelPct }} %</span>
      </template>
      <p v-if="message && !failed" class="msg" :class="{ ok: /^(C’est bon|Essaie)/.test(message) }" role="status">{{ message }}</p>
      <div v-if="FAILS[status] && !failed" class="overlay" role="alert">
        <div class="bubble">{{ FAILS[status] }}</div>
        <button ref="retryBtn" class="retry" type="button" @click="reset">Recommencer</button>
      </div>
      <div v-if="failed" class="fallback" role="alert">
        <p><b>La 3D ne s’affiche pas sur cet appareil.</b></p>
        <p>Appuie sur « Passer le jeu » juste en dessous pour continuer.</p>
      </div>
    </div>
    <div class="axes" :class="{ off: failed || loading }">
      <label v-for="a in AXES" :key="a.n" class="axis" :class="{ on: active === a.n }">
        <span class="name"><b>{{ a.n }}<i v-if="tried[a.n - 1]" class="tried" title="Déjà essayé">✓</i></b>{{ a.short }}</span>
        <input
          v-model.number="q[a.n - 1]"
          type="range"
          :min="a.min"
          :max="a.max"
          step="1"
          :data-axis="a.n"
          :aria-label="`Axe ${a.n} : ${a.name}`"
          :disabled="!playing"
          @input="moved(a.n)"
          @focus="touch(a.n)"
          @pointerdown="hold(a.n)"
          @pointercancel="release"
        />
      </label>
    </div>

    <div v-if="status === 'win'" class="win" role="dialog" aria-modal="true" aria-labelledby="pour-win-title pour-win-title-2">
      <div class="trophy" aria-hidden="true">🏆</div>
      <p id="pour-win-title" class="big">Tu as piloté 6 axes !</p>
      <p id="pour-win-title-2" class="lesson">Le <strong>poignet</strong> (axes 4-5-6) permet d’orienter l’outil</p>
      <button ref="continueBtn" class="continue" type="button" @click="continuer">Continuer</button>
    </div>
  </div>
</template>

<style scoped>
.pour { position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.hint { margin: 0; text-align: center; font-size: 0.85rem; line-height: 1.3; }
.hint b { display: inline-block; min-width: 1.3em; background: var(--ink); color: var(--white); text-align: center; }
.stage { position: relative; width: 100%; max-width: 480px; min-height: 170px; display: flex; justify-content: center; }
canvas { display: block; border-radius: 16px; touch-action: none; }
.axis-name { position: absolute; top: 6px; left: 8px; margin: 0; padding: 4px 8px; font-size: 0.8rem; font-weight: 700; background: rgba(255, 255, 255, 0.85); color: #5b5f73; pointer-events: none; }
.axis-name.on { background: #fff4c2; color: #26293b; }
.glass-level { position: absolute; top: 6px; right: 8px; padding: 4px 8px; font-size: 0.8rem; font-weight: 700; background: #2d8fe0; color: #fff; font-variant-numeric: tabular-nums; pointer-events: none; }
.msg { position: absolute; left: 8px; right: 8px; bottom: 8px; margin: 0; padding: 6px 10px; background: rgba(255, 255, 255, 0.92); font-weight: 700; font-size: 0.9rem; color: #c0392b; text-align: center; pointer-events: none; }
.msg.ok { color: #1e8449; }
.overlay { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 14px; padding: 12px; background: rgba(231, 76, 60, 0.2); animation: appear 0.3s ease-out; }
.bubble { background: #fff; padding: 12px 22px; font-size: 1.5rem; font-weight: 800; color: #d64531; text-align: center; }
.retry { font-size: 1.1875rem; font-weight: 700; padding: 12px 28px; min-height: 48px; border: none; background: var(--accent); color: var(--white); }
.retry:hover { background: var(--accent-strong); }
.fallback, .loading3d { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 16px; background: #eef1f6; }
.fallback p { margin: 4px 0; }
.axes { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
.axes.off { opacity: 0.35; pointer-events: none; }
.axis { display: flex; flex-direction: column; gap: 0; padding: 2px 6px; min-width: 0; }
.axis.on { background: var(--accent-50); box-shadow: inset 0 0 0 1px var(--accent-200); }
.name { display: flex; align-items: center; gap: 7px; padding: 4px 0 0; font-size: 0.72rem; font-weight: 700; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.name b { flex: none; display: inline-flex; justify-content: center; align-items: center; width: 1.35em; height: 1.35em; border-radius: 50%; background: var(--ink); color: var(--white); font-size: 0.7rem; }
.axis.on .name b { background: var(--accent-strong); }
.name b { position: relative; }
.tried { position: absolute; top: -4px; right: -7px; display: inline-flex; justify-content: center; align-items: center; width: 1.15em; height: 1.15em; border-radius: 50%; background: #27ae60; color: #fff; font-size: 0.6rem; font-style: normal; box-shadow: 0 0 0 1.5px #fffaf2; }
input[type='range'] { -webkit-appearance: none; appearance: none; width: 100%; height: 30px; margin: 0; background: transparent; touch-action: none; }
input[type='range']:disabled { opacity: 0.5; }
input[type='range']::-webkit-slider-runnable-track { height: 8px; background: var(--rail); }
input[type='range']::-moz-range-track { height: 8px; background: var(--rail); }
input[type='range']::-moz-range-progress { height: 8px; background: var(--accent); }
input[type='range']::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 28px; height: 28px; margin-top: -10px; border-radius: 50%; background: var(--accent); border: 3px solid var(--white); box-shadow: 0 0 0 1px var(--accent-strong); }
input[type='range']::-moz-range-thumb { width: 22px; height: 22px; border-radius: 50%; background: var(--accent); border: 3px solid var(--white); box-shadow: 0 0 0 1px var(--accent-strong); }
.axis.on input[type='range']::-webkit-slider-thumb { background: var(--accent-strong); }
.axis.on input[type='range']::-moz-range-thumb { background: var(--accent-strong); }
.win { position: absolute; inset: -4px; z-index: 5; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 12px; padding: 20px; text-align: center; background: #fffaf2; animation: appear 0.35s ease-out; }
.win .trophy { font-size: 3.5rem; }
.win .big { margin: 0; font-size: 1.8rem; font-weight: 800; line-height: 1.25; }
.win .lesson { margin: 0; font-size: 1.25rem; font-weight: 700; line-height: 1.35; }
.win .lesson strong { color: #f28c28; }
.continue { margin-top: 8px; border: none; padding: 12px 40px; min-height: 48px; font-size: 1.1875rem; font-weight: 700; background: var(--accent); color: var(--white); }
.continue:hover { background: var(--accent-strong); }
@keyframes appear { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
</style>
