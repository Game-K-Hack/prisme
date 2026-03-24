<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import maplibregl, { Map, NavigationControl, ScaleControl } from 'maplibre-gl'
import { usePluginStore } from '@/store/pluginStore'
import { useSettingsStore } from '@/store/settingsStore'

const mapContainer = ref<HTMLDivElement | null>(null)
let map: Map | null = null
const pluginStore = usePluginStore()
const settings = useSettingsStore()

const INITIAL_CENTER: [number, number] = [2.35, 46.8]
const INITIAL_ZOOM = 5.5

onMounted(() => {
  if (!mapContainer.value) return

  map = new Map({
    container: mapContainer.value,
    style: settings.mapStyleUrl,
    center: INITIAL_CENTER,
    zoom: INITIAL_ZOOM,
    minZoom: 1,
    maxZoom: 18,
    renderWorldCopies: false,
    attributionControl: false,
  })

  map.addControl(new NavigationControl({ visualizePitch: true }), 'bottom-right')
  map.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left')
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

  map.on('load', () => {
    if (!map) return
    pluginStore.setMap(map)
  })
})

// Changement de style → recharge la carte
watch(() => settings.mapStyleUrl, (newUrl) => {
  if (!map) return
  // Sauvegarder le centre et zoom actuels
  const center = map.getCenter()
  const zoom = map.getZoom()
  // Nettoyer les plugins/POI actifs (les layers seront perdues au changement de style)
  pluginStore.clearPOI()
  for (const id of [...pluginStore.activeIds]) {
    pluginStore.deactivatePlugin(id)
  }
  map.setStyle(newUrl)
  map.once('styledata', () => {
    map!.setCenter(center)
    map!.setZoom(zoom)
  })
})

onBeforeUnmount(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <div class="absolute inset-0">
    <div ref="mapContainer" class="w-full h-full" />
  </div>
</template>
