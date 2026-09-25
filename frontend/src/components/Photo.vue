<script setup>
import { ref, computed, watch } from 'vue'

// Photo sous licence libre, servie par l'app, avec son crédit obligatoire.
// Si le fichier ne charge pas, on masque le cadre et on affiche le texte alternatif (et le repli éventuel du slot).
const props = defineProps({
  image: { type: Object, required: true }, // { src, alt, credit, creditUrl }
  size: { type: String, default: 'md' }, // sm | md
})

const failed = ref(false)
watch(() => props.image?.src, () => (failed.value = false))

const src = computed(() => import.meta.env.BASE_URL + props.image.src.replace(/^\//, ''))
</script>

<template>
  <figure class="photo" :class="['photo-' + size, { failed }]">
    <div v-if="!failed" class="photo-frame">
      <img :src="src" :alt="image.alt" loading="lazy" decoding="async" @error="failed = true" />
    </div>
    <div v-else class="photo-missing">
      <slot />
      <span>{{ image.alt }}</span>
    </div>
    <figcaption class="photo-credit">
      <a v-if="image.creditUrl" :href="image.creditUrl" target="_blank" rel="noopener">{{ image.credit }}</a>
      <template v-else>{{ image.credit }}</template>
    </figcaption>
  </figure>
</template>

<style scoped>
.photo { margin: 0; display: flex; flex-direction: column; gap: 4px; min-width: 0; font-family: Geist, system-ui, sans-serif; }
.photo-frame {
  background: var(--surface, #F8FAFC);
  border: 1px solid var(--border, #CBD5E1);
  border-radius: 0;
  overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
.photo-sm .photo-frame { height: 150px; }
.photo-md .photo-frame { height: 210px; }
/* Pas de recadrage : l'image entière tient dans le cadre. */
.photo-frame img { display: block; max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; }
.photo-missing {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 12px; text-align: center;
  background: var(--accent-50, #FFF7ED);
  border: 1px dashed var(--accent-200, #FDBA74);
  color: var(--text, #475569); font-size: 0.9rem; font-style: italic;
}
.photo-credit { font-size: 0.75rem; line-height: 1.3; color: var(--muted, #64748B); text-align: right; overflow-wrap: anywhere; }
.photo-credit a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
</style>
