import type { FranceDataPlugin } from '@/plugins/index'
import type { Map as MapLibreMap } from 'maplibre-gl'

// ─── Types ───────────────────────────────────────────────────────────────────

interface FuelStation {
  id: string
  name: string
  city: string
  coordinates: [number, number] // [lng, lat]
  price_sp95: number
  price_diesel: number
  brand: string
}

// ─── Données simulées ────────────────────────────────────────────────────────
// Stations représentatives dans les grandes métropoles françaises.
// En production, remplacer par l'API data.gouv.fr :
// https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2

const FUEL_STATIONS: FuelStation[] = [
  { id: 'f01', name: 'Total Énergie Nation', city: 'Paris', coordinates: [2.3964, 48.8502], price_sp95: 1.939, price_diesel: 1.812, brand: 'TotalEnergies' },
  { id: 'f02', name: 'BP Porte de Clichy', city: 'Paris', coordinates: [2.3187, 48.8935], price_sp95: 1.899, price_diesel: 1.789, brand: 'BP' },
  { id: 'f03', name: 'Leclerc Lyon Est', city: 'Lyon', coordinates: [4.8946, 45.7488], price_sp95: 1.799, price_diesel: 1.694, brand: 'Leclerc' },
  { id: 'f04', name: 'Intermarché Vaise', city: 'Lyon', coordinates: [4.8050, 45.7726], price_sp95: 1.819, price_diesel: 1.712, brand: 'Intermarché' },
  { id: 'f05', name: 'Total Joliette', city: 'Marseille', coordinates: [5.3681, 43.3149], price_sp95: 1.959, price_diesel: 1.842, brand: 'TotalEnergies' },
  { id: 'f06', name: 'Auchan Vitrolles', city: 'Marseille', coordinates: [5.2357, 43.4212], price_sp95: 1.829, price_diesel: 1.722, brand: 'Auchan' },
  { id: 'f07', name: 'BP Capitole', city: 'Toulouse', coordinates: [1.4442, 43.6043], price_sp95: 1.869, price_diesel: 1.754, brand: 'BP' },
  { id: 'f08', name: 'Leclerc Blagnac', city: 'Toulouse', coordinates: [1.3896, 43.6361], price_sp95: 1.789, price_diesel: 1.679, brand: 'Leclerc' },
  { id: 'f09', name: 'Esso Préfecture', city: 'Bordeaux', coordinates: [-0.5752, 44.8378], price_sp95: 1.919, price_diesel: 1.802, brand: 'Esso' },
  { id: 'f10', name: 'Carrefour Mériadeck', city: 'Bordeaux', coordinates: [-0.5894, 44.8367], price_sp95: 1.849, price_diesel: 1.738, brand: 'Carrefour' },
  { id: 'f11', name: 'Total Saint-Nicolas', city: 'Nantes', coordinates: [-1.5567, 47.2184], price_sp95: 1.909, price_diesel: 1.797, brand: 'TotalEnergies' },
  { id: 'f12', name: 'Leclerc Rezé', city: 'Nantes', coordinates: [-1.5574, 47.1809], price_sp95: 1.779, price_diesel: 1.669, brand: 'Leclerc' },
  { id: 'f13', name: 'BP Esplanade', city: 'Strasbourg', coordinates: [7.7521, 48.5831], price_sp95: 1.889, price_diesel: 1.772, brand: 'BP' },
  { id: 'f14', name: 'Total Meinau', city: 'Strasbourg', coordinates: [7.7642, 48.5538], price_sp95: 1.859, price_diesel: 1.748, brand: 'TotalEnergies' },
  { id: 'f15', name: 'Intermarché Lille Centre', city: 'Lille', coordinates: [3.0640, 50.6367], price_sp95: 1.849, price_diesel: 1.731, brand: 'Intermarché' },
  { id: 'f16', name: 'Auchan Villeneuve d\'Ascq', city: 'Lille', coordinates: [3.1423, 50.6282], price_sp95: 1.809, price_diesel: 1.699, brand: 'Auchan' },
  { id: 'f17', name: 'Total Rennes Sud', city: 'Rennes', coordinates: [-1.6780, 48.1019], price_sp95: 1.929, price_diesel: 1.819, brand: 'TotalEnergies' },
  { id: 'f18', name: 'Leclerc Cesson', city: 'Rennes', coordinates: [-1.6024, 48.1063], price_sp95: 1.799, price_diesel: 1.684, brand: 'Leclerc' },
  { id: 'f19', name: 'BP Nice Étoile', city: 'Nice', coordinates: [7.2621, 43.6964], price_sp95: 1.989, price_diesel: 1.872, brand: 'BP' },
  { id: 'f20', name: 'Total Mont-Boron', city: 'Nice', coordinates: [7.2941, 43.6978], price_sp95: 1.969, price_diesel: 1.861, brand: 'TotalEnergies' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normalise un prix entre 0 et 1 dans la plage observée */
function getPriceRatio(price: number): number {
  const MIN = 1.65
  const MAX = 2.00
  return Math.min(1, Math.max(0, (price - MIN) / (MAX - MIN)))
}

/**
 * Interpolation linéaire de couleur RGB
 * Vert (#22c55e) → Orange (#f97316) → Rouge (#ef4444)
 */
function priceToColor(price: number): string {
  const ratio = getPriceRatio(price)
  if (ratio < 0.5) {
    // Vert → Orange
    const t = ratio * 2
    const r = Math.round(34 + (249 - 34) * t)
    const g = Math.round(197 + (115 - 197) * t)
    const b = Math.round(94 + (22 - 94) * t)
    return `rgb(${r},${g},${b})`
  } else {
    // Orange → Rouge
    const t = (ratio - 0.5) * 2
    const r = Math.round(249 + (239 - 249) * t)
    const g = Math.round(115 + (68 - 115) * t)
    const b = Math.round(22 + (68 - 22) * t)
    return `rgb(${r},${g},${b})`
  }
}

// ─── GeoJSON ─────────────────────────────────────────────────────────────────

function buildGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: FUEL_STATIONS.map((s) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: s.coordinates,
      },
      properties: {
        id: s.id,
        name: s.name,
        city: s.city,
        brand: s.brand,
        price_sp95: s.price_sp95,
        price_diesel: s.price_diesel,
        label_sp95: `SP95 ${s.price_sp95.toFixed(3)} €/L`,
        label_diesel: `Diesel ${s.price_diesel.toFixed(3)} €/L`,
        // Couleur interpolée selon le prix SP95
        color: priceToColor(s.price_sp95),
        price_ratio: getPriceRatio(s.price_sp95),
      },
    })),
  }
}

