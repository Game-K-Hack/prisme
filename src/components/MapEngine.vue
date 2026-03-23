<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import maplibregl, { Map, NavigationControl, ScaleControl } from 'maplibre-gl'
import { usePluginStore } from '@/store/pluginStore'

// Expose maplibregl sur window pour les popups dans les plugins
;(window as typeof window & { maplibregl: typeof maplibregl }).maplibregl = maplibregl

const mapContainer = ref<HTMLDivElement | null>(null)
let map: Map | null = null

const pluginStore = usePluginStore()

// Style vectoriel public (OpenFreeMap — aucune clé API requise)
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

// Centrage initial sur la France métropolitaine
const FRANCE_CENTER: [number, number] = [2.35, 46.8]
const INITIAL_ZOOM = 5.5

onMounted(() => {
  if (!mapContainer.value) return

  map = new Map({
    container: mapContainer.value,
    style: MAP_STYLE,
    center: FRANCE_CENTER,
    zoom: INITIAL_ZOOM,
    minZoom: 3,
    maxZoom: 18,
    // Limite les tuiles à la zone visible pour économiser de la bande passante
    maxBounds: [
      [-10, 35],  // SW : Atlantique + Méditerranée
      [20, 58],   // NE : Europe du Nord-Est
    ],
    attributionControl: false,
  })

  // Contrôles natifs MapLibre
  map.addControl(new NavigationControl({ visualizePitch: true }), 'bottom-right')
  map.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left')
  map.addControl(
    new maplibregl.AttributionControl({ compact: true }),
    'bottom-right'
  )

  map.on('load', () => {
    if (!map) return
    // Lie la carte au store pour que les plugins puissent y accéder
    pluginStore.setMap(map)
  })
})

onBeforeUnmount(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <div ref="mapContainer" class="w-full h-full" />
</template>
