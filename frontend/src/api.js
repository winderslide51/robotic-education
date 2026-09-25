import fallback from '../../backend/app/content.json'

const API_URL = import.meta.env.VITE_API_URL

// Le parcours doit rester jouable même si l'API est injoignable : on retombe sur le contenu embarqué.
export async function loadContent() {
  if (!API_URL) return fallback
  try {
    const res = await fetch(`${API_URL.replace(/\/$/, '')}/content`, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) throw new Error(res.status)
    return await res.json()
  } catch {
    return fallback
  }
}