// ─── Plugin ──────────────────────────────────────────────────────────────────

const SOURCE_ID = 'prisme_fuel_source'
const LAYER_CIRCLE_ID = 'prisme_fuel_circle'
const LAYER_LABEL_ID = 'prisme_fuel_label'

export const fuelPlugin: FranceDataPlugin = {
  id: 'fuel',
  label: 'Carburants',
  icon: 'Fuel',
  color: '#f97316',
  description: 'Prix des carburants en temps réel sur les stations françaises',

  setup(map: MapLibreMap): void {
    // Évite les doublons si setup() est appelé plusieurs fois
    if (map.getSource(SOURCE_ID)) return

    // Ajoute la source GeoJSON
    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: buildGeoJSON(),
    })

    // Layer cercles avec taille et couleur selon le prix
    map.addLayer({
      id: LAYER_CIRCLE_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          5, 5,
          10, 10,
          14, 16,
        ],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.85,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.6,
      },
    })

    // Layer labels (visible à partir du zoom 9)
    map.addLayer({
      id: LAYER_LABEL_ID,
      type: 'symbol',
      source: SOURCE_ID,
      minzoom: 9,
      layout: {
        'text-field': ['get', 'label_sp95'],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-size': 11,
        'text-offset': [0, 1.4],
        'text-anchor': 'top',
      },
      paint: {
        'text-color': '#f1f5f9',
        'text-halo-color': '#0f1117',
        'text-halo-width': 1.5,
      },
    })

    // Popup au survol
    map.on('click', LAYER_CIRCLE_ID, (e) => {
      if (!e.features || e.features.length === 0) return
      const props = e.features[0].properties as {
        name: string
        city: string
        brand: string
        label_sp95: string
        label_diesel: string
      }
      const coords = (e.features[0].geometry as GeoJSON.Point).coordinates as [number, number]

      const { Popup } = (window as typeof window & { maplibregl: typeof import('maplibre-gl') }).maplibregl
      new Popup({ closeButton: true, maxWidth: '220px' })
        .setLngLat(coords)
        .setHTML(
          `<div style="font-family:Inter,sans-serif;padding:4px 0">
            <strong style="font-size:13px;color:#1e293b">${props.name}</strong>
            <p style="margin:4px 0 0;font-size:11px;color:#64748b">${props.brand} · ${props.city}</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:8px 0"/>
            <p style="margin:0;font-size:12px;color:#0f172a">⛽ ${props.label_sp95}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#0f172a">🛢 ${props.label_diesel}</p>
          </div>`
        )
        .addTo(map)
    })

    map.on('mouseenter', LAYER_CIRCLE_ID, () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', LAYER_CIRCLE_ID, () => {
      map.getCanvas().style.cursor = ''
    })
  },

  teardown(map: MapLibreMap): void {
    if (map.getLayer(LAYER_LABEL_ID)) map.removeLayer(LAYER_LABEL_ID)
    if (map.getLayer(LAYER_CIRCLE_ID)) map.removeLayer(LAYER_CIRCLE_ID)
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
  },
}
