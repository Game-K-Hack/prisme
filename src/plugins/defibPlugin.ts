import type { FranceDataPlugin } from '@/plugins/index'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { usePluginStore } from '@/store/pluginStore'

const SOURCE_ID = 'prisme_defib_source'
const LAYER_CIRCLE = 'prisme_defib_circle'
const LAYER_LABEL = 'prisme_defib_label'

const DEFIBRILLATORS = [
  { name: 'Gare du Nord', coordinates: [2.3553, 48.8809] },
  { name: 'Gare de Lyon', coordinates: [2.3735, 48.8443] },
  { name: 'Centre Commercial Part-Dieu', coordinates: [4.8590, 45.7610] },
  { name: 'Hôtel de Ville de Marseille', coordinates: [5.3698, 43.2965] },
  { name: 'Place du Capitole', coordinates: [1.4437, 43.6047] },
  { name: 'Gare Saint-Jean', coordinates: [-0.5566, 44.8264] },
  { name: 'CHU de Nantes', coordinates: [-1.5210, 47.2126] },
  { name: 'Place Kléber', coordinates: [7.7458, 48.5839] },
  { name: 'Gare Lille Flandres', coordinates: [3.0710, 50.6366] },
  { name: 'Mairie de Rennes', coordinates: [-1.6788, 48.1113] },
  { name: 'Promenade des Anglais', coordinates: [7.2562, 43.6950] },
  { name: 'Place Bellecour', coordinates: [4.8324, 45.7578] },
  { name: 'Vieux-Port', coordinates: [5.3755, 43.2942] },
  { name: 'Gare de Strasbourg', coordinates: [7.7340, 48.5850] },
  { name: 'Aéroport CDG T2', coordinates: [2.5710, 49.0038] },
]

function buildGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: DEFIBRILLATORS.map((d, i) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: d.coordinates },
      properties: { id: `d${i}`, name: d.name },
    })),
  }
}

export const defibPlugin: FranceDataPlugin = {
  id: 'defibrillators',
  label: 'Défibrillateurs',
  icon: 'HeartPulse',
  color: '#ef4444',
  description: 'Localisation des défibrillateurs d\'urgence (données simulées)',

  setup(map: MapLibreMap): void {
    if (map.getSource(SOURCE_ID)) return

    map.addSource(SOURCE_ID, { type: 'geojson', data: buildGeoJSON() })

    map.addLayer({
      id: LAYER_CIRCLE,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 4, 10, 8, 14, 14],
        'circle-color': '#ef4444',
        'circle-opacity': 0.9,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.8,
      },
    })

    map.addLayer({
      id: LAYER_LABEL,
      type: 'symbol',
      source: SOURCE_ID,
      minzoom: 10,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-size': 10,
        'text-offset': [0, 1.4],
        'text-anchor': 'top',
      },
      paint: {
        'text-color': '#fca5a5',
        'text-halo-color': '#0f1117',
        'text-halo-width': 1.5,
      },
    })

    map.on('click', LAYER_CIRCLE, (e) => {
      if (!e.features?.length) return
      e.preventDefault()
      usePluginStore().selectFeature({
        pluginId: 'defibrillators',
        properties: e.features[0].properties as Record<string, unknown>,
      })
    })

    map.on('mouseenter', LAYER_CIRCLE, () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', LAYER_CIRCLE, () => { map.getCanvas().style.cursor = '' })
  },

  teardown(map: MapLibreMap): void {
    if (map.getLayer(LAYER_LABEL)) map.removeLayer(LAYER_LABEL)
    if (map.getLayer(LAYER_CIRCLE)) map.removeLayer(LAYER_CIRCLE)
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
  },
}
