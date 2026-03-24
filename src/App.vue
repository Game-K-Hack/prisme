<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  ChevronLeft, ChevronRight,
  Map as MapIcon, Layers, CircleDot, X, Fuel,
  Search, Settings2, Loader2, Trash2,
  Zap, SlidersHorizontal,
} from 'lucide-vue-next'
import * as LucideIcons from 'lucide-vue-next'
import type { Component } from 'vue'
import MapEngine from '@/components/MapEngine.vue'
import SettingsModal from '@/components/SettingsModal.vue'
import PluginsModal from '@/components/PluginsModal.vue'
import { usePluginStore, QUICK_FILTERS, MAP_LAYER_CONTROLS } from '@/store/pluginStore'
import { useSettingsStore } from '@/store/settingsStore'
import { PLUGIN_CATALOG } from '@/plugins/registry'

const pluginStore = usePluginStore()
const settings = useSettingsStore()

onMounted(() => {
  // Restaurer les plugins installés depuis localStorage, ou installer tous par défaut
  const savedIds = pluginStore.getInstalledIds()
  if (savedIds.length > 0) {
    for (const plugin of PLUGIN_CATALOG) {
      if (savedIds.includes(plugin.id)) pluginStore.registerPlugin(plugin)
    }
  } else {
    // Premier lancement : installer tous les plugins
    for (const plugin of PLUGIN_CATALOG) {
      pluginStore.registerPlugin(plugin)
    }
  }
})

const sidebarOpen = ref(true)
const toggleSidebar = () => { sidebarOpen.value = !sidebarOpen.value }
const showSettings = ref(false)
const showPlugins = ref(false)

// ─── Recherche POI ───────────────────────────────────────────────────────────

const searchInput = ref('')
const showSuggestions = ref(false)

const activeGroup = ref<string | null>(null)

const filteredCategories = computed(() => {
  const q = searchInput.value.toLowerCase().trim()
  if (!q) return []
  return pluginStore.poiCategories.filter(c => c.toLowerCase().includes(q))
})

function submitSearch(): void {
  if (!searchInput.value.trim()) return
  pluginStore.searchPOI(searchInput.value.trim())
  searchInput.value = ''
  showSuggestions.value = false
}

function pickCategory(cat: string): void {
  pluginStore.searchPOI(cat)
  searchInput.value = ''
  showSuggestions.value = false
}

function clearAllSearches(): void {
  searchInput.value = ''
  pluginStore.clearPOI()
}

// ─── Détail carburant ────────────────────────────────────────────────────────

const fuelDetail = computed(() => {
  const f = pluginStore.selectedFeature
  if (!f || f.pluginId !== 'fuel') return null
  const p = f.properties
  return {
    name: String(p['name'] ?? ''),
    city: String(p['city'] ?? ''),
    brand: String(p['brand'] ?? ''),
    price_sp95: Number(p['price_sp95']),
    price_diesel: Number(p['price_diesel']),
    color: String(p['color'] ?? '#f97316'),
  }
})

function resolveIcon(name: string): Component {
  return (LucideIcons as unknown as Record<string, Component>)[name] ?? CircleDot
}

