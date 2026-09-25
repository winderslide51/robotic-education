<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { loadContent } from './api.js'
import { shuffle } from './shuffle.js'
import ClawGame from './components/games/ClawGame.vue'
import SortGame from './components/games/SortGame.vue'
import PourGame from './components/games/PourGame.vue'
import VideoStep from './components/VideoStep.vue'
import QuizStep from './components/QuizStep.vue'
import HumanoidStep from './components/HumanoidStep.vue'

const games = { claw: ClawGame, sort: SortGame, pour: PourGame }
const STEPS = ['question', 'game', 'video', 'piece', 'quiz']
const ROBOT_NAMES = { cartesien: 'Cartésien', scara: 'SCARA', '6axes': '6 axes' }

const content = ref(null)
const phase = ref('intro') // intro | bases | block | review | scenarios | end
const blockIndex = ref(0)
const stepIndex = ref(0)
const pieces = ref([])
const points = ref(0)
const missed = ref([])
const scenarioIndex = ref(0)
const scenarioPick = ref(null)
const scenarioOrder = ref([])
let previousOrder = null

const block = computed(() => content.value?.blocks[blockIndex.value])
const step = computed(() => STEPS[stepIndex.value])
const missionOrder = ref([])
const scenario = computed(() => content.value?.scenarios[missionOrder.value[scenarioIndex.value]])
const progress = computed(() => {
  if (phase.value === 'intro' || phase.value === 'bases') return 0
  if (phase.value !== 'block') return 100
  return Math.round(((blockIndex.value * STEPS.length + stepIndex.value) / (3 * STEPS.length)) * 100)
})

onMounted(async () => (content.value = await loadContent()))

function nextStep() {
  if (step.value === 'piece') pieces.value.push(block.value.piece)
  if (stepIndex.value + 1 < STEPS.length) stepIndex.value += 1
  else if (blockIndex.value + 1 < content.value.blocks.length) {
    blockIndex.value += 1
    stepIndex.value = 0
  } else phase.value = missed.value.length ? 'review' : 'scenarios'
  window.scrollTo(0, 0)
}

function quizDone(result) {
  points.value += result.points
  missed.value.push(...result.missed)
  nextStep()
}

function reviewDone(result) {
  points.value += result.points
  phase.value = 'scenarios'
}

// Mélange l'ordre des robots pour chaque mission, sans reprendre l'ordre de la mission précédente.
function shuffleRobots() {
  const ids = content.value.blocks.map((b) => b.id)
  let order
  do order = shuffle(ids)
  while (ids.length > 1 && previousOrder && order.join() === previousOrder.join())
  previousOrder = order
  scenarioOrder.value = order.map((id) => content.value.blocks.find((b) => b.id === id))
}

// Les missions arrivent aussi dans un ordre aléatoire, pour que leur réponse ne suive pas l'ordre des ateliers.
watch(phase, (p) => {
  if (p !== 'scenarios') return
  missionOrder.value = shuffle(content.value.scenarios.map((_, i) => i))
  shuffleRobots()
})

function pickScenario(id) {
  if (scenarioPick.value) return
  scenarioPick.value = id
  if (id === scenario.value.answer) points.value += 200
}

function nextScenario() {
  scenarioPick.value = null
  if (scenarioIndex.value + 1 < content.value.scenarios.length) {
    scenarioIndex.value += 1
    shuffleRobots()
  } else phase.value = 'end'
}
</script>

