import type { Map as MapLibreMap } from 'maplibre-gl'
import type { usePluginStore } from '@/store/pluginStore'

/**
 * Interface de contrat pour tous les plugins Prisme.
 * Chaque plugin doit implémenter cette interface pour être
 * enregistré et activé dans l'application.
 */
export interface FranceDataPlugin {
  /** Identifiant unique du plugin (snake_case recommandé) */
  readonly id: string

  /** Label affiché dans la sidebar */
  readonly label: string

  /**
   * Nom d'icône Lucide (ex: "Fuel", "Train", "Zap").
   * Voir https://lucide.dev/icons/
   */
  readonly icon: string

  /**
   * Couleur principale du plugin (hex ou classe Tailwind).
   * Utilisée pour la pastille et le layer MapLibre.
   */
  readonly color: string

  /** Description courte affichée en tooltip dans la sidebar */
  readonly description?: string

  /**
   * Appelée lors de l'activation du plugin.
   * Doit injecter sources et layers dans la carte MapLibre.
   * @param map - Instance MapLibre active
   * @param store - Store Pinia pour accéder à l'état global
   */
  setup(map: MapLibreMap, store: ReturnType<typeof usePluginStore>): void

  /**
   * Appelée lors de la désactivation du plugin.
   * Doit nettoyer sources et layers injectés par setup().
   * @param map - Instance MapLibre active
   * @param store - Store Pinia pour accéder à l'état global
   */
  teardown?(map: MapLibreMap, store: ReturnType<typeof usePluginStore>): void
}
