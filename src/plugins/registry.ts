import type { FranceDataPlugin } from '@/plugins/index'
import { fuelPlugin } from '@/plugins/fuelPlugin'
import { defibPlugin } from '@/plugins/defibPlugin'
import { chargingPlugin } from '@/plugins/chargingPlugin'

/**
 * Catalogue de tous les plugins disponibles dans Prisme.
 * Chaque plugin est importé statiquement et référencé ici.
 * Le gestionnaire de plugins (PluginsModal) utilise ce catalogue
 * pour proposer l'ajout/suppression de plugins.
 */
export const PLUGIN_CATALOG: FranceDataPlugin[] = [
  fuelPlugin,
  defibPlugin,
  chargingPlugin,
]
