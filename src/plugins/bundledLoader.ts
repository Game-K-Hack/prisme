import { extractPluginFile, compileExternalPlugin, storeExternalPlugin, loadStoredPlugins, type PluginManifest } from '@/plugins/externalLoader'
import { usePluginStore } from '@/store/pluginStore'
import { ref } from 'vue'

/** Manifests des plugins bundlés (chargés au démarrage, utilisés par le catalogue) */
export const bundledManifests = ref<Array<{ manifest: PluginManifest; jsCode: string }>>([])

/** Réexpose pour l'import dans PluginsModal */
export { compileExternalPlugin, storeExternalPlugin }

/**
 * Charge les fichiers .prm présents dans public/plugins/ au démarrage.
 *
 * Le fichier public/plugins/manifest.json contient la liste des .prm à charger.
 * Seuls les plugins pas encore installés (ni en built-in, ni en externe) sont ajoutés.
 * Cela permet de fournir des plugins par défaut sans empêcher l'utilisateur de les supprimer.
 */
export async function loadBundledPlugins(): Promise<void> {
  const pluginStore = usePluginStore()
  const alreadyStored = loadStoredPlugins().map(p => p.manifest.id)

  // Charger la liste des .prm bundlés
  let prmFiles: string[]
  try {
    const res = await fetch('/plugins/manifest.json')
    if (!res.ok) return
    prmFiles = await res.json()
  } catch {
    return // Pas de manifest = pas de plugins bundlés
  }

  if (!Array.isArray(prmFiles) || prmFiles.length === 0) return

  bundledManifests.value = []

  for (const filename of prmFiles) {
    try {
      const res = await fetch(`/plugins/${filename}`)
      if (!res.ok) continue

      const blob = await res.blob()
      const file = new File([blob], filename)
      const { manifest, jsCode } = await extractPluginFile(file)

      // Toujours stocker le manifest pour le catalogue
      bundledManifests.value.push({ manifest, jsCode })

      // Installer seulement si pas déjà présent
      if (pluginStore.registry.has(manifest.id)) continue
      const appHasRun = localStorage.getItem('prisme-installed-plugins') !== null
      if (appHasRun && !alreadyStored.includes(manifest.id)) continue

      const plugin = compileExternalPlugin(manifest, jsCode)
      storeExternalPlugin(manifest, jsCode)
      pluginStore.registerPlugin(plugin, true)
      console.log(`[Prisme] Plugin bundlé "${manifest.label}" chargé depuis ${filename}`)
    } catch (err) {
      console.error(`[Prisme] Erreur chargement plugin bundlé "${filename}":`, err)
    }
  }
}
