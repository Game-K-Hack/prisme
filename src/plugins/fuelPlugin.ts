import type { FranceDataPlugin } from '@/plugins/index'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { usePluginStore } from '@/store/pluginStore'

// ─── Icône SVG pompe à essence (SDF monochrome pour MapLibre) ────────────────

const FUEL_SVG_SIZE = 48
const FUEL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${FUEL_SVG_SIZE}" height="${FUEL_SVG_SIZE}" viewBox="0 0 24 24" fill="white">
  <path d="M3 22V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v17H3z"/>
  <path d="M7 2v3"/>
  <path d="M9 2v3"/>
  <rect x="5" y="9" width="6" height="4" rx="0.5" fill="black" opacity="0.3"/>
  <path d="M14 8h2a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2v0a2 2 0 0 0 2-2V7l-3-3" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="20" cy="7" r="1" fill="white"/>
</svg>`

function loadSdfImage(map: MapLibreMap, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image(FUEL_SVG_SIZE, FUEL_SVG_SIZE)
    img.onload = () => {
      if (!map.hasImage(id)) {
        map.addImage(id, img, { sdf: true })
      }
      resolve()
    }
    img.onerror = reject
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(FUEL_SVG)
  })
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface FuelStation {
  id: string
  lat: number
  lng: number
  adresse: string
  ville: string
  cp: string
  departement: string
  region: string
  automate: boolean
  services: string
  gazole: number | null
  sp95: number | null
  sp98: number | null
  e10: number | null
  e85: number | null
  gplc: number | null
}

// ─── API & Cache ─────────────────────────────────────────────────────────────

const API_URL = 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/exports/csv?use_labels=true'
const CACHE_KEY = 'prisme-fuel-cache'
const CACHE_TTL = 24 * 60 * 60 * 1000

interface CacheEntry { csv: string; fetchedAt: number }

function loadCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const entry: CacheEntry = JSON.parse(raw)
    if (Date.now() - entry.fetchedAt < CACHE_TTL) return entry
  } catch { /* ignore */ }
  return null
}

function saveCache(csv: string): void {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ csv, fetchedAt: Date.now() })) }
  catch { console.warn('[Prisme/fuel] Cache localStorage plein') }
}

async function fetchCSV(): Promise<string> {
  const cached = loadCache()
  if (cached) { console.log('[Prisme/fuel] Cache OK'); return cached.csv }
  console.log('[Prisme/fuel] Téléchargement...')
  const res = await fetch(API_URL)
  if (!res.ok) throw new Error(`Erreur API: ${res.status}`)
  const csv = await res.text()
  saveCache(csv)
  return csv
}

// ─── Parser ──────────────────────────────────────────────────────────────────

function parsePrice(val: string): number | null {
  if (!val || val.trim() === '') return null
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

/** Parse une ligne CSV en respectant les guillemets (champs avec ; à l'intérieur) */
function parseCsvLine(line: string, sep: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++ // skip escaped quote
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === sep) {
        fields.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  fields.push(current)
  return fields
}

function parseStations(csv: string): FuelStation[] {
  const lines = csv.split('\n')
  if (lines.length < 2) return []
  const headers = parseCsvLine(lines[0], ';')
  const idx = (name: string) => headers.indexOf(name)

  const iGeom = idx('geom'), iAdresse = idx('Adresse'), iVille = idx('Ville')
  const iCp = idx('Code postal'), iId = idx('id')
  const iDept = idx('Département'), iRegion = idx('Région')
  const iAutomate = idx('Automate 24-24 (oui/non)')
  const iServices = idx('Services proposés')
  const iGazole = idx('Prix Gazole'), iSp95 = idx('Prix SP95')
  const iSp98 = idx('Prix SP98'), iE10 = idx('Prix E10')
  const iE85 = idx('Prix E85'), iGplc = idx('Prix GPLc')

  const stations: FuelStation[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const cols = parseCsvLine(line, ';')
    const geom = cols[iGeom]
    if (!geom?.includes(',')) continue
    const parts = geom.split(',').map(s => parseFloat(s.trim()))
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) continue
    const [lat, lng] = parts
    if (lat < 41 || lat > 52 || lng < -6 || lng > 10) continue

    stations.push({
      id: cols[iId] ?? `s${i}`, lat, lng,
      adresse: cols[iAdresse] ?? '', ville: cols[iVille] ?? '',
      cp: cols[iCp] ?? '', departement: cols[iDept] ?? '', region: cols[iRegion] ?? '',
      automate: cols[iAutomate]?.toLowerCase() === 'oui',
      services: cols[iServices] ?? '',
      gazole: parsePrice(cols[iGazole]), sp95: parsePrice(cols[iSp95]),
      sp98: parsePrice(cols[iSp98]), e10: parsePrice(cols[iE10]),
      e85: parsePrice(cols[iE85]), gplc: parsePrice(cols[iGplc]),
    })
  }
  return stations
}

// ─── Couleurs ────────────────────────────────────────────────────────────────

type FuelType = 'best' | 'e10' | 'sp95' | 'sp98' | 'gazole' | 'e85'

function getPrice(s: FuelStation, type: FuelType): number | null {
  if (type === 'best') return s.e10 ?? s.sp95 ?? s.sp98 ?? s.gazole ?? null
  return s[type] ?? null
}

function computeAverage(stations: FuelStation[], type: FuelType): number {
  let sum = 0, count = 0
  for (const s of stations) {
    const p = getPrice(s, type)
    if (p !== null) { sum += p; count++ }
  }
  return count > 0 ? sum / count : 1.85
}

/** Couleur relative à la moyenne nationale (vert=moins cher, rouge=plus cher) */
function priceToColorRelative(price: number, avg: number): string {
  // Spread de ±0.30€ autour de la moyenne
  const ratio = Math.min(1, Math.max(0, (price - (avg - 0.30)) / 0.60))
  if (ratio < 0.5) {
    const t = ratio * 2
    const r = Math.round(34 + 215 * t)
    const g = Math.round(197 - 82 * t)
    const b = Math.round(94 - 72 * t)
    return `rgb(${r},${g},${b})`
  }
  const t = (ratio - 0.5) * 2
  return `rgb(${Math.round(249 - 10 * t)},${Math.round(115 - 47 * t)},${Math.round(22 + 46 * t)})`
}

// ─── GeoJSON ─────────────────────────────────────────────────────────────────

function buildGeoJSON(
  stations: FuelStation[],
  fuelType: FuelType,
  colorByPrice: boolean,
  defaultColor: string,
): GeoJSON.FeatureCollection {
  const avg = colorByPrice ? computeAverage(stations, fuelType) : 0

  return {
    type: 'FeatureCollection',
    features: stations
      .filter(s => getPrice(s, fuelType) !== null)
      .map(s => {
        const price = getPrice(s, fuelType)!
        return {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
          properties: {
            id: s.id, ville: s.ville, adresse: s.adresse, cp: s.cp,
            departement: s.departement, region: s.region, automate: s.automate,
            services: s.services,
            gazole: s.gazole, sp95: s.sp95, sp98: s.sp98,
            e10: s.e10, e85: s.e85, gplc: s.gplc,
            best_price: price,
            color: colorByPrice ? priceToColorRelative(price, avg) : defaultColor,
          },
        }
      }),
  }
}

// ─── Plugin ──────────────────────────────────────────────────────────────────

const SOURCE_ID = 'prisme_fuel_source'
const LAYER_ICON = 'prisme_fuel_icon'
const LAYER_LABEL = 'prisme_fuel_label'
const IMAGE_ID = 'prisme-fuel-pump-sdf'

let clickHandler: ((e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => void) | null = null
let bgClickHandler: ((e: maplibregl.MapMouseEvent) => void) | null = null

export const fuelPlugin: FranceDataPlugin = {
  id: 'fuel',
  label: 'Prix Carburants',
  icon: 'Fuel',
  color: '#3b82f6',
  description: 'Prix des carburants en France — données data.gouv.fr (MàJ quotidienne)',

  settingsDescriptors: [
    {
      key: 'colorByPrice',
      label: 'Colorer selon le prix',
      description: 'Vert = moins cher que la moyenne, Rouge = plus cher',
      type: 'boolean',
      default: true,
    },
    {
      key: 'fuelType',
      label: 'Carburant de référence',
      description: 'Détermine le prix affiché et la couleur',
      type: 'select',
      default: 'best',
      options: [
        { value: 'best', label: 'Meilleur prix disponible' },
        { value: 'e10', label: 'E10' },
        { value: 'sp95', label: 'SP95' },
        { value: 'sp98', label: 'SP98' },
        { value: 'gazole', label: 'Gazole' },
        { value: 'e85', label: 'E85' },
      ],
    },
  ],

  async setup(map: MapLibreMap): Promise<void> {
    if (map.getSource(SOURCE_ID)) return

    const store = usePluginStore()
    const colorByPrice = store.getPluginSetting<boolean>('fuel', 'colorByPrice')
    const fuelType = store.getPluginSetting<FuelType>('fuel', 'fuelType')

    // Charger l'icône SDF
    await loadSdfImage(map, IMAGE_ID)

    // Charger les données
    let csv: string
    try { csv = await fetchCSV() }
    catch (err) { console.error('[Prisme/fuel]', err); return }

    const stations = parseStations(csv)
    console.log(`[Prisme/fuel] ${stations.length} stations`)
    if (stations.length === 0) return

    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: buildGeoJSON(stations, fuelType, colorByPrice, '#3b82f6'),
    })

    // Layer icône pompe (SDF)
    map.addLayer({
      id: LAYER_ICON,
      type: 'symbol',
      source: SOURCE_ID,
      layout: {
        'icon-image': IMAGE_ID,
        'icon-size': [
          'interpolate', ['linear'], ['zoom'],
          5, 0.15, 8, 0.25, 11, 0.45, 14, 0.7,
        ],
        'icon-allow-overlap': false,
        'icon-padding': 2,
      },
      paint: {
        'icon-color': ['get', 'color'],
        'icon-opacity': 0.9,
      },
    })

    // Layer prix texte
    map.addLayer({
      id: LAYER_LABEL,
      type: 'symbol',
      source: SOURCE_ID,
      minzoom: 11,
      layout: {
        'text-field': ['concat', ['to-string', ['get', 'best_price']], ' €'],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-size': 10,
        'text-offset': [0, 2],
        'text-anchor': 'top',
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': '#f1f5f9',
        'text-halo-color': '#0f1117',
        'text-halo-width': 1.5,
      },
    })

    // Clic → panneau détail
    clickHandler = (e) => {
      if (!e.features?.length) return
      e.preventDefault()
      store.selectFeature({ pluginId: 'fuel', properties: e.features[0].properties as Record<string, unknown> })
    }
    map.on('click', LAYER_ICON, clickHandler)

    bgClickHandler = (e) => {
      if ((e as typeof e & { defaultPrevented?: boolean }).defaultPrevented) return
      const s = usePluginStore()
      if (s.selectedFeature?.pluginId === 'fuel') s.selectFeature(null)
    }
    map.on('click', bgClickHandler)

    map.on('mouseenter', LAYER_ICON, () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', LAYER_ICON, () => { map.getCanvas().style.cursor = '' })
  },

  teardown(map: MapLibreMap): void {
    if (clickHandler) { map.off('click', LAYER_ICON, clickHandler); clickHandler = null }
    if (bgClickHandler) { map.off('click', bgClickHandler); bgClickHandler = null }
    if (map.getLayer(LAYER_LABEL)) map.removeLayer(LAYER_LABEL)
    if (map.getLayer(LAYER_ICON)) map.removeLayer(LAYER_ICON)
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    if (map.hasImage(IMAGE_ID)) map.removeImage(IMAGE_ID)
  },
}
