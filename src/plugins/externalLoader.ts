import JSZip from 'jszip'
import type { FranceDataPlugin } from '@/plugins/index'
import type { Map as MapLibreMap } from 'maplibre-gl'

const MAGIC_START = new Uint8Array([0x50, 0x52, 0x49, 0x53, 0x4D, 0x45])
const MAGIC_END = new Uint8Array([0x42, 0x59, 0x20, 0x4B, 0xC9, 0x4C, 0x49, 0x41, 0x4E])

function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

const ZIP_MAGIC = new Uint8Array([0x50, 0x4B]) // "PK"

async function wrapPrm(zipBlob: Blob): Promise<Blob> {
  const zipBuffer = new Uint8Array(await zipBlob.arrayBuffer())

  // Vérifier que c'est bien un ZIP
  if (zipBuffer[0] !== 0x50 || zipBuffer[1] !== 0x4B) {
    throw new Error('Données ZIP invalides — magic PK manquant')
  }

  // zipData sans les 2 premiers octets (PK)
  const zipPayload = zipBuffer.slice(ZIP_MAGIC.length)
  const total = MAGIC_START.length + zipPayload.length + MAGIC_END.length
  const out = new Uint8Array(total)
  out.set(MAGIC_START, 0)
  out.set(zipPayload, MAGIC_START.length)
  out.set(MAGIC_END, MAGIC_START.length + zipPayload.length)
  return new Blob([out], { type: 'application/x-prisme-plugin' })
}

