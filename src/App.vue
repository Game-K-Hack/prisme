<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  ChevronLeft, ChevronRight,
  Map as MapIcon, Layers, X, Fuel,
  Search, Settings2, Loader2,
  Zap, SlidersHorizontal,
} from 'lucide-vue-next'
import MapEngine from '@/components/MapEngine.vue'
import SettingsModal from '@/components/SettingsModal.vue'
import PluginsModal from '@/components/PluginsModal.vue'
import PluginIcon from '@/components/PluginIcon.vue'
import { usePluginStore, MAP_LAYER_CONTROLS } from '@/store/pluginStore'
import { useSettingsStore } from '@/store/settingsStore'
import { PLUGIN_CATALOG } from '@/plugins/registry'
import { loadStoredPlugins, compileExternalPlugin } from '@/plugins/externalLoader'
import { loadBundledPlugins } from '@/plugins/bundledLoader'

const pluginStore = usePluginStore()
const settings = useSettingsStore()

onMounted(async () => {
  // 1. Restaurer les plugins built-in (TypeScript)
  const savedIds = pluginStore.getInstalledIds()
  if (savedIds.length > 0) {
    for (const plugin of PLUGIN_CATALOG) {
      if (savedIds.includes(plugin.id)) pluginStore.registerPlugin(plugin)
    }
  } else {
    for (const plugin of PLUGIN_CATALOG) {
      pluginStore.registerPlugin(plugin)
    }
  }

  // 2. Restaurer les plugins externes depuis localStorage
  for (const stored of loadStoredPlugins()) {
    try {
      const plugin = compileExternalPlugin(stored.manifest, stored.jsCode)
      pluginStore.registerPlugin(plugin, true)
    } catch (err) {
      console.error(`[Prisme] Plugin externe "${stored.manifest.id}" invalide:`, err)
    }
  }

  // 3. Charger les plugins bundlés (.prm dans public/plugins/)
  await loadBundledPlugins()
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

interface FuelPrice { label: string; sub: string; value: number; accent: boolean; updatedAt: number | null }

interface FuelStationStat {
  price: number
  ville: string
  adresse: string
  dept: string
  date: number | null
}

const FUEL_TYPE_LABELS: Record<string, { label: string; sub: string }> = {
  e10:    { label: 'Sans Plomb 95-E10', sub: 'E10' },
  sp95:   { label: 'Sans Plomb 95',     sub: 'SP95' },
  sp98:   { label: 'Sans Plomb 98',     sub: 'SP98' },
  gazole: { label: 'Gazole',            sub: 'Diesel' },
  e85:    { label: 'Superéthanol',      sub: 'E85' },
  gplc:   { label: 'GPL',              sub: 'GPLc' },
  best:   { label: 'Meilleur prix',     sub: 'Auto' },
}

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(ts))
}

