import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { FranceDataPlugin } from '@/plugins/index'

export interface SelectedFeature {
  pluginId: string
  properties: Record<string, unknown>
}

export const usePluginStore = defineStore('plugins', () => {
  const registry = ref<Map<string, FranceDataPlugin>>(new Map())
  const activeIds = ref<Set<string>>(new Set())
  const mapInstance = ref<MapLibreMap | null>(null)
  const selectedFeature = ref<SelectedFeature | null>(null)

  const plugins = computed<FranceDataPlugin[]>(() =>
    Array.from(registry.value.values())
  )

  const isActive = (id: string): boolean => activeIds.value.has(id)

  function registerPlugin(plugin: FranceDataPlugin): void {
    if (registry.value.has(plugin.id)) return
    registry.value.set(plugin.id, plugin)
  }

  function setMap(map: MapLibreMap): void {
    mapInstance.value = map
  }

  function selectFeature(feature: SelectedFeature | null): void {
    selectedFeature.value = feature
  }

  function activatePlugin(id: string): void {
    const plugin = registry.value.get(id)
    if (!plugin || activeIds.value.has(id)) return
    const map = mapInstance.value
    if (!map) return
    try {
      plugin.setup(map, usePluginStore())
      activeIds.value.add(id)
    } catch (err) {
      console.error(`[Prisme] Erreur setup() plugin "${id}":`, err)
    }
  }

  function deactivatePlugin(id: string): void {
    const plugin = registry.value.get(id)
    if (!plugin || !activeIds.value.has(id)) return
    const map = mapInstance.value
    if (map && plugin.teardown) {
      try {
        plugin.teardown(map, usePluginStore())
      } catch (err) {
        console.error(`[Prisme] Erreur teardown() plugin "${id}":`, err)
      }
    }
    if (selectedFeature.value?.pluginId === id) selectedFeature.value = null
    activeIds.value.delete(id)
  }

  function togglePlugin(id: string): void {
    activeIds.value.has(id) ? deactivatePlugin(id) : activatePlugin(id)
  }

  return {
    registry, activeIds, mapInstance, selectedFeature,
    plugins, isActive,
    setMap, selectFeature, registerPlugin,
    activatePlugin, deactivatePlugin, togglePlugin,
  }
})