<template>
  <main>
    <div class="progress" role="progressbar" aria-label="Progression" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100">
      <div :style="{ width: progress + '%' }" />
    </div>
    <header>
      <span class="logo">🤖 Robolution</span>
      <span v-if="phase !== 'intro' && phase !== 'bases'" class="score">⭐ {{ points }} · 🧩 {{ pieces.length }}/3</span>
    </header>

    <p v-if="!content" class="center">Chargement…</p>

    <section v-else-if="phase === 'intro'" class="card intro">
      <div class="intro-art" aria-hidden="true" />
      <div class="intro-veil" aria-hidden="true" />
      <div class="intro-body">
        <h1>Bienvenue dans la halle technique</h1>
        <p>15 minutes, 3 robots, 3 ateliers.<br />Dans chaque atelier, gagne une vraie pièce de robot pour construire le tien !</p>
        <div class="ateliers">
          <span v-for="b in content.blocks" :key="b.id">{{ b.robot }}</span>
        </div>
      </div>
      <button class="btn-start" @click="phase = content.intro ? 'bases' : 'block'">Commencer <span class="arrow" aria-hidden="true">→</span></button>
    </section>

    <section v-else-if="phase === 'bases'" class="card">
      <p class="step-head"><span class="badge-step">Avant de commencer</span></p>
      <div class="naive">🤔 <b>{{ content.intro.title }}</b></div>
      <p class="teaser">{{ content.intro.text }}</p>
      <div class="families">
        <div v-for="f in content.intro.families" :key="f.id" class="family">
          <b>{{ f.name }}</b>
          <span>{{ f.text }}</span>
        </div>
      </div>
      <button @click="phase = 'block'">Aller à l'atelier 1</button>
    </section>

    <section v-else-if="phase === 'block'" class="card" :key="block.id + step">
      <p class="step-head"><span class="badge-step">Atelier {{ blockIndex + 1 }} / 3</span>{{ block.robot }}</p>

      <template v-if="step === 'question'">
        <div class="naive">🤔 <b>« {{ block.question }} »</b></div>
        <p class="teaser">Teste le robot : tu comprendras en le pilotant.</p>
        <button @click="nextStep">Tester</button>
      </template>

      <template v-else-if="step === 'game'">
        <component :is="games[block.game]" @win="nextStep" />
        <button class="skip btn-secondary" @click="nextStep">Passer le jeu</button>
      </template>

      <template v-else-if="step === 'video'">
        <div class="naive small">💡 {{ block.answer }}</div>
        <VideoStep :video="block.video" />
        <button @click="nextStep">Continuer</button>
      </template>

      <template v-else-if="step === 'piece'">
        <div class="piece">
          <div class="icon">{{ block.piece.icon }}</div>
          <h2>Pièce gagnée : {{ block.piece.name }}</h2>
          <p>{{ block.piece.desc }}</p>
        </div>
        <button @click="nextStep">Ajouter à mon robot</button>
      </template>

      <template v-else-if="step === 'quiz'">
        <QuizStep :questions="block.quiz" @done="quizDone" />
      </template>
    </section>

    <section v-else-if="phase === 'review'" class="card">
      <p class="step-head"><span class="badge-step">Révision éclair</span>Les questions ratées reviennent !</p>
      <QuizStep :questions="missed" @done="reviewDone" />
    </section>

    <section v-else-if="phase === 'scenarios'" class="card" :key="scenarioIndex">
      <p class="step-head"><span class="badge-step">Mission {{ scenarioIndex + 1 }} / {{ content.scenarios.length }}</span>Quel robot choisir ?</p>
      <div class="naive">🏭 {{ scenario.need }}</div>
      <div class="robots">
        <button
          v-for="b in scenarioOrder"
          :key="b.id"
          class="answer"
          :class="{
            selected: scenarioPick && b.id === scenario.answer,
            bad: scenarioPick === b.id && b.id !== scenario.answer,
            dim: scenarioPick && b.id !== scenario.answer && b.id !== scenarioPick,
          }"
          :disabled="!!scenarioPick"
          @click="pickScenario(b.id)"
        >
          {{ ROBOT_NAMES[b.id] }}
          <span v-if="scenarioPick && b.id === scenario.answer" class="mark">✓<span class="sr"> bonne réponse</span></span>
          <span v-else-if="scenarioPick === b.id" class="mark">✗<span class="sr"> ton choix</span></span>
        </button>
      </div>
      <div class="live" role="status" aria-live="polite">
        <div v-if="scenarioPick" class="explain">
          <p><b>{{ scenarioPick === scenario.answer ? 'Bon choix !' : 'Pas le meilleur choix.' }}</b> {{ scenario.explain }}</p>
        </div>
      </div>
      <div v-if="scenarioPick" class="feedback">
        <button @click="nextScenario">Continuer</button>
      </div>
    </section>

    <section v-else class="card">
      <HumanoidStep :pieces="pieces" :points="points" />
    </section>
  </main>
</template>
