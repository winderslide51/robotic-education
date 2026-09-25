<script setup>
import { ref, computed, onMounted } from 'vue'
import { loadContent } from './api.js'
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
const phase = ref('intro') // intro | block | review | scenarios | end
const blockIndex = ref(0)
const stepIndex = ref(0)
const pieces = ref([])
const points = ref(0)
const missed = ref([])
const scenarioIndex = ref(0)
const scenarioPick = ref(null)

const block = computed(() => content.value?.blocks[blockIndex.value])
const step = computed(() => STEPS[stepIndex.value])
const scenario = computed(() => content.value?.scenarios[scenarioIndex.value])
const progress = computed(() => {
  if (phase.value === 'intro') return 0
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

function pickScenario(id) {
  if (scenarioPick.value) return
  scenarioPick.value = id
  if (id === scenario.value.answer) points.value += 200
}

function nextScenario() {
  scenarioPick.value = null
  if (scenarioIndex.value + 1 < content.value.scenarios.length) scenarioIndex.value += 1
  else phase.value = 'end'
}
</script>

<template>
  <main>
    <header>
      <span class="logo">🤖 RoboFête</span>
      <span v-if="phase !== 'intro'" class="score">⭐ {{ points }} · 🧩 {{ pieces.length }}/3</span>
    </header>
    <div class="bar"><div :style="{ width: progress + '%' }" /></div>

    <p v-if="!content" class="center">Chargement…</p>

    <section v-else-if="phase === 'intro'" class="card center">
      <h1>La fête foraine des robots</h1>
      <p>15 minutes, 3 robots, 3 jeux.<br />À chaque étape, gagne une vraie pièce de robot pour construire le tien !</p>
      <div class="stands">
        <span v-for="b in content.blocks" :key="b.id" :style="{ background: b.color }">{{ b.robot }}</span>
      </div>
      <button @click="phase = 'block'">C'est parti !</button>
    </section>

    <section v-else-if="phase === 'block'" class="card" :key="block.id + step">
      <p class="stand" :style="{ color: block.color }">Stand {{ blockIndex + 1 }} / 3 · {{ block.robot }}</p>

      <template v-if="step === 'question'">
        <div class="naive">🤔 <b>« {{ block.question }} »</b></div>
        <p class="teaser">Réponds en jouant : tu comprendras en pilotant le robot.</p>
        <button @click="nextStep">Jouer</button>
      </template>

      <template v-else-if="step === 'game'">
        <component :is="games[block.game]" @win="nextStep" />
        <button class="skip" @click="nextStep">Passer le jeu</button>
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
      <p class="stand">Révision éclair : les questions ratées reviennent !</p>
      <QuizStep :questions="missed" @done="reviewDone" />
    </section>

    <section v-else-if="phase === 'scenarios'" class="card" :key="scenarioIndex">
      <p class="stand">Mission {{ scenarioIndex + 1 }} / {{ content.scenarios.length }} · Quel robot choisir ?</p>
      <div class="naive">🏭 {{ scenario.need }}</div>
      <div class="robots">
        <button
          v-for="b in content.blocks"
          :key="b.id"
          :style="{ background: b.color }"
          :class="{ good: scenarioPick && b.id === scenario.answer, dim: scenarioPick && b.id !== scenario.answer }"
          @click="pickScenario(b.id)"
        >{{ ROBOT_NAMES[b.id] }}</button>
      </div>
      <div v-if="scenarioPick" class="feedback">
        <p><b>{{ scenarioPick === scenario.answer ? 'Bon choix !' : 'Pas le meilleur choix.' }}</b> {{ scenario.explain }}</p>
        <button @click="nextScenario">Continuer</button>
      </div>
    </section>

    <section v-else class="card">
      <HumanoidStep :pieces="pieces" :points="points" />
    </section>
  </main>
</template>