const fuelDetail = computed(() => {
  const f = pluginStore.selectedFeature
  if (!f || f.pluginId !== 'fuel') return null
  const p = f.properties

  const ville   = String(p['ville']        ?? '')
  const adresse = String(p['adresse']      ?? '')
  const cp      = String(p['cp']           ?? '')
  const dept    = String(p['departement']  ?? '')
  const region  = String(p['region']       ?? '')
  const automate = p['automate'] === true || p['automate'] === 'true'

  const prices: FuelPrice[] = []
  const add = (label: string, sub: string, key: string, accent: boolean) => {
    const v = Number(p[key])
    if (v && v > 0) {
      const dateRaw = p[`d_${key}`]
      const updatedAt = dateRaw ? Number(dateRaw) : null
      prices.push({ label, sub, value: v, accent, updatedAt })
    }
  }
  add('Sans Plomb 95-E10', 'E10',    'e10',    true)
  add('Sans Plomb 95',     'SP95',   'sp95',   false)
  add('Sans Plomb 98',     'SP98',   'sp98',   false)
  add('Gazole',            'Diesel', 'gazole', false)
  add('Superéthanol',      'E85',    'e85',    false)
  add('GPL',               'GPLc',   'gplc',   false)

  const servicesRaw = String(p['services'] ?? '')
  const services = servicesRaw ? servicesRaw.split(',').map((s: string) => s.trim()).filter(Boolean) : []

  // Stats globales stockées par le plugin
  const rawStats = pluginStore.getPluginData('fuel', 'stats') as {
    count: number; avg: number;
    latestDataDate: number | null;
    min: FuelStationStat | null;
    max: FuelStationStat | null;
  } | null

  const activeFuelType = String(pluginStore.getPluginData('fuel', 'fuelType') ?? 'best')
  const fuelTypeInfo = FUEL_TYPE_LABELS[activeFuelType] ?? FUEL_TYPE_LABELS['best']
  const fetchedAt = pluginStore.getPluginData('fuel', 'fetchedAt') as number | null

  return {
    ville, adresse, cp, dept, region, automate,
    prices, services,
    stats: rawStats,
    fuelTypeInfo,
    fetchedAt,
    fetchedAtLabel: fetchedAt ? formatDate(fetchedAt) : null,
  }
})

