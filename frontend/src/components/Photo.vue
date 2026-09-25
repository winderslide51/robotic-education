<script setup>
import { ref, computed, watch } from 'vue'

// Photo sous licence libre, servie par l'app, avec son crédit obligatoire :
// « Photo : auteur, licence, modifiée », l'auteur lié à sa page (Commons ou son site), la licence à son deed.
// Si le fichier ne charge pas, on masque le cadre et le crédit, et on affiche le texte alternatif (et le repli du slot).
const props = defineProps({
  // { src, alt, credit, creditUrl, author?, authorUrl?, license?, licenseUrl?, modified? }
  image: { type: Object, required: true },
  size: { type: String, default: 'md' }, // thumb | md
  eager: { type: Boolean, default: false }, // image visible dès l'affichage : pas de chargement différé
})

const failed = ref(false)
watch(() => props.image?.src, () => (failed.value = false))

const src = computed(() => (props.image?.src ? import.meta.env.BASE_URL + props.image.src.replace(/^\//, '') : ''))
// « Photo » ou « Image » (image de synthèse), repris du crédit court
const kind = computed(() => props.image?.credit?.split(' : ')[0] || 'Photo')
const NEW_TAB = ' (nouvel onglet)'
</script>

<template>
  <figure class="photo" :class="['photo-' + size, { failed }]">
    <div v-if="!failed && src" class="photo-frame">
      <img :src="src" :alt="image.alt" :loading="eager ? 'eager' : 'lazy'" decoding="async" @error="failed = true" />
    </div>
    <div v-else class="photo-missing">
      <slot />
      <span class="photo-alt">{{ image.alt }}</span>
    </div>
    <figcaption v-if="!failed && src" class="photo-credit">
      <template v-if="image.author">
        {{ kind }} :
        <a
          :href="image.authorUrl || image.creditUrl"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="image.author + (image.authorUrl ? ', site de l’auteur' : ', page de l’image sur Wikimedia Commons') + NEW_TAB"
        >{{ image.author }}<span class="ext" aria-hidden="true">↗</span></a>
        <template v-if="image.authorUrl">
          (<a :href="image.creditUrl" target="_blank" rel="noopener noreferrer" :aria-label="'Page de l’image sur Wikimedia Commons' + NEW_TAB">Commons<span class="ext" aria-hidden="true">↗</span></a>)</template>,
        <a
          v-if="image.licenseUrl"
          :href="image.licenseUrl"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="'Licence ' + image.license + NEW_TAB"
        >{{ image.license }}<span class="ext" aria-hidden="true">↗</span></a>
        <template v-else>{{ image.license }}</template>
        <template v-if="image.modified">, modifiée</template>
      </template>
      <a
        v-else-if="image.creditUrl"
        :href="image.creditUrl"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="image.credit + NEW_TAB"
      >{{ image.credit }}<span class="ext" aria-hidden="true">↗</span></a>
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
.photo-md .photo-frame { height: 210px; }
/* Pas de recadrage : l'image entière tient dans le cadre. */
.photo-frame img { display: block; max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; }
/* Vignette : la figure s'efface pour que le cadre et le crédit se placent dans la grille de la carte parente. */
.photo-thumb { display: contents; }
.photo-thumb .photo-frame { width: 72px; height: 72px; }
.photo-thumb .photo-frame img { width: 100%; height: 100%; max-width: none; max-height: none; object-fit: cover; }
.photo-thumb .photo-credit { text-align: left; }
.photo-missing {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 12px; text-align: center;
  background: var(--accent-50, #FFF7ED);
  border: 1px dashed var(--accent-200, #FDBA74);
  color: var(--text, #475569); font-size: 0.9rem; font-style: italic;
}
.photo-credit { font-size: 0.75rem; line-height: 1.3; color: var(--muted, #64748B); text-align: right; overflow-wrap: anywhere; }
.photo-credit a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
.photo-credit .ext { font-size: 0.85em; margin-left: 1px; text-decoration: none; display: inline-block; }
</style>
