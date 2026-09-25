// Vérifie que chaque `image` de backend/app/content.json pointe vers un fichier de frontend/public/images
// et porte ses champs obligatoires (texte alternatif et crédit). Sort en code 1 en cas d'erreur.
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, basename } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const content = JSON.parse(readFileSync(join(root, 'backend/app/content.json'), 'utf-8'))
const imagesDir = join(root, 'frontend/public/images')
const REQUIRED = ['src', 'alt', 'credit', 'creditUrl']
const errors = []
let count = 0

// Parcourt tout le contenu : toute clé `image` est contrôlée, où qu'elle soit.
function walk(node, path) {
  if (Array.isArray(node)) return node.forEach((v, i) => walk(v, `${path}[${i}]`))
  if (!node || typeof node !== 'object') return
  for (const [key, value] of Object.entries(node)) {
    if (key === 'image') check(value, `${path}.image`)
    else walk(value, `${path}.${key}`)
  }
}

function check(image, path) {
  count += 1
  if (!image || typeof image !== 'object') return errors.push(`${path} : objet image attendu`)
  for (const field of REQUIRED) {
    if (typeof image[field] !== 'string' || !image[field].trim()) errors.push(`${path}.${field} : champ vide ou manquant`)
  }
  if (typeof image.src === 'string' && image.src.trim()) {
    const file = join(imagesDir, basename(image.src))
    if (!image.src.startsWith('/images/')) errors.push(`${path}.src : doit commencer par /images/ (${image.src})`)
    else if (!existsSync(file)) errors.push(`${path}.src : fichier introuvable (frontend/public/images/${basename(image.src)})`)
  }
}

walk(content, 'content')
if (errors.length) {
  console.error(`check-content : ${errors.length} erreur(s)\n- ` + errors.join('\n- '))
  process.exit(1)
}
console.log(`check-content : ${count} images vérifiées, tout est en ordre`)