// Exposer les constantes au template
const quickFilters = computed(() => settings.visibleQuickFilters)
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
      <div class="flex items-center border-b border-surface-border flex-shrink-0"
           :class="sidebarOpen ? 'h-24 px-3 gap-3' : 'h-14 justify-center'">
        <img
          src="/logo.png" alt="Prisme"
          class="rounded-lg object-cover flex-shrink-0"
          :class="sidebarOpen ? 'w-16 h-16' : 'w-9 h-9'"
        />
        <template v-if="sidebarOpen">
          <span class="text-7xl font-light text-slate-100 truncate flex-1 font-[title]">Prisme</span>
          <button
            @click="showSettings = true"
            title="Paramètres"
            class="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center
                   text-slate-500 hover:text-slate-200 hover:bg-surface-overlay transition-colors"
          >
            <Settings2 class="w-4 h-4" />
          </button>
        </template>
      </div>

      <!-- Contenu scrollable -->
      <div class="flex-1 overflow-y-auto py-3">

        <!-- ── Section : Calques ── -->
        <div class="sidebar-section-header" :class="sidebarOpen ? 'px-3' : 'justify-center'">
          <Layers class="w-4 h-4 text-slate-500 flex-shrink-0" />
          <template v-if="sidebarOpen">
            <span class="text-[11px] font-semibold uppercase tracking-widest text-slate-500 flex-1">
              Calques
            </span>
            <button
              @click="showPlugins = true"
              class="text-xs text-slate-600 hover:text-slate-300 transition-colors"
            >Gérer</button>
          </template>
        </div>

        <ul class="space-y-0.5" :class="sidebarOpen ? 'px-1.5' : 'px-1'">
          <li v-for="plugin in pluginStore.plugins" :key="plugin.id">
            <button
              @click="pluginStore.togglePlugin(plugin.id)"
              :title="!sidebarOpen
                ? `${plugin.label}${plugin.description ? ' — ' + plugin.description : ''}`
                : plugin.description"
              class="w-full flex items-center rounded-lg transition-all duration-150"
              :class="[
                sidebarOpen ? 'gap-3 px-2 py-2' : 'justify-center py-2',
                pluginStore.isActive(plugin.id)
                  ? 'bg-surface-overlay text-slate-100'
                  : 'text-slate-400 hover:bg-surface-overlay hover:text-slate-200',
              ]"
            >
              <span
                class="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
                :style="pluginStore.isActive(plugin.id)
                  ? `background-color:${plugin.color}22;color:${plugin.color}`
                  : ''"
              >
                <PluginIcon :icon="plugin.icon" class="w-4 h-4" />
              </span>

              <Transition name="fade">
                <div v-if="sidebarOpen" class="flex-1 min-w-0 text-left">
                  <p class="text-sm font-medium truncate leading-tight">{{ plugin.label }}</p>
                  <p v-if="plugin.description" class="text-xs text-slate-500 truncate leading-tight mt-0.5">
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
          <div class="sidebar-section-header" :class="sidebarOpen ? 'px-3' : 'justify-center'">
            <Zap class="w-4 h-4 text-slate-500 flex-shrink-0" />
            <span v-if="sidebarOpen" class="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Filtres rapides
            </span>
          </div>

          <!-- Ouvert : grille avec labels -->
          <div v-if="sidebarOpen" class="px-3 grid grid-cols-2 gap-1">
            <button
              v-for="qf in quickFilters"
              :key="qf.id"
              @click="pluginStore.toggleQuickFilter(qf.id)"
              class="flex items-center gap-1.5 px-2 py-1.5 rounded-md border
                     text-xs transition-all duration-150 text-left truncate"
              :class="pluginStore.isQuickFilterActive(qf.id)
                ? 'border-current bg-current/10 text-slate-100'
                : 'border-surface-border text-slate-500 hover:text-slate-300 hover:border-slate-500'"
              :style="pluginStore.isQuickFilterActive(qf.id)
                ? `color:${qf.color};border-color:${qf.color}40;background-color:${qf.color}15`
                : ''"
            >
              <PluginIcon :icon="qf.icon" class="w-3 h-3 flex-shrink-0" />
              <span class="truncate">{{ qf.label }}</span>
            </button>
          </div>

          <!-- Replié : icônes centrées -->
          <div v-else class="px-1 space-y-0.5">
            <button
              v-for="qf in quickFilters.slice(0, 6)"
              :key="qf.id"
              @click="pluginStore.toggleQuickFilter(qf.id)"
              :title="qf.label"
              class="w-full h-8 flex items-center justify-center rounded-lg transition-colors"
              :class="pluginStore.isQuickFilterActive(qf.id)
                ? 'bg-surface-overlay text-slate-100'
                : 'text-slate-500 hover:bg-surface-overlay hover:text-slate-300'"
              :style="pluginStore.isQuickFilterActive(qf.id) ? `color:${qf.color}` : ''"
            >
              <PluginIcon :icon="qf.icon" class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- ══════════════════════════════════════════════════════════════════ -->
        <!-- ── Section : Recherche ── -->
        <div class="mt-5">
          <div class="sidebar-section-header" :class="sidebarOpen ? 'px-3' : 'justify-center'">
            <Search class="w-4 h-4 text-slate-500 flex-shrink-0" />
            <span v-if="sidebarOpen" class="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Recherche OSM
            </span>
          </div>

          <Transition name="fade">
            <div v-if="sidebarOpen" class="px-3">
              <div class="relative">
                <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                <input
                  v-model="searchInput"
                  @focus="showSuggestions = true"
                  @keydown.enter="submitSearch"
                  placeholder="Lieu, marque, fuel:diesel=yes…"
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
                         text-xs text-slate-400 hover:text-slate-200 hover:border-violet-500
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
                             text-xs text-slate-400 hover:text-slate-200 hover:bg-surface-overlay
                             transition-colors text-left truncate"
                    >
                      <PluginIcon :icon="cat.icon ?? 'CircleDot'" class="w-3 h-3 flex-shrink-0" />
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
                <p class="text-xs text-amber-400 leading-tight">{{ pluginStore.poiWarning }}</p>
              </div>

              <!-- Loading + Annuler -->
              <div v-if="pluginStore.poiLoading" class="flex items-center gap-2 mt-2">
                <Loader2 class="w-3.5 h-3.5 animate-spin text-slate-500" />
                <span class="text-xs text-slate-500 flex-1">Recherche en cours…</span>
                <button
                  @click="pluginStore.cancelPOISearch()"
                  class="text-xs px-2 py-0.5 rounded-md
                         bg-red-500/10 border border-red-500/30
                         text-red-400 hover:text-red-300 hover:bg-red-500/20
                         transition-colors"
                >Annuler</button>
              </div>

              <!-- Recherches actives -->
              <div v-if="pluginStore.poiSearches.length > 0" class="mt-2 space-y-1">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Actives</span>
                  <button
                    v-if="pluginStore.poiSearches.length > 1"
                    @click="clearAllSearches"
                    class="text-xs text-slate-500 hover:text-red-400 transition-colors"
                  >Tout effacer</button>
                </div>
                <div
                  v-for="search in pluginStore.poiSearches"
                  :key="search.id"
                  class="flex items-center gap-2 px-2 py-1.5 bg-surface rounded-lg group"
                >
                  <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="`background-color:${search.color}`" />
                  <span class="text-xs text-slate-300 flex-1 truncate flex items-center gap-1.5">
                    <PluginIcon :icon="search.icon" class="w-3 h-3 flex-shrink-0" />
                    {{ search.query }}
                  </span>
                  <span class="text-xs text-slate-500 flex-shrink-0">{{ search.count }}</span>
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
          <div class="sidebar-section-header" :class="sidebarOpen ? 'px-3' : 'justify-center'">
            <SlidersHorizontal class="w-4 h-4 text-slate-500 flex-shrink-0" />
            <span v-if="sidebarOpen" class="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Affichage
            </span>
          </div>

          <div class="space-y-0.5" :class="sidebarOpen ? 'px-1.5' : 'px-1'">
            <button
              v-for="ctrl in mapLayerControls"
              :key="ctrl.id"
              @click="pluginStore.toggleMapLayer(ctrl.id)"
              :title="!sidebarOpen ? ctrl.label : undefined"
              class="w-full flex items-center rounded-lg transition-all duration-150"
              :class="[
                sidebarOpen ? 'gap-3 px-2 py-1.5' : 'justify-center py-2',
                pluginStore.mapLayerVisibility[ctrl.id]
                  ? 'bg-surface-overlay text-slate-100'
                  : 'text-slate-500 hover:bg-surface-overlay hover:text-slate-300',
              ]"
            >
              <span class="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0">
                <PluginIcon :icon="ctrl.icon" class="w-4 h-4" />
              </span>
              <template v-if="sidebarOpen">
                <p class="text-sm font-medium truncate flex-1">{{ ctrl.label }}</p>
                <span
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
              </template>
            </button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div
        v-if="settings.showFooter"
        class="border-t border-surface-border py-2.5 flex items-center gap-2 flex-shrink-0"
        :class="sidebarOpen ? 'px-3' : 'justify-center'"
      >
        <span
          class="w-2 h-2 rounded-full flex-shrink-0"
          :class="pluginStore.activeIds.size > 0 ? 'bg-emerald-500' : 'bg-slate-600'"
        />
        <span v-if="sidebarOpen" class="text-sm text-slate-500">
          <template v-if="pluginStore.activeIds.size > 0">
            {{ pluginStore.activeIds.size }}
            calque{{ pluginStore.activeIds.size > 1 ? 's' : '' }}
            actif{{ pluginStore.activeIds.size > 1 ? 's' : '' }}
          </template>
          <template v-else>Aucun calque actif</template>
        </span>
      </div>
    </aside>

    <!-- ═══ CARTE (centre) ═══════════════════════════════════════════════════ -->
    <main class="flex-1 relative min-h-0 min-w-0">
      <MapEngine />

      <!-- Bouton toggle sidebar — positionné sur la carte, bord gauche -->
      <button
        @click="toggleSidebar"
        :title="sidebarOpen ? 'Réduire' : 'Agrandir'"
        class="absolute top-4 left-0 -translate-x-1/2 z-30
               w-6 h-6 rounded-full
               bg-surface-raised border border-surface-border
               flex items-center justify-center
               text-slate-400 hover:text-slate-100 hover:bg-surface-overlay
               transition-colors shadow-lg"
      >
        <ChevronLeft v-if="sidebarOpen" class="w-3 h-3" />
        <ChevronRight v-else class="w-3 h-3" />
      </button>
    </main>

    <!-- ═══ PANNEAU DÉTAIL (droite, overlay sur la carte) ════════════════════ -->
    <aside
      class="absolute top-0 right-0 h-full z-30 bg-surface-raised border-l border-surface-border
             flex flex-col overflow-hidden transition-transform duration-300 ease-in-out w-80"
      :class="pluginStore.selectedFeature ? 'translate-x-0' : 'translate-x-full'"
    >
      <div v-if="fuelDetail" class="w-80 flex flex-col h-full">
        <!-- En-tête -->
        <div class="flex items-center gap-3 px-4 py-4 border-b border-surface-border flex-shrink-0">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-500/15">
            <Fuel class="w-5 h-5 text-blue-400" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-base font-semibold text-slate-100 truncate">{{ fuelDetail.ville }}</p>
            <p class="text-sm text-slate-500 mt-0.5 truncate">{{ fuelDetail.adresse }}</p>
            <p class="text-xs text-slate-600 mt-0.5">{{ fuelDetail.cp }} · {{ fuelDetail.dept }}</p>
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

        <!-- Contenu scrollable -->
        <div class="flex-1 overflow-y-auto">

          <!-- Prix -->
          <div class="p-4 space-y-2">
            <p class="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Tarifs disponibles</p>

            <div
              v-for="(price, i) in fuelDetail.prices"
              :key="i"
              class="bg-surface rounded-lg px-4 py-3"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-slate-300">{{ price.label }}</p>
                  <p class="text-xs text-slate-500 mt-0.5">{{ price.sub }}</p>
                </div>
                <div class="text-right">
                  <p
                    class="text-xl font-bold leading-none"
                    :class="price.accent ? 'text-blue-400' : 'text-slate-300'"
                  >
                    {{ price.value.toFixed(3) }}
                  </p>
                  <p class="text-xs text-slate-500 mt-1">€ / litre</p>
                </div>
              </div>
              <!-- Date de mise à jour du prix -->
              <p v-if="price.updatedAt" class="mt-1.5 text-[11px] text-slate-600 flex items-center gap-1">
                <svg class="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                Mis à jour {{ formatDate(price.updatedAt) }}
              </p>
            </div>

            <p v-if="fuelDetail.prices.length === 0" class="text-xs text-slate-600 text-center py-4">
              Aucun prix disponible
            </p>
          </div>

          <!-- Infos -->
          <div class="px-4 pb-3">
            <p class="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Informations</p>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <span
                  class="text-xs px-2 py-1 rounded-md"
                  :class="fuelDetail.automate
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-slate-700/50 text-slate-500'"
                >{{ fuelDetail.automate ? 'Automate 24/24' : 'Horaires limités' }}</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-xs text-slate-500 flex-shrink-0 mt-0.5 w-14">Région</span>
                <span class="text-xs text-slate-300">{{ fuelDetail.region }}</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-xs text-slate-500 flex-shrink-0 mt-0.5 w-14">Dept.</span>
                <span class="text-xs text-slate-300">{{ fuelDetail.dept }}</span>
              </div>
            </div>
          </div>

          <!-- Services -->
          <div v-if="fuelDetail.services.length > 0" class="px-4 pb-4">
            <p class="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
              Services ({{ fuelDetail.services.length }})
            </p>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="(service, i) in fuelDetail.services"
                :key="i"
                class="text-xs px-2.5 py-1 rounded-md bg-surface border border-surface-border text-slate-400"
              >{{ service }}</span>
            </div>
          </div>

          <!-- Stats nationales -->
          <div v-if="fuelDetail.stats" class="px-4 pb-4">
            <p class="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
              Comparaison nationale — {{ fuelDetail.fuelTypeInfo.sub }}
            </p>

            <!-- Moins chère -->
            <div v-if="fuelDetail.stats.min" class="mb-2 bg-emerald-500/8 border border-emerald-500/20 rounded-lg px-3 py-2.5">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
                  ↓ Moins chère
                </span>
                <span class="ml-auto text-base font-bold text-emerald-400 leading-none">
                  {{ fuelDetail.stats.min.price.toFixed(3) }} €
                </span>
              </div>
              <p class="text-xs text-emerald-300/80 truncate">{{ fuelDetail.stats.min.ville }}</p>
              <p class="text-[11px] text-emerald-300/50 truncate mt-0.5">{{ fuelDetail.stats.min.adresse }}</p>
              <p class="text-[11px] text-emerald-300/40 mt-0.5">{{ fuelDetail.stats.min.dept }}</p>
              <p v-if="fuelDetail.stats.min.date" class="text-[10px] text-emerald-300/30 mt-1 capitalize">
                {{ formatDate(fuelDetail.stats.min.date) }}
              </p>
            </div>

            <!-- Plus chère -->
            <div v-if="fuelDetail.stats.max" class="bg-red-500/8 border border-red-500/20 rounded-lg px-3 py-2.5">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[10px] font-semibold uppercase tracking-wider text-red-400">
                  ↑ Plus chère
                </span>
                <span class="ml-auto text-base font-bold text-red-400 leading-none">
                  {{ fuelDetail.stats.max.price.toFixed(3) }} €
                </span>
              </div>
              <p class="text-xs text-red-300/80 truncate">{{ fuelDetail.stats.max.ville }}</p>
              <p class="text-[11px] text-red-300/50 truncate mt-0.5">{{ fuelDetail.stats.max.adresse }}</p>
              <p class="text-[11px] text-red-300/40 mt-0.5">{{ fuelDetail.stats.max.dept }}</p>
              <p v-if="fuelDetail.stats.max.date" class="text-[10px] text-red-300/30 mt-1 capitalize">
                {{ formatDate(fuelDetail.stats.max.date) }}
              </p>
            </div>

            <!-- Moyenne -->
            <div class="mt-2 flex items-center justify-between px-3 py-2 bg-surface rounded-lg">
              <span class="text-xs text-slate-500">Moyenne nationale</span>
              <span class="text-sm font-semibold text-slate-300">
                {{ fuelDetail.stats.avg.toFixed(3) }} €/L
              </span>
            </div>

            <!-- Nb stations -->
            <p class="mt-1.5 text-center text-[11px] text-slate-600">
              {{ fuelDetail.stats.count.toLocaleString('fr-FR') }} stations répertoriées
            </p>
          </div>

          <!-- Horodatages -->
          <div class="px-4 pb-5 space-y-2">
            <!-- Date des données (prix les plus récents dans le dataset) -->
            <div v-if="fuelDetail.stats?.latestDataDate" class="flex items-start gap-2 px-3 py-2.5 bg-surface rounded-lg">
              <svg class="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <div>
                <p class="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">Date des données</p>
                <p class="text-xs text-slate-300 mt-0.5 capitalize">{{ formatDate(fuelDetail.stats.latestDataDate) }}</p>
                <p class="text-[11px] text-slate-600 mt-0.5">Prix le plus récent du dataset</p>
              </div>
            </div>

            <!-- Horodatage du téléchargement -->
            <div v-if="fuelDetail.fetchedAtLabel" class="flex items-start gap-2 px-3 py-2.5 bg-surface rounded-lg">
              <svg class="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <div>
                <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Téléchargé</p>
                <p class="text-xs text-slate-400 mt-0.5 capitalize">{{ fuelDetail.fetchedAtLabel }}</p>
                <p class="text-[11px] text-slate-600 mt-0.5">Cache local — expire après 24h</p>
              </div>
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
.sidebar-section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateX(-4px);
}
</style>
