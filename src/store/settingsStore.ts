import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { QUICK_FILTERS, type QuickFilter } from '@/store/pluginStore'

export type AccentColor = 'indigo' | 'violet' | 'blue' | 'emerald' | 'rose' | 'amber'
export type MapStyleKey = 'liberty' | 'dark' | 'positron'

export interface CustomQuickFilter {
  id: string
  label: string
  icon: string
  query: string   // Terme de recherche Overpass (catégorie ou texte libre)
  color: string
}

interface PrismeSettings {
  fontSize: number
  sidebarWidth: number
  accentColor: AccentColor
  compactMode: boolean
  mapStyle: MapStyleKey
  showFooter: boolean
  enabledQuickFilters: string[]
  customQuickFilters: CustomQuickFilter[]
}

// Tous les IDs par défaut = tous visibles
const ALL_QF_IDS = QUICK_FILTERS.map(qf => qf.id)

const DEFAULTS: PrismeSettings = {
  fontSize: 14,
  sidebarWidth: 256,
  accentColor: 'indigo',
  compactMode: false,
  mapStyle: 'liberty',
  showFooter: true,
  enabledQuickFilters: [...ALL_QF_IDS],
  customQuickFilters: [],
}

const ACCENT_HEX: Record<AccentColor, { light: string; dark: string }> = {
  indigo:  { light: '#6366f1', dark: '#4f46e5' },
  violet:  { light: '#8b5cf6', dark: '#7c3aed' },
  blue:    { light: '#3b82f6', dark: '#2563eb' },
  emerald: { light: '#10b981', dark: '#059669' },
  rose:    { light: '#f43f5e', dark: '#e11d48' },
  amber:   { light: '#f59e0b', dark: '#d97706' },
}

const MAP_STYLES: Record<MapStyleKey, { label: string; url: string }> = {
  liberty:  { label: 'Liberty (clair)',   url: 'https://tiles.openfreemap.org/styles/liberty' },
  dark:     { label: 'Dark Matter',       url: 'https://tiles.openfreemap.org/styles/dark' },
  positron: { label: 'Positron (neutre)', url: 'https://tiles.openfreemap.org/styles/positron' },
}

const STORAGE_KEY = 'prisme-settings'

function loadSettings(): PrismeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { ...DEFAULTS }
}

export const useSettingsStore = defineStore('settings', () => {
  const saved = loadSettings()

  const fontSize = ref(saved.fontSize)
  const sidebarWidth = ref(saved.sidebarWidth)
  const accentColor = ref<AccentColor>(saved.accentColor)
  const compactMode = ref(saved.compactMode)
  const mapStyle = ref<MapStyleKey>(saved.mapStyle)
  const showFooter = ref(saved.showFooter)
  const enabledQuickFilters = ref<string[]>(saved.enabledQuickFilters ?? [...ALL_QF_IDS])
  const customQuickFilters = ref<CustomQuickFilter[]>(saved.customQuickFilters ?? [])

  // Computed
  const accent500 = computed(() => ACCENT_HEX[accentColor.value].light)
  const accent600 = computed(() => ACCENT_HEX[accentColor.value].dark)
  const mapStyleUrl = computed(() => MAP_STYLES[mapStyle.value].url)
  const mapStyleOptions = MAP_STYLES
  const accentOptions = Object.keys(ACCENT_HEX) as AccentColor[]

  // Appliquer le font-size sur le :root
  function applyFontSize(): void {
    document.documentElement.style.setProperty('--prisme-font-size', `${fontSize.value}px`)
  }

  // Appliquer les CSS variables d'accent
  function applyAccent(): void {
    const hex = ACCENT_HEX[accentColor.value]
    document.documentElement.style.setProperty('--accent-500', hex.light)
    document.documentElement.style.setProperty('--accent-600', hex.dark)
  }

  // Appliquer le mode compact
  function applyCompact(): void {
    document.documentElement.classList.toggle('compact', compactMode.value)
  }

  // Tout appliquer au démarrage
  function init(): void {
    applyFontSize()
    applyAccent()
    applyCompact()
  }

  /** Convertit un custom filter en QuickFilter pour le store de plugins */
  function customToQuickFilter(c: CustomQuickFilter): QuickFilter {
    return { id: c.id, label: c.label, icon: c.icon, category: c.query, color: c.color }
  }

  /** Tous les filtres rapides (built-in activés + custom) */
  const visibleQuickFilters = computed<QuickFilter[]>(() => {
    const builtIn = QUICK_FILTERS.filter(qf => enabledQuickFilters.value.includes(qf.id))
    const custom = customQuickFilters.value.map(customToQuickFilter)
    return [...builtIn, ...custom]
  })

  /** Tous les filtres (built-in + custom) pour la page settings */
  const allQuickFilters = computed<QuickFilter[]>(() => {
    return [...QUICK_FILTERS, ...customQuickFilters.value.map(customToQuickFilter)]
  })

  function isQuickFilterEnabled(id: string): boolean {
    // Les custom sont toujours "enabled"
    if (customQuickFilters.value.some(c => c.id === id)) return true
    return enabledQuickFilters.value.includes(id)
  }

  function toggleQuickFilterVisibility(id: string): void {
    // Ne pas toggle les custom ici (ils ont leur propre suppression)
    if (customQuickFilters.value.some(c => c.id === id)) return
    const idx = enabledQuickFilters.value.indexOf(id)
    if (idx >= 0) {
      enabledQuickFilters.value.splice(idx, 1)
    } else {
      enabledQuickFilters.value.push(id)
    }
    save()
  }

  function addCustomFilter(filter: Omit<CustomQuickFilter, 'id'>): void {
    const id = `cqf_${Date.now()}`
    customQuickFilters.value.push({ id, ...filter })
    save()
  }

  function removeCustomFilter(id: string): void {
    customQuickFilters.value = customQuickFilters.value.filter(c => c.id !== id)
    save()
  }

  function isCustomFilter(id: string): boolean {
    return customQuickFilters.value.some(c => c.id === id)
  }

  // Persistance auto
  function save(): void {
    const data: PrismeSettings = {
      fontSize: fontSize.value,
      sidebarWidth: sidebarWidth.value,
      accentColor: accentColor.value,
      compactMode: compactMode.value,
      mapStyle: mapStyle.value,
      showFooter: showFooter.value,
      enabledQuickFilters: enabledQuickFilters.value,
      customQuickFilters: customQuickFilters.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  watch(fontSize, () => { applyFontSize(); save() })
  watch(accentColor, () => { applyAccent(); save() })
  watch(compactMode, () => { applyCompact(); save() })
  watch([sidebarWidth, mapStyle, showFooter], save)

  function resetDefaults(): void {
    fontSize.value = DEFAULTS.fontSize
    sidebarWidth.value = DEFAULTS.sidebarWidth
    accentColor.value = DEFAULTS.accentColor
    compactMode.value = DEFAULTS.compactMode
    mapStyle.value = DEFAULTS.mapStyle
    showFooter.value = DEFAULTS.showFooter
    enabledQuickFilters.value = [...ALL_QF_IDS]
    customQuickFilters.value = []
  }

  return {
    fontSize, sidebarWidth, accentColor, compactMode, mapStyle, showFooter,
    enabledQuickFilters, customQuickFilters,
    visibleQuickFilters, allQuickFilters,
    accent500, accent600, mapStyleUrl, mapStyleOptions, accentOptions,
    isQuickFilterEnabled, toggleQuickFilterVisibility,
    isCustomFilter, addCustomFilter, removeCustomFilter,
    init, resetDefaults,
  }
})
