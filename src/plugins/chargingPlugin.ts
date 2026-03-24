import type { FranceDataPlugin } from '@/plugins/index'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { usePluginStore } from '@/store/pluginStore'

const SOURCE_ID = 'prisme_charging_source'
const LAYER_CIRCLE = 'prisme_charging_circle'
const LAYER_LABEL = 'prisme_charging_label'

const STATIONS = [
  { name: 'Tesla Supercharger Bercy', city: 'Paris', coordinates: [2.3856, 48.8396], power: 250, slots: 12, operator: 'Tesla' },
  { name: 'Ionity A6 Beaune', city: 'Beaune', coordinates: [4.8305, 47.0190], power: 350, slots: 6, operator: 'Ionity' },
  { name: 'TotalEnergies Lyon Gerland', city: 'Lyon', coordinates: [4.8358, 45.7275], power: 175, slots: 8, operator: 'TotalEnergies' },
  { name: 'Fastned Marseille L2', city: 'Marseille', coordinates: [5.4005, 43.3095], power: 300, slots: 4, operator: 'Fastned' },
  { name: 'Electra Toulouse', city: 'Toulouse', coordinates: [1.4320, 43.6115], power: 150, slots: 10, operator: 'Electra' },
  { name: 'Ionity A63 Bordeaux', city: 'Bordeaux', coordinates: [-0.6150, 44.7920], power: 350, slots: 6, operator: 'Ionity' },
  { name: 'Tesla Supercharger Nantes', city: 'Nantes', coordinates: [-1.5428, 47.2270], power: 250, slots: 8, operator: 'Tesla' },
  { name: 'Allego Strasbourg', city: 'Strasbourg', coordinates: [7.7350, 48.5730], power: 150, slots: 4, operator: 'Allego' },
  { name: 'Electra Lille', city: 'Lille', coordinates: [3.0588, 50.6310], power: 150, slots: 8, operator: 'Electra' },
  { name: 'Ionity A84 Rennes', city: 'Rennes', coordinates: [-1.7210, 48.0750], power: 350, slots: 6, operator: 'Ionity' },
  { name: 'TotalEnergies Nice', city: 'Nice', coordinates: [7.2740, 43.7085], power: 175, slots: 6, operator: 'TotalEnergies' },
  { name: 'Tesla Supercharger Dijon', city: 'Dijon', coordinates: [5.0340, 47.3220], power: 250, slots: 10, operator: 'Tesla' },
]

function buildGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: STATIONS.map((s, i) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: s.coordinates },
      properties: {
        id: `ev${i}`,
        name: s.name,
        city: s.city,
        power: s.power,
        slots: s.slots,
        operator: s.operator,
        label: `${s.power} kW`,
      },
    })),
  }
}

export const chargingPlugin: FranceDataPlugin = {
  id: 'ev_charging',
  label: 'Bornes de recharge',
  icon: 'Plug',
  color: '#22c55e',
  description: 'Stations de recharge rapide pour véhicules électriques (données simulées)',

  setup(map: MapLibreMap): void {
    if (map.getSource(SOURCE_ID)) return

    map.addSource(SOURCE_ID, { type: 'geojson', data: buildGeoJSON() })

    map.addLayer({
      id: LAYER_CIRCLE,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 4, 10, 9, 14, 14],
        'circle-color': '#22c55e',
        'circle-opacity': 0.85,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.6,
      },
    })

    map.addLayer({
      id: LAYER_LABEL,
      type: 'symbol',
      source: SOURCE_ID,
      minzoom: 8,
      layout: {
        'text-field': ['get', 'label'],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-size': 10,
        'text-offset': [0, 1.4],
        'text-anchor': 'top',
      },
      paint: {
        'text-color': '#86efac',
        'text-halo-color': '#0f1117',
        'text-halo-width': 1.5,
      },
    })

    map.on('click', LAYER_CIRCLE, (e) => {
      if (!e.features?.length) return
      e.preventDefault()
      usePluginStore().selectFeature({
        pluginId: 'ev_charging',
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