// Exposer les constantes au template
const quickFilters = QUICK_FILTERS
const mapLayerControls = MAP_LAYER_CONTROLS
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-surface font-sans">

    <!-- ═══ SIDEBAR GAUCHE ══════════════════════════════════════════════════ -->
    <aside
      class="relative flex flex-col flex-shrink-0 bg-surface-raised border-r border-surface-border
             transition-all duration-300 ease-in-out overflow-hidden z-20"
      :style="{ width: sidebarOpen ? settings.sidebarWidth + 'px' : '3.5rem' }"
    >
      <!-- En-tête -->
      <div class="flex items-center h-14 px-3 border-b border-surface-border flex-shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <div
            class="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
            :style="`background-color:${settings.accent600}`"
          >
            <MapIcon class="w-4 h-4 text-white" />
          </div>
          <Transition name="fade">
            <span v-if="sidebarOpen" class="text-sm font-semibold text-slate-100 tracking-wide truncate">
              Prisme
            </span>
          </Transition>
        </div>
        <!-- Bouton paramètres -->
        <Transition name="fade">
          <button
            v-if="sidebarOpen"
            @click="showSettings = true"
            title="Paramètres"
            class="ml-auto flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center
                   text-slate-500 hover:text-slate-200 hover:bg-surface-overlay transition-colors"
          >
            <Settings2 class="w-3.5 h-3.5" />
          </button>
        </Transition>
      </div>

      <!-- Bouton toggle -->
      <button
        @click="toggleSidebar"
        :title="sidebarOpen ? 'Réduire' : 'Agrandir'"
        class="absolute top-4 -right-3.5 z-50 w-7 h-7 rounded-full
               bg-surface-raised border border-surface-border
               flex items-center justify-center
               text-slate-400 hover:text-slate-100 hover:bg-surface-overlay
               transition-colors shadow-lg"
      >
        <ChevronLeft v-if="sidebarOpen" class="w-3.5 h-3.5" />
        <ChevronRight v-else class="w-3.5 h-3.5" />
      </button>

      <!-- Contenu scrollable -->
      <div class="flex-1 overflow-y-auto py-3">

        <!-- ── Section : Calques ── -->
        <div class="flex items-center gap-2 px-3 mb-2">
          <Layers class="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <Transition name="fade">
            <span v-if="sidebarOpen" class="text-[10px] font-semibold uppercase tracking-widest text-slate-500 flex-1">
              Calques
            </span>
          </Transition>
          <Transition name="fade">
            <button
              v-if="sidebarOpen"
              @click="showPlugins = true"
              class="text-[10px] text-slate-600 hover:text-slate-300 transition-colors"
            >Gérer</button>
          </Transition>
        </div>

        <ul class="space-y-0.5 px-1.5">
          <li v-for="plugin in pluginStore.plugins" :key="plugin.id">
            <button
              @click="pluginStore.togglePlugin(plugin.id)"
              :title="!sidebarOpen
                ? `${plugin.label}${plugin.description ? ' — ' + plugin.description : ''}`
                : plugin.description"
              class="w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-150"
              :class="pluginStore.isActive(plugin.id)
                ? 'bg-surface-overlay text-slate-100'
                : 'text-slate-400 hover:bg-surface-overlay hover:text-slate-200'"
            >
              <span
                class="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
                :style="pluginStore.isActive(plugin.id)
                  ? `background-color:${plugin.color}22;color:${plugin.color}`
                  : ''"
              >
                <component :is="resolveIcon(plugin.icon)" class="w-3.5 h-3.5" />
              </span>

              <Transition name="fade">
                <div v-if="sidebarOpen" class="flex-1 min-w-0 text-left">
                  <p class="text-xs font-medium truncate leading-tight">{{ plugin.label }}</p>
                  <p v-if="plugin.description" class="text-[10px] text-slate-500 truncate leading-tight mt-0.5">
                    {{ plugin.description }}
                  </p>
                </div>
              </Transition>

              <Transition name="fade">
                <span
                  v-if="sidebarOpen"
                  class="flex-shrink-0 inline-flex items-center w-9 h-5 rounded-full p-0.5 transition-colors duration-200"
                  :style="pluginStore.isActive(plugin.id)
                    ? `background-color:${plugin.color}`
                    : 'background-color:#2a3045'"
                >
                  <span
                    class="block w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200"
                    :class="pluginStore.isActive(plugin.id) ? 'translate-x-4' : 'translate-x-0'"
                  />
                </span>
              </Transition>
            </button>
          </li>
        </ul>

        <!-- ══════════════════════════════════════════════════════════════════ -->
        <!-- ── Section : Filtres rapides ── -->
        <div class="mt-5">
          <div class="flex items-center gap-2 px-3 mb-2">
            <Zap class="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <Transition name="fade">
              <span v-if="sidebarOpen" class="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Filtres rapides
              </span>
            </Transition>
          </div>

          <Transition name="fade">
            <div v-if="sidebarOpen" class="px-3 grid grid-cols-2 gap-1">
              <button
                v-for="qf in quickFilters"
                :key="qf.id"
                @click="pluginStore.toggleQuickFilter(qf.id)"
                class="flex items-center gap-1.5 px-2 py-1.5 rounded-md border
                       text-[10px] transition-all duration-150 text-left truncate"
                :class="pluginStore.isQuickFilterActive(qf.id)
                  ? 'border-current bg-current/10 text-slate-100'
                  : 'border-surface-border text-slate-500 hover:text-slate-300 hover:border-slate-500'"
                :style="pluginStore.isQuickFilterActive(qf.id)
                  ? `color:${qf.color};border-color:${qf.color}40;background-color:${qf.color}15`
                  : ''"
              >
                <component :is="resolveIcon(qf.icon)" class="w-3 h-3 flex-shrink-0" />
                <span class="truncate">{{ qf.label }}</span>
              </button>
            </div>
          </Transition>

          <!-- Sidebar réduite : icône seule -->
          <div v-if="!sidebarOpen" class="px-1.5 space-y-0.5">
            <button
              v-for="qf in quickFilters.slice(0, 4)"
              :key="qf.id"
              @click="pluginStore.toggleQuickFilter(qf.id)"
              :title="qf.label"
              class="w-full flex items-center justify-center py-1.5 rounded-md text-sm transition-colors"
              :class="pluginStore.isQuickFilterActive(qf.id) ? '' : 'opacity-50 hover:opacity-100'"
            ><component :is="resolveIcon(qf.icon)" class="w-3.5 h-3.5" /></button>
          </div>
        </div>

        <!-- ══════════════════════════════════════════════════════════════════ -->
        <!-- ── Section : Recherche ── -->
        <div class="mt-5">
          <div class="flex items-center gap-2 px-3 mb-2">
            <Search class="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <Transition name="fade">
              <span v-if="sidebarOpen" class="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Recherche OSM
              </span>
            </Transition>
          </div>

          <Transition name="fade">
            <div v-if="sidebarOpen" class="px-3">
              <div class="relative">
                <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                <input
                  v-model="searchInput"
                  @focus="showSuggestions = true"
                  @keydown.enter="submitSearch"
                  placeholder="Lieu, marque, wheelchair:yes…"
                  class="w-full pl-8 pr-8 py-2 bg-surface border border-surface-border rounded-lg
                         text-xs text-slate-200 placeholder-slate-600
                         focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  v-if="searchInput"
                  @click="searchInput = ''"
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X class="w-3.5 h-3.5" />
                </button>
              </div>

              <!-- Autocomplétion texte -->
              <div
                v-if="searchInput && showSuggestions && filteredCategories.length > 0"
                class="mt-1.5 flex flex-wrap gap-1"
              >
                <button
                  v-for="cat in filteredCategories.slice(0, 8)"
                  :key="cat"
                  @click="pickCategory(cat)"
                  class="px-2 py-1 bg-surface border border-surface-border rounded-md
                         text-[10px] text-slate-400 hover:text-slate-200 hover:border-violet-500
                         transition-colors"
                >{{ cat }}</button>
              </div>

              <!-- Groupes de catégories -->
              <div v-if="!searchInput && showSuggestions" class="mt-2 space-y-1 max-h-48 overflow-y-auto">
                <div v-for="[group, cats] in pluginStore.poiGroups" :key="group">
                  <button
                    @click="activeGroup = activeGroup === group ? null : group"
                    class="w-full flex items-center justify-between px-2 py-1.5 rounded-md
                           text-[10px] font-semibold uppercase tracking-wider
                           text-slate-500 hover:text-slate-300 hover:bg-surface-overlay transition-colors"
                  >
                    <span>{{ group }}</span>
                    <ChevronRight
                      class="w-3 h-3 transition-transform duration-150"
                      :class="activeGroup === group ? 'rotate-90' : ''"
                    />
                  </button>
                  <div
                    v-if="activeGroup === group"
                    class="grid grid-cols-2 gap-0.5 mt-0.5 mb-1"
                  >
                    <button
                      v-for="cat in cats"
                      :key="cat.label"
                      @click="pickCategory(cat.label)"
                      class="flex items-center gap-1.5 px-2 py-1.5 rounded-md
                             text-[10px] text-slate-400 hover:text-slate-200 hover:bg-surface-overlay
                             transition-colors text-left truncate"
                    >
                      <component :is="resolveIcon(cat.icon ?? 'CircleDot')" class="w-3 h-3 flex-shrink-0" />
                      <span class="truncate">{{ cat.label }}</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Warning viewport -->
              <div
                v-if="pluginStore.poiWarning"
                class="mt-2 px-2 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-md"
              >
                <p class="text-[10px] text-amber-400 leading-tight">{{ pluginStore.poiWarning }}</p>
              </div>

              <!-- Loading + Annuler -->
              <div v-if="pluginStore.poiLoading" class="flex items-center gap-2 mt-2">
                <Loader2 class="w-3.5 h-3.5 animate-spin text-slate-500" />
                <span class="text-xs text-slate-500 flex-1">Recherche en cours…</span>
                <button
                  @click="pluginStore.cancelPOISearch()"
                  class="text-[10px] px-2 py-0.5 rounded-md
                         bg-red-500/10 border border-red-500/30
                         text-red-400 hover:text-red-300 hover:bg-red-500/20
                         transition-colors"
                >Annuler</button>
              </div>

              <!-- Recherches actives -->
              <div v-if="pluginStore.poiSearches.length > 0" class="mt-2 space-y-1">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Actives</span>
                  <button
                    v-if="pluginStore.poiSearches.length > 1"
                    @click="clearAllSearches"
                    class="text-[10px] text-slate-500 hover:text-red-400 transition-colors"
                  >Tout effacer</button>
                </div>
                <div
                  v-for="search in pluginStore.poiSearches"
                  :key="search.id"
                  class="flex items-center gap-2 px-2 py-1.5 bg-surface rounded-lg group"
                >
                  <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="`background-color:${search.color}`" />
                  <span class="text-[10px] text-slate-300 flex-1 truncate flex items-center gap-1.5">
                    <component :is="resolveIcon(search.icon)" class="w-3 h-3 flex-shrink-0" />
                    {{ search.query }}
                  </span>
                  <span class="text-[10px] text-slate-500 flex-shrink-0">{{ search.count }}</span>
                  <button
                    @click="pluginStore.clearPOI(search.id)"
                    class="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0
                           opacity-0 group-hover:opacity-100"
                  >
                    <X class="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- ══════════════════════════════════════════════════════════════════ -->
        <!-- ── Section : Affichage carte ── -->
        <div class="mt-5">
          <div class="flex items-center gap-2 px-3 mb-2">
            <SlidersHorizontal class="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <Transition name="fade">
              <span v-if="sidebarOpen" class="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Affichage
              </span>
            </Transition>
          </div>

          <div class="px-1.5 space-y-0.5">
            <button
              v-for="ctrl in mapLayerControls"
              :key="ctrl.id"
              @click="pluginStore.toggleMapLayer(ctrl.id)"
              :title="!sidebarOpen ? ctrl.label : undefined"
              class="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg transition-all duration-150"
              :class="pluginStore.mapLayerVisibility[ctrl.id]
                ? 'bg-surface-overlay text-slate-100'
                : 'text-slate-500 hover:bg-surface-overlay hover:text-slate-300'"
            >
              <span class="w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs">
                <component :is="resolveIcon(ctrl.icon)" class="w-3.5 h-3.5" />
              </span>
              <Transition name="fade">
                <p v-if="sidebarOpen" class="text-[10px] font-medium truncate flex-1">{{ ctrl.label }}</p>
              </Transition>
              <Transition name="fade">
                <span
                  v-if="sidebarOpen"
                  class="ml-auto flex-shrink-0 inline-flex items-center w-7 h-4 rounded-full p-0.5 transition-colors duration-200"
                  :style="pluginStore.mapLayerVisibility[ctrl.id]
                    ? 'background-color:var(--accent-500)'
                    : 'background-color:#2a3045'"
                >
                  <span
                    class="block w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200"
                    :class="pluginStore.mapLayerVisibility[ctrl.id] ? 'translate-x-3' : 'translate-x-0'"
                  />
                </span>
              </Transition>
            </button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div v-if="settings.showFooter" class="border-t border-surface-border px-3 py-2.5 flex items-center gap-2 flex-shrink-0">
        <span
          class="w-1.5 h-1.5 rounded-full flex-shrink-0"
          :class="pluginStore.activeIds.size > 0 ? 'bg-emerald-500' : 'bg-slate-600'"
        />
        <Transition name="fade">
          <span v-if="sidebarOpen" class="text-xs text-slate-500">
            <template v-if="pluginStore.activeIds.size > 0">
              {{ pluginStore.activeIds.size }}
              calque{{ pluginStore.activeIds.size > 1 ? 's' : '' }}
              actif{{ pluginStore.activeIds.size > 1 ? 's' : '' }}
            </template>
            <template v-else>Aucun calque actif</template>
          </span>
        </Transition>
      </div>
    </aside>

    <!-- ═══ CARTE (centre) ═══════════════════════════════════════════════════ -->
    <main class="flex-1 relative min-h-0 min-w-0">
      <MapEngine />
    </main>

    <!-- ═══ PANNEAU DÉTAIL (droite, overlay sur la carte) ════════════════════ -->
    <aside
      class="absolute top-0 right-0 h-full z-30 bg-surface-raised border-l border-surface-border
             flex flex-col overflow-hidden transition-transform duration-300 ease-in-out w-80"
      :class="fuelDetail ? 'translate-x-0' : 'translate-x-full'"
    >
      <div v-if="fuelDetail" class="w-80 flex flex-col h-full">
        <!-- En-tête -->
        <div class="flex items-center gap-3 px-4 py-4 border-b border-surface-border flex-shrink-0">
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-lg"
            :style="`background-color:${fuelDetail.color}22`"
          ><Fuel class="w-5 h-5" :style="`color:${fuelDetail.color}`" /></div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-slate-100 truncate">{{ fuelDetail.name }}</p>
            <p class="text-xs text-slate-500 mt-0.5">{{ fuelDetail.brand }} · {{ fuelDetail.city }}</p>
          </div>
          <button
            @click="pluginStore.selectFeature(null)"
            class="w-7 h-7 flex items-center justify-center rounded-md
                   text-slate-500 hover:text-slate-200 hover:bg-surface-overlay
                   transition-colors flex-shrink-0"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Prix -->
        <div class="p-4 space-y-3 flex-1 overflow-y-auto">
          <p class="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Tarifs</p>

          <div class="flex items-center justify-between bg-surface rounded-lg px-4 py-3">
            <div>
              <p class="text-xs font-medium text-slate-300">Sans Plomb 95</p>
              <p class="text-[10px] text-slate-500 mt-0.5">SP95</p>
            </div>
            <div class="text-right">
              <p class="text-2xl font-bold leading-none" :style="`color:${fuelDetail.color}`">
                {{ fuelDetail.price_sp95.toFixed(3) }}
              </p>
              <p class="text-[10px] text-slate-500 mt-1">€ / litre</p>
            </div>
          </div>

          <div class="flex items-center justify-between bg-surface rounded-lg px-4 py-3">
            <div>
              <p class="text-xs font-medium text-slate-300">Gazole</p>
              <p class="text-[10px] text-slate-500 mt-0.5">Diesel</p>
            </div>
            <div class="text-right">
              <p class="text-2xl font-bold text-slate-300 leading-none">
                {{ fuelDetail.price_diesel.toFixed(3) }}
              </p>
              <p class="text-[10px] text-slate-500 mt-1">€ / litre</p>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- ═══ SETTINGS MODAL ═══════════════════════════════════════════════════ -->
    <SettingsModal :open="showSettings" @close="showSettings = false" />
    <PluginsModal :open="showPlugins" @close="showPlugins = false" />

  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateX(-4px);
}
</style>
