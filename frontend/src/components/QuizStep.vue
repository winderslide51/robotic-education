<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { shuffle } from '../shuffle.js'

const props = defineProps({ questions: Array, seconds: { type: Number, default: 20 } })
const emit = defineEmits(['done'])
const LETTERS = 'ABCDEFGH'

const index = ref(0)
const picked = ref(null)
const left = ref(props.seconds)
const points = ref(0)
const missed = []
let timer = 0

// Les propositions sont mélangées pour que la bonne réponse ne soit pas toujours à la même place,
// sauf si ce sont des nombres : on les laisse dans l'ordre croissant prévu par le contenu.
function shuffled(q) {
  if (q.choices.every((c) => /^\s*\d+([.,]\d+)?\s*$/.test(String(c)))) return q
  const order = shuffle(q.choices.map((_, i) => i))
  return { ...q, choices: order.map((i) => q.choices[i]), answer: order.indexOf(q.answer) }
}
const shuffledQuestions = props.questions.map(shuffled)
const current = computed(() => shuffledQuestions[index.value])

function tick() {
  if (picked.value !== null) return
  left.value -= 1
  if (left.value <= 0) choose(-1)
}

function choose(i) {
  if (picked.value !== null) return
  picked.value = i
  if (i === current.value.answer) points.value += 100 + left.value * 10
  else missed.push(props.questions[index.value])
}

function next() {
  if (index.value + 1 < props.questions.length) {
    index.value += 1
    picked.value = null
    left.value = props.seconds
  } else {
    emit('done', { points: points.value, missed })
  }
}

onMounted(() => (timer = setInterval(tick, 1000)))
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="quiz">
    <div class="top meta">
      <span>Question {{ index + 1 }} sur {{ questions.length }}</span>
      <span>Score actuel : ⭐ {{ points }}</span>
    </div>
    <div class="timer" :class="{ hurry: left <= 5, over: picked !== null }">⏱ {{ left }} s</div>
    <h2>{{ current.q }}</h2>
    <div class="choices">
      <button
        v-for="(c, i) in current.choices"
        :key="i"
        class="answer"
        :class="{ selected: picked !== null && i === current.answer, bad: picked === i && i !== current.answer }"
        :disabled="picked !== null"
        @click="choose(i)"
      >
        <span class="letter">{{ LETTERS[i] }}</span>
        <span class="text">{{ c }}</span>
        <span v-if="picked !== null && i === current.answer" class="mark">✓<span class="sr"> bonne réponse</span></span>
        <span v-else-if="picked === i" class="mark">✗<span class="sr"> ta réponse</span></span>
      </button>
    </div>
    <div class="live" role="status" aria-live="polite">
      <div v-if="picked !== null" class="explain">
        <div class="explain-head">
          <span class="letter outline">{{ LETTERS[current.answer] }}</span>
          <b>{{ picked === current.answer ? 'Bien joué !' : picked === -1 ? 'Temps écoulé !' : 'Pas tout à fait…' }}</b>
        </div>
        <p v-if="picked !== current.answer" class="banner">
          {{ picked === -1 ? 'La bonne réponse était' : 'La bonne réponse' }} : <b class="answer-text">{{ current.choices[current.answer] }}</b>
        </p>
        <p>{{ current.explain }}</p>
      </div>
    </div>
    <div v-if="picked !== null" class="feedback">
      <button class="next" @click="next">Continuer</button>
    </div>
  </div>
</template>

<style scoped>
.quiz { display: flex; flex-direction: column; gap: 20px; }
.top { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.timer { text-align: center; font-size: 2.25rem; font-weight: 700; line-height: 1; color: var(--ink); font-variant-numeric: tabular-nums; }
.timer.hurry { color: var(--danger); }
.timer.over { color: var(--muted); }
h2 { font-size: 1.375rem; line-height: 1.4; }
.choices { display: flex; flex-direction: column; gap: 12px; }
.text { flex: 1; }
.answer-text { color: var(--ink); }
.explain-head b { color: var(--ink); }
.next { width: 100%; }
</style>
