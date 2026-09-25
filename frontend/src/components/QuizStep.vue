<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({ questions: Array, seconds: { type: Number, default: 15 } })
const emit = defineEmits(['done'])

const index = ref(0)
const picked = ref(null)
const left = ref(props.seconds)
const points = ref(0)
const missed = []
let timer = 0

const current = computed(() => props.questions[index.value])

function tick() {
  if (picked.value !== null) return
  left.value -= 1
  if (left.value <= 0) choose(-1)
}

function choose(i) {
  if (picked.value !== null) return
  picked.value = i
  if (i === current.value.answer) points.value += 100 + left.value * 10
  else missed.push(current.value)
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
      <span class="timer" :class="{ hurry: left <= 5 }">⏱ {{ left }} s</span>
      <span>⭐ {{ points }}</span>
    </div>
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
    <div v-if="picked !== null" class="feedback">
      <p><b>{{ picked === current.answer ? 'Bien joué !' : picked === -1 ? 'Temps écoulé !' : 'Pas tout à fait…' }}</b> {{ current.explain }}</p>
      <button class="next" @click="next">Continuer</button>
    </div>
  </div>
</template>

<style scoped>
.top { display: flex; justify-content: space-between; font-weight: 600; font-size: 0.9rem; }
.timer.hurry { color: #c0392b; }
h2 { font-size: 1.2rem; text-align: center; }
.choices { display: grid; gap: 8px; }
.choices button { min-height: 52px; border: none; border-radius: 12px; color: #fff; font-size: 1rem; font-weight: 600; padding: 8px; }
.c0 { background: #e21b3c; } .c1 { background: #1368ce; } .c2 { background: #d89e00; } .c3 { background: #26890c; }
.choices button:disabled { opacity: 0.45; }
.choices button.good { opacity: 1; outline: 4px solid #1e8449; }
.choices button.bad { opacity: 1; outline: 4px solid #333; }
.feedback { margin-top: 12px; background: #fff; border-radius: 12px; padding: 12px; }
.next { width: 100%; }
</style>
