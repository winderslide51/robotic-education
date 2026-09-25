<script setup>
import { ref, computed } from 'vue'

const props = defineProps({ video: Object })
const playing = ref(false)
const id = ref(props.video.youtubeId)

// Façade : le lecteur YouTube (et ses cookies) ne se charge qu'au clic.
const src = computed(
  () => `https://www.youtube-nocookie.com/embed/${id.value}?start=${props.video.start}&end=${props.video.end}&autoplay=1&rel=0&playsinline=1`
)
const thumb = computed(() => `https://i.ytimg.com/vi/${id.value}/hqdefault.jpg`)

function onThumbError() {
  if (props.video.fallbackId && id.value !== props.video.fallbackId) id.value = props.video.fallbackId
}
</script>

<template>
  <div class="video">
    <h2>Dans la vraie vie</h2>
    <p class="title">{{ video.title }}</p>
    <div class="frame">
      <iframe v-if="playing" :src="src" title="Vidéo" allow="autoplay; encrypted-media" allowfullscreen />
      <button v-else class="facade" @click="playing = true">
        <img :src="thumb" alt="" @error="onThumbError" />
        <span class="play">▶</span>
      </button>
    </div>
    <p class="badge">✅ Source : {{ video.source }}</p>
  </div>
</template>

<style scoped>
.video { text-align: center; }
.title { margin: 0 0 8px; font-weight: 600; }
.frame { position: relative; width: 100%; aspect-ratio: 16 / 9; border-radius: 12px; overflow: hidden; background: #000; }
iframe, .facade { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; padding: 0; cursor: pointer; background: #000; }
.facade img { width: 100%; height: 100%; object-fit: cover; opacity: 0.85; }
.play { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 68px; height: 68px; border-radius: 50%; background: #e8467c; color: #fff; font-size: 1.8rem; display: flex; align-items: center; justify-content: center; }
.badge { font-size: 0.85rem; background: #eafaf1; color: #1e8449; border-radius: 999px; padding: 6px 12px; display: inline-block; }
</style>