function unwrapPrm(buffer: ArrayBuffer): ArrayBuffer {
  const bytes = new Uint8Array(buffer)

  if (bytes.length < MAGIC_START.length + MAGIC_END.length + 2) {
    throw new Error('Fichier .prm trop petit — fichier corrompu')
  }

  // Vérifier magic start "PRISME"
  const start = bytes.slice(0, MAGIC_START.length)
  if (!arraysEqual(start, MAGIC_START)) {
    throw new Error(
      'Magic number invalide — ce fichier n\'est pas un plugin Prisme (.prm)\n' +
      `Attendu : ${Array.from(MAGIC_START).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')}\n` +
      `Reçu    : ${Array.from(start).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')}`
    )
  }

  // Vérifier magic end "BY KÉLIAN"
  const end = bytes.slice(bytes.length - MAGIC_END.length)
  if (!arraysEqual(end, MAGIC_END)) {
    throw new Error(
      'Signature de fin invalide — fichier .prm corrompu ou tronqué\n' +
      `Attendu : ${Array.from(MAGIC_END).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')}\n` +
      `Reçu    : ${Array.from(end).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')}`
    )
  }

  // Extraire le payload (sans PRISME ni BY KÉLIAN)
  const payload = bytes.slice(MAGIC_START.length, bytes.length - MAGIC_END.length)

  // Restaurer le magic ZIP "PK" devant
  const zipData = new Uint8Array(ZIP_MAGIC.length + payload.length)
  zipData.set(ZIP_MAGIC, 0)
  zipData.set(payload, ZIP_MAGIC.length)
  return zipData.buffer
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PluginManifest {
  id: string
  label: string
  icon: string
  color: string
  description?: string
  version?: string
  author?: string
  settings?: Array<{
    key: string
    label: string
    description?: string
    type: 'boolean' | 'select' | 'range' | 'color'
    default: unknown
    options?: Array<{ value: string; label: string }>
    min?: number
    max?: number
    step?: number
  }>
}

export interface StoredExternalPlugin {
  manifest: PluginManifest
  jsCode: string
  installedAt: string
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validateManifest(data: unknown): data is PluginManifest {
  if (typeof data !== 'object' || data === null) return false
  const m = data as Record<string, unknown>
  return (
    typeof m.id === 'string' && m.id.length > 0 &&
    typeof m.label === 'string' && m.label.length > 0 &&
    typeof m.icon === 'string' &&
    typeof m.color === 'string'
  )
}

// ─── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'prisme-external-plugins'

export function loadStoredPlugins(): StoredExternalPlugin[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveStoredPlugins(plugins: StoredExternalPlugin[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plugins))
}

export function storeExternalPlugin(manifest: PluginManifest, jsCode: string): void {
  const stored = loadStoredPlugins()
  const idx = stored.findIndex(p => p.manifest.id === manifest.id)
  const entry: StoredExternalPlugin = {
    manifest,
    jsCode,
    installedAt: new Date().toISOString(),
  }
  if (idx >= 0) stored[idx] = entry
  else stored.push(entry)
  saveStoredPlugins(stored)
}

export function removeStoredPlugin(id: string): void {
  const stored = loadStoredPlugins().filter(p => p.manifest.id !== id)
  saveStoredPlugins(stored)
}

// ─── Extraction ──────────────────────────────────────────────────────────────

export interface ExtractResult {
  manifest: PluginManifest
  jsCode: string
}

export async function extractPluginFile(file: File): Promise<ExtractResult> {
  const buffer = await file.arrayBuffer()
  let zipData: ArrayBuffer

  const isPrm = file.name.endsWith('.prm')
  const bytes = new Uint8Array(buffer)

  // Détection automatique : vérifier si le fichier commence par le magic PRISME
  const hasPrmMagic = bytes.length >= MAGIC_START.length &&
    arraysEqual(bytes.slice(0, MAGIC_START.length), MAGIC_START)

  if (isPrm || hasPrmMagic) {
    zipData = unwrapPrm(buffer)
  } else {
    // Fallback ZIP classique
    zipData = buffer
  }

  const zip = await JSZip.loadAsync(zipData)

  let manifestFile: JSZip.JSZipObject | null = null
  let pluginFile: JSZip.JSZipObject | null = null

  zip.forEach((path, entry) => {
    const name = path.split('/').pop()
    if (name === 'manifest.json' && !manifestFile) manifestFile = entry
    if (name === 'plugin.js' && !pluginFile) pluginFile = entry
  })

  if (!manifestFile) throw new Error('manifest.json introuvable dans le package')
  if (!pluginFile) throw new Error('plugin.js introuvable dans le package')

  const manifestRaw = await manifestFile.async('string')
  let manifest: unknown
  try {
    manifest = JSON.parse(manifestRaw)
  } catch {
    throw new Error('manifest.json invalide (JSON malformé)')
  }

  if (!validateManifest(manifest)) {
    throw new Error('manifest.json incomplet — champs requis : id, label, icon, color')
  }

  const jsCode = await pluginFile.async('string')
  if (!jsCode.trim()) throw new Error('plugin.js est vide')

  return { manifest, jsCode }
}

// ─── Runtime loading ─────────────────────────────────────────────────────────

export function compileExternalPlugin(
  manifest: PluginManifest,
  jsCode: string
): FranceDataPlugin {
  let module: { setup: (map: MapLibreMap) => void; teardown?: (map: MapLibreMap) => void }

  try {
    module = new Function(`"use strict"; return ${jsCode}`)()
  } catch (err) {
    throw new Error(`Erreur de compilation plugin "${manifest.id}": ${err}`)
  }

  if (typeof module?.setup !== 'function') {
    throw new Error(`Le plugin "${manifest.id}" ne définit pas de fonction setup()`)
  }

  return {
    id: manifest.id,
    label: manifest.label,
    icon: manifest.icon,
    color: manifest.color,
    description: manifest.description,
    settingsDescriptors: manifest.settings,
    setup(map: MapLibreMap) {
      module.setup(map)
    },
    teardown: module.teardown
      ? (map: MapLibreMap) => module.teardown!(map)
      : undefined,
  }
}

// ─── Template .prm generator ─────────────────────────────────────────────────

export async function generateTemplatePrm(): Promise<Blob> {
  const zip = new JSZip()

  zip.file('manifest.json', JSON.stringify({
    id: 'mon_plugin',
    label: 'Mon Plugin',
    icon: 'Star',
    color: '#f59e0b',
    description: 'Description de mon plugin',
    version: '1.0.0',
    author: 'Votre nom',
  }, null, 2))

  zip.file('plugin.js', `({
  /**
   * Appelée quand le plugin est activé.
   * @param {maplibregl.Map} map - Instance MapLibre
   */
  setup(map) {
    var data = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [2.3522, 48.8566] },
          properties: { name: 'Paris' }
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [4.8357, 45.7640] },
          properties: { name: 'Lyon' }
        }
      ]
    }

    map.addSource('mon_plugin_src', { type: 'geojson', data: data })

    map.addLayer({
      id: 'mon_plugin_circle',
      type: 'circle',
      source: 'mon_plugin_src',
      paint: {
        'circle-radius': 8,
        'circle-color': '#f59e0b',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    })

    map.addLayer({
      id: 'mon_plugin_label',
      type: 'symbol',
      source: 'mon_plugin_src',
      minzoom: 8,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-size': 12,
        'text-offset': [0, 1.5],
        'text-anchor': 'top'
      },
      paint: {
        'text-color': '#fbbf24',
        'text-halo-color': '#0f1117',
        'text-halo-width': 1.5
      }
    })
  },

  /**
   * Appelée quand le plugin est désactivé.
   * @param {maplibregl.Map} map - Instance MapLibre
   */
  teardown(map) {
    if (map.getLayer('mon_plugin_label')) map.removeLayer('mon_plugin_label')
    if (map.getLayer('mon_plugin_circle')) map.removeLayer('mon_plugin_circle')
    if (map.getSource('mon_plugin_src')) map.removeSource('mon_plugin_src')
  }
})
`)

  zip.file('README.md', `# Plugin Prisme (.prm)

## Format de fichier

Le format .prm est un conteneur binaire propriétaire Prisme :

\`\`\`
[MAGIC START: "PRISME" (6 octets)] [ZIP payload] [MAGIC END: "BY KÉLIAN" (9 octets)]
\`\`\`

Magic start (hex) : 50 52 49 53 4D 45
Magic end (hex)   : 42 59 20 4B C9 4C 49 41 4E

## Contenu du ZIP

\`\`\`
├── manifest.json   (obligatoire)
├── plugin.js       (obligatoire)
└── README.md       (optionnel)
\`\`\`

## manifest.json

| Champ       | Type   | Requis | Description                     |
|-------------|--------|--------|---------------------------------|
| id          | string | oui    | Identifiant unique (snake_case) |
| label       | string | oui    | Nom affiché                     |
| icon        | string | oui    | Icône Lucide (ex: "Star")       |
| color       | string | oui    | Couleur hex (ex: "#f59e0b")     |
| description | string | non    | Description courte              |
| version     | string | non    | Version sémantique              |
| author      | string | non    | Auteur du plugin                |

## plugin.js

Expression JS retournant un objet { setup(map), teardown(map) }.
API MapLibre : https://maplibre.org/maplibre-gl-js/docs/API/
Icônes : https://lucide.dev/icons/
`)

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  return wrapPrm(zipBlob)
}

/**
 * Emballe un manifest + code JS dans un fichier .prm
 */
export async function buildPrmFile(manifest: PluginManifest, jsCode: string): Promise<Blob> {
  const zip = new JSZip()
  zip.file('manifest.json', JSON.stringify(manifest, null, 2))
  zip.file('plugin.js', jsCode)
  const zipBlob = await zip.generateAsync({ type: 'blob' })
  return wrapPrm(zipBlob)
}
