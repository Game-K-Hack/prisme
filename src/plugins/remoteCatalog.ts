/**
 * Catalogue distant — fetch registry.json depuis GitHub
 * et vérifie le SHA256 des .prm avant installation.
 */

export interface RemotePlugin {
  id: string
  label: string
  icon: string
  color: string
  description: string
  version: string
  author: string
  verified: boolean
  prm_url: string
  sha256: string
  repository?: string
  license?: string
  tags?: string[]
  min_prisme_version?: string
}

const REGISTRY_URL =
  'https://raw.githubusercontent.com/Game-K-Hack/prisme-plugins/main/registry.json'

const CACHE_KEY = 'prisme-remote-catalog'
const CACHE_TTL = 60 * 60 * 1000 // 1 heure

interface CacheEntry {
  data: RemotePlugin[]
  fetchedAt: number
}

// ─── Cache ───────────────────────────────────────────────────────────────────

function loadCache(): RemotePlugin[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const entry: CacheEntry = JSON.parse(raw)
    if (Date.now() - entry.fetchedAt < CACHE_TTL) return entry.data
  } catch { /* ignore */ }
  return null
}

function saveCache(data: RemotePlugin[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, fetchedAt: Date.now() }))
  } catch { /* ignore */ }
}

// ─── Fetch ───────────────────────────────────────────────────────────────────

export async function fetchRemoteCatalog(forceRefresh = false): Promise<RemotePlugin[]> {
  if (!forceRefresh) {
    const cached = loadCache()
    if (cached) return cached
  }

  const res = await fetch(REGISTRY_URL, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Erreur HTTP ${res.status} lors du fetch du catalogue`)

  const data = await res.json()
  if (!Array.isArray(data)) throw new Error('Format du catalogue invalide')

  saveCache(data)
  return data as RemotePlugin[]
}

export function clearRemoteCatalogCache(): void {
  localStorage.removeItem(CACHE_KEY)
}

// ─── SHA256 ───────────────────────────────────────────────────────────────────

export async function computeSha256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function downloadAndVerifyPrm(
  plugin: RemotePlugin
): Promise<{ data: ArrayBuffer; verified: boolean }> {
  const res = await fetch(plugin.prm_url)
  if (!res.ok) throw new Error(`Erreur HTTP ${res.status} lors du téléchargement`)

  const data = await res.arrayBuffer()
  const sha256 = await computeSha256(data)
  const verified = sha256 === plugin.sha256

  return { data, verified }
}
