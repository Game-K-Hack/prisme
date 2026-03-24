import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export type AccentColor = 'indigo' | 'violet' | 'blue' | 'emerald' | 'rose' | 'amber'
export type MapStyleKey = 'liberty' | 'dark' | 'positron'

interface PrismeSettings {
  fontSize: number
  sidebarWidth: number
  accentColor: AccentColor
  compactMode: boolean
  mapStyle: MapStyleKey
  showFooter: boolean
}

const DEFAULTS: PrismeSettings = {
  fontSize: 14,
  sidebarWidth: 256,
  accentColor: 'indigo',
  compactMode: false,
  mapStyle: 'liberty',
  showFooter: true,
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

  // Persistance auto
  function save(): void {
    const data: PrismeSettings = {
      fontSize: fontSize.value,
      sidebarWidth: sidebarWidth.value,
      accentColor: accentColor.value,
      compactMode: compactMode.value,
      mapStyle: mapStyle.value,
      showFooter: showFooter.value,
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
  }

  return {
    fontSize, sidebarWidth, accentColor, compactMode, mapStyle, showFooter,
    accent500, accent600, mapStyleUrl, mapStyleOptions, accentOptions,
    init, resetDefaults,
  }
})
