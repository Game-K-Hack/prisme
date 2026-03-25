import type { Map as MapLibreMap } from 'maplibre-gl'
import type { usePluginStore } from '@/store/pluginStore'

/** Descripteur d'un paramètre de plugin */
export interface PluginSettingDescriptor {
  key: string
  label: string
  description?: string
  type: 'boolean' | 'select' | 'range' | 'color' | 'action'
  default?: unknown
  options?: { value: string; label: string }[]  // pour type 'select'
  min?: number
  max?: number
  step?: number  // pour type 'range'
  icon?: string  // pour type 'action'
  danger?: boolean  // pour type 'action' — style rouge
}

/**
 * Interface de contrat pour tous les plugins Prisme.
 */
export interface FranceDataPlugin {
  readonly id: string
  readonly label: string
  readonly icon: string
  readonly color: string
  readonly description?: string

  /** Paramètres configurables par l'utilisateur */
  readonly settingsDescriptors?: PluginSettingDescriptor[]

  setup(map: MapLibreMap, store: ReturnType<typeof usePluginStore>): void | Promise<void>
  teardown?(map: MapLibreMap, store: ReturnType<typeof usePluginStore>): void
}
