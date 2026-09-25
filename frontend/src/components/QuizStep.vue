<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { shuffle } from '../shuffle.js'

const props = defineProps({ questions: Array, seconds: { type: Number, default: 20 } })
const emit = defineEmits(['done'])

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
    <div class="top">
      <span>Question {{ index + 1 }} / {{ questions.length }}</span>
      <span>⭐ {{ points }}</span>
    </div>
    <div class="timer" :class="{ hurry: left <= 5, over: picked !== null }">⏱ {{ left }} s</div>
    <h2>{{ current.q }}</h2>
    <div class="choices">
      <button
        v-for="(c, i) in current.choices"
        :key="i"
        :class="['c' + (i % 4), { good: picked !== null && i === current.answer, bad: picked === i && i !== current.answer }]"
        :disabled="picked !== null"
        @click="choose(i)"
      >{{ c }}</button>
    </div>
    <div v-if="picked !== null && picked !== current.answer" class="banner" role="status" aria-live="polite">
      <b>{{ picked === -1 ? 'Temps écoulé !' : 'Pas tout à fait…' }}</b>
      <span>{{ picked === -1 ? 'La bonne réponse était' : 'La bonne réponse' }} : <span class="answer">{{ current.choices[current.answer] }}</span></span>
    </div>
    <div v-if="picked !== null" class="feedback">
      <p><b v-if="picked === current.answer">Bien joué ! </b>{{ current.explain }}</p>
      <button class="next" @click="next">Continuer</button>
    </div>
  </div>
</template>

<style scoped>
.top { display: flex; justify-content: space-between; font-weight: 600; font-size: 0.9rem; }
.timer { text-align: center; font-size: 2.4rem; font-weight: 800; line-height: 1; margin-top: 4px; font-variant-numeric: tabular-nums; }
.timer.hurry { color: #c0392b; }
.timer.over { opacity: 0.4; }
.banner { margin-top: 12px; background: #394060; color: #fff; border-radius: 12px; padding: 12px; font-size: 1.1rem; font-weight: 600; text-align: center; display: flex; flex-direction: column; gap: 4px; }
.banner .answer { display: inline-block; background: #1e8449; border-radius: 999px; padding: 2px 12px; font-weight: 800; }
h2 { font-size: 1.2rem; text-align: center; }
.choices { display: grid; gap: 8px; }
.choices button { min-height: 52px; border: none; border-radius: 12px; color: #fff; font-size: 1rem; font-weight: 600; padding: 8px; }
.c0 { background: #e21b3c; } .c1 { background: #1368ce; } .c2 { background: #d89e00; } .c3 { background: #26890c; }
.choices button:disabled { opacity: 0.3; }
.choices button.good { opacity: 1; background: #1e8449; outline: 4px solid #145a32; }
.choices button.good::before { content: '✔ '; }
.choices button.bad { opacity: 0.6; outline: 3px solid #333; }
.feedback { margin-top: 12px; background: #fff; border-radius: 12px; padding: 12px; }
.next { width: 100%; }
</style>
