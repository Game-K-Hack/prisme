import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { FranceDataPlugin } from '@/plugins/index'

export const usePluginStore = defineStore('plugins', () => {
  // Registre interne : id → plugin
  const registry = ref<Map<string, FranceDataPlugin>>(new Map())

  // Ensemble des ids de plugins actuellement actifs
  const activeIds = ref<Set<string>>(new Set())

  // Référence à l'instance MapLibre (injectée par MapEngine)
  const mapInstance = ref<MapLibreMap | null>(null)

  // ─── Computed ───────────────────────────────────────────────────────────────

  /** Liste ordonnée de tous les plugins enregistrés */
  const plugins = computed<FranceDataPlugin[]>(() =>
    Array.from(registry.value.values())
  )

  /** Retourne true si un plugin est actuellement actif */
  const isActive = (id: string): boolean => activeIds.value.has(id)

  // ─── Actions ────────────────────────────────────────────────────────────────

  /**
   * Enregistre un plugin dans le registre.
   * Idempotent : un plugin déjà enregistré est ignoré.
   */
  function registerPlugin(plugin: FranceDataPlugin): void {
    if (registry.value.has(plugin.id)) {
      console.warn(`[Prisme] Plugin "${plugin.id}" déjà enregistré, ignoré.`)
      return
    }
    registry.value.set(plugin.id, plugin)
  }

  /**
   * Lie l'instance MapLibre au store.
   * Appelé par MapEngine une fois la carte initialisée.
   */
  function setMap(map: MapLibreMap): void {
    mapInstance.value = map
  }

  /**
   * Active un plugin :
   * - Appelle plugin.setup() avec la carte et le store
   * - Ajoute l'id à activeIds
   */
  function activatePlugin(id: string): void {
    const plugin = registry.value.get(id)
    if (!plugin) {
      console.error(`[Prisme] Plugin "${id}" introuvable dans le registre.`)
      return
    }
    if (activeIds.value.has(id)) return

    const map = mapInstance.value
    if (!map) {
      console.error('[Prisme] Carte non initialisée, impossible d\'activer le plugin.')
      return
    }

    try {
      plugin.setup(map, usePluginStore())
      activeIds.value.add(id)
    } catch (err) {
      console.error(`[Prisme] Erreur setup() du plugin "${id}":`, err)
    }
  }

  /**
   * Désactive un plugin :
   * - Appelle plugin.teardown() si défini
   * - Retire l'id de activeIds
   */
  function deactivatePlugin(id: string): void {
    const plugin = registry.value.get(id)
    if (!plugin || !activeIds.value.has(id)) return

    const map = mapInstance.value
    if (map && plugin.teardown) {
      try {
        plugin.teardown(map, usePluginStore())
      } catch (err) {
        console.error(`[Prisme] Erreur teardown() du plugin "${id}":`, err)
      }
    }

    activeIds.value.delete(id)
  }

  /**
   * Bascule l'état d'un plugin (on ↔ off).
   */
  function togglePlugin(id: string): void {
    if (activeIds.value.has(id)) {
      deactivatePlugin(id)
    } else {
      activatePlugin(id)
    }
  }

  return {
    // State
    registry,
    activeIds,
    mapInstance,
    // Computed
    plugins,
    // Methods
    isActive,
    setMap,
    registerPlugin,
    activatePlugin,
    deactivatePlugin,
    togglePlugin,
  }
})
