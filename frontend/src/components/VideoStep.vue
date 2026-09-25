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
    <p class="kicker">Vidéo industrielle</p>
    <h2>Dans la vraie vie : {{ video.title }}</h2>
    <p class="source">✅ Source : {{ video.source }}</p>
    <div class="frame">
      <iframe v-if="playing" :src="src" :title="video.title" allow="autoplay; encrypted-media" allowfullscreen />
      <button v-else class="facade" :aria-label="`Lire la vidéo : ${video.title}`" @click="playing = true">
        <img :src="thumb" alt="" @error="onThumbError" />
        <span class="play" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="28" height="28"><path d="M8 5v14l11-7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /></svg>
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.video { display: flex; flex-direction: column; gap: 8px; padding: 20px; background: var(--white); border: 1px solid var(--border-light); }
.kicker { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase; color: var(--accent-strong); }
h2 { font-size: 1.375rem; line-height: 1.35; }
.source { font-size: 0.875rem; color: var(--muted); }
.frame { position: relative; width: 100%; aspect-ratio: 16 / 9; margin-top: 12px; overflow: hidden; background: var(--black); }
iframe, .facade { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; padding: 0; cursor: pointer; background: var(--black); }
.facade img { width: 100%; height: 100%; object-fit: cover; opacity: 0.85; }
.play { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 72px; height: 72px; border-radius: 50%; background: var(--accent); color: var(--white); display: flex; align-items: center; justify-content: center; }
.play svg { margin-left: 3px; }
</style>
