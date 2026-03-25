<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  X, Power, PowerOff, Info, ChevronRight, Plus, Minus, Package, Search,
  Upload, Download, FileArchive, ExternalLink,
} from 'lucide-vue-next'
import { usePluginStore } from '@/store/pluginStore'
import PluginIcon from '@/components/PluginIcon.vue'
import { PLUGIN_CATALOG } from '@/plugins/registry'
import PluginSettingsPanel from '@/components/PluginSettingsPanel.vue'
import {
  extractPluginFile, compileExternalPlugin,
  storeExternalPlugin, removeStoredPlugin,
  generateTemplatePrm,
} from '@/plugins/externalLoader'
import { bundledManifests } from '@/plugins/bundledLoader'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const pluginStore = usePluginStore()
const expandedPlugin = ref<string | null>(null)
const activeTab = ref<'installed' | 'catalog'>('installed')
const searchQuery = ref('')
const importError = ref('')
const importLoading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

// Conflit d'ID
const conflictInfo = ref<{ existingLabel: string; newLabel: string; id: string; isExternal: boolean } | null>(null)
let pendingImport: { manifest: Awaited<ReturnType<typeof extractPluginFile>>['manifest']; jsCode: string } | null = null


function toggleExpand(id: string): void {
  expandedPlugin.value = expandedPlugin.value === id ? null : id
}

const activeCount = computed(() => pluginStore.activeIds.size)
const totalInstalled = computed(() => pluginStore.plugins.length)

function matchesSearch(label: string, description?: string): boolean {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return true
  return label.toLowerCase().includes(q) || (description?.toLowerCase().includes(q) ?? false)
}

const filteredInstalled = computed(() =>
  pluginStore.plugins.filter(p => matchesSearch(p.label, p.description))
)

/** Tous les plugins disponibles mais non installés (built-in + bundlés .prm) */
const availablePlugins = computed(() => {
  const installed = pluginStore.registry

  // Built-in TypeScript
  const builtIn = PLUGIN_CATALOG
    .filter(p => !installed.has(p.id) && matchesSearch(p.label, p.description))
    .map(p => ({ id: p.id, label: p.label, icon: p.icon, color: p.color, description: p.description, source: 'builtin' as const }))

  // Bundlés .prm (public/plugins/)
  const bundled = bundledManifests.value
    .filter(b => !installed.has(b.manifest.id) && matchesSearch(b.manifest.label, b.manifest.description))
    .map(b => ({ id: b.manifest.id, label: b.manifest.label, icon: b.manifest.icon, color: b.manifest.color, description: b.manifest.description, source: 'bundled' as const }))

  return [...builtIn, ...bundled]
})

function installPlugin(id: string): void {
  // D'abord chercher dans le catalogue built-in
  const builtIn = PLUGIN_CATALOG.find(p => p.id === id)
  if (builtIn) { pluginStore.registerPlugin(builtIn); return }

  // Sinon chercher dans les bundlés
  const bundled = bundledManifests.value.find(b => b.manifest.id === id)
  if (bundled) {
    const plugin = compileExternalPlugin(bundled.manifest, bundled.jsCode)
    storeExternalPlugin(bundled.manifest, bundled.jsCode)
    pluginStore.registerPlugin(plugin, true)
  }
}

function removePlugin(id: string): void {
  if (pluginStore.isExternalPlugin(id)) removeStoredPlugin(id)
  pluginStore.unregisterPlugin(id)
}

function activateAll(): void {
  for (const p of pluginStore.plugins) {
    if (!pluginStore.isActive(p.id)) pluginStore.activatePlugin(p.id)
  }
}

function deactivateAll(): void {
  for (const id of [...pluginStore.activeIds]) {
    pluginStore.deactivatePlugin(id)
  }
}

// ─── Import ZIP ──────────────────────────────────────────────────────────────

function triggerFileInput(): void {
  importError.value = ''
  fileInput.value?.click()
}

async function handleFileSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = '' // reset pour pouvoir re-importer le même fichier

  importLoading.value = true
  importError.value = ''

  try {
    const { manifest, jsCode } = await extractPluginFile(file)

    // Vérifier si un plugin avec cet ID existe déjà
    if (pluginStore.registry.has(manifest.id)) {
      const existing = pluginStore.registry.get(manifest.id)!
      pendingImport = { manifest, jsCode }
      conflictInfo.value = {
        id: manifest.id,
        existingLabel: existing.label,
        newLabel: manifest.label,
        isExternal: pluginStore.isExternalPlugin(manifest.id),
      }
      importLoading.value = false
      return // Attendre la réponse de l'utilisateur
    }

    finishImport(manifest, jsCode)
  } catch (err) {
    importError.value = err instanceof Error ? err.message : String(err)
  } finally {
    importLoading.value = false
  }
}

function finishImport(manifest: Awaited<ReturnType<typeof extractPluginFile>>['manifest'], jsCode: string): void {
  const plugin = compileExternalPlugin(manifest, jsCode)
  storeExternalPlugin(manifest, jsCode)
  pluginStore.registerPlugin(plugin, true)
  activeTab.value = 'installed'
  importLoading.value = false
}

function confirmReplace(): void {
  if (!pendingImport || !conflictInfo.value) return
  removePlugin(conflictInfo.value.id)
  finishImport(pendingImport.manifest, pendingImport.jsCode)
  conflictInfo.value = null
  pendingImport = null
}

function cancelConflict(): void {
  conflictInfo.value = null
  pendingImport = null
}

// ─── Template ZIP ────────────────────────────────────────────────────────────

async function downloadTemplate(): Promise<void> {
  const blob = await generateTemplatePrm()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'prisme-plugin-template.prm'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div class="absolute inset-0 bg-black/60" @click="emit('close')" />

        <div class="relative w-[520px] max-h-[85vh] bg-surface-raised border border-surface-border
                    rounded-xl shadow-2xl overflow-hidden flex flex-col">

          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-surface-border flex-shrink-0">
            <div>
              <h2 class="text-sm font-semibold text-slate-100">Gestionnaire de plugins</h2>
              <p class="text-[10px] text-slate-500 mt-0.5">
                {{ activeCount }} actif{{ activeCount > 1 ? 's' : '' }} · {{ totalInstalled }} installé{{ totalInstalled > 1 ? 's' : '' }} · {{ PLUGIN_CATALOG.length + bundledManifests.length }} disponible{{ (PLUGIN_CATALOG.length + bundledManifests.length) > 1 ? 's' : '' }}
              </p>
            </div>
            <button
              @click="emit('close')"
              class="w-7 h-7 flex items-center justify-center rounded-md
                     text-slate-500 hover:text-slate-200 hover:bg-surface-overlay transition-colors"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- Input fichier caché -->
          <input
            ref="fileInput"
            type="file"
            accept=".prm,.zip"
            class="hidden"
            @change="handleFileSelected"
          />

          <!-- Tabs -->
          <div class="flex border-b border-surface-border flex-shrink-0">
            <button
              @click="activeTab = 'installed'"
              class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors"
              :class="activeTab === 'installed'
                ? 'text-slate-100 border-b-2'
                : 'text-slate-500 hover:text-slate-300'"
              :style="activeTab === 'installed' ? 'border-color: var(--accent-500)' : ''"
            >
              <Package class="w-3.5 h-3.5" />
              Installés ({{ totalInstalled }})
            </button>
            <button
              @click="activeTab = 'catalog'"
              class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors"
              :class="activeTab === 'catalog'
                ? 'text-slate-100 border-b-2'
                : 'text-slate-500 hover:text-slate-300'"
              :style="activeTab === 'catalog' ? 'border-color: var(--accent-500)' : ''"
            >
              <Plus class="w-3.5 h-3.5" />
              Catalogue ({{ availablePlugins.length }})
            </button>
            <button
              @click="triggerFileInput"
              :disabled="importLoading"
              class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors
                     text-slate-500 hover:text-slate-300"
            >
              <Upload v-if="!importLoading" class="w-3.5 h-3.5" />
              <span v-else class="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
              Importer .prm
            </button>
          </div>

          <!-- Erreur d'import -->
          <div v-if="importError" class="mx-5 mt-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
            <Info class="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
            <div class="flex-1 min-w-0">
              <p class="text-xs text-red-400">{{ importError }}</p>
            </div>
            <button @click="importError = ''" class="text-red-400/50 hover:text-red-400 flex-shrink-0">
              <X class="w-3 h-3" />
            </button>
          </div>

          <!-- Alerte conflit d'ID -->
          <div v-if="conflictInfo" class="mx-5 mt-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div class="flex items-start gap-2 mb-2">
              <Info class="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div class="flex-1">
                <p class="text-sm font-medium text-amber-300">Conflit d'identifiant</p>
                <p class="text-xs text-amber-400/80 mt-1">
                  Un plugin avec l'ID <code class="px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px]">{{ conflictInfo.id }}</code>
                  est déjà installé.
                </p>
              </div>
            </div>

            <div class="ml-6 space-y-1.5 mb-3">
              <div class="flex items-center gap-2 text-xs">
                <span class="text-slate-500 w-16">Existant :</span>
                <span class="text-slate-300 font-medium">{{ conflictInfo.existingLabel }}</span>
                <span
                  class="text-[9px] px-1.5 py-0.5 rounded-full"
                  :class="conflictInfo.isExternal
                    ? 'bg-violet-500/15 text-violet-400'
                    : 'bg-slate-700/50 text-slate-400'"
                >{{ conflictInfo.isExternal ? 'Externe' : 'Built-in' }}</span>
              </div>
              <div class="flex items-center gap-2 text-xs">
                <span class="text-slate-500 w-16">Nouveau :</span>
                <span class="text-slate-300 font-medium">{{ conflictInfo.newLabel }}</span>
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 ml-6">
              <button
                @click="cancelConflict"
                class="px-3 py-1.5 rounded-md text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >Annuler</button>
              <button
                @click="confirmReplace"
                class="px-3 py-1.5 rounded-md text-xs font-medium bg-amber-500/20 text-amber-300
                       hover:bg-amber-500/30 transition-colors"
              >Remplacer l'existant</button>
            </div>
          </div>

          <!-- Barre de recherche -->
          <div class="px-5 py-2.5 border-b border-surface-border flex-shrink-0">
            <div class="relative">
              <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              <input
                v-model="searchQuery"
                placeholder="Rechercher un plugin…"
                class="w-full pl-8 pr-8 py-2 bg-surface border border-surface-border rounded-lg
                       text-xs text-slate-200 placeholder-slate-600
                       focus:outline-none focus:border-[var(--accent-500)] transition-colors"
              />
              <button
                v-if="searchQuery"
                @click="searchQuery = ''"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- ═══ TAB : Installés ═══════════════════════════════════════════ -->
          <div v-if="activeTab === 'installed'" class="flex-1 overflow-y-auto">
            <!-- Toolbar -->
            <div class="flex items-center gap-2 px-5 py-2.5 border-b border-surface-border">
              <button
                @click="activateAll"
                :disabled="activeCount === totalInstalled"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium
                       border border-surface-border transition-colors
                       enabled:text-emerald-400 enabled:hover:bg-emerald-500/10 enabled:hover:border-emerald-500/30
                       disabled:text-slate-600 disabled:cursor-not-allowed"
              >
                <Power class="w-3 h-3" />
                Tout activer
              </button>
              <button
                @click="deactivateAll"
                :disabled="activeCount === 0"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium
                       border border-surface-border transition-colors
                       enabled:text-red-400 enabled:hover:bg-red-500/10 enabled:hover:border-red-500/30
                       disabled:text-slate-600 disabled:cursor-not-allowed"
              >
                <PowerOff class="w-3 h-3" />
                Tout désactiver
              </button>
            </div>

            <!-- Empty state -->
            <div v-if="filteredInstalled.length === 0 && !searchQuery" class="px-5 py-10 text-center">
              <Package class="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p class="text-xs text-slate-500">Aucun plugin installé</p>
              <button
                @click="activeTab = 'catalog'"
                class="mt-2 text-[10px] font-medium transition-colors"
                style="color: var(--accent-500)"
              >Parcourir le catalogue</button>
            </div>

            <!-- No results -->
            <div v-if="filteredInstalled.length === 0 && searchQuery" class="px-5 py-8 text-center">
              <p class="text-xs text-slate-500">Aucun résultat pour « {{ searchQuery }} »</p>
            </div>

            <!-- Plugin list -->
            <div
              v-for="plugin in filteredInstalled"
              :key="plugin.id"
              class="border-b border-surface-border last:border-b-0"
            >
              <div class="flex items-center gap-3 px-5 py-3 hover:bg-surface-overlay/50 transition-colors">
                <div
                  class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                  :style="pluginStore.isActive(plugin.id)
                    ? `background-color:${plugin.color}22;color:${plugin.color}`
                    : 'background-color:#1e2333;color:#475569'"
                >
                  <PluginIcon :icon="plugin.icon" class="w-4 h-4" />
                </div>

                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <p class="text-xs font-semibold text-slate-200 truncate">{{ plugin.label }}</p>
                    <span
                      class="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                      :class="pluginStore.isActive(plugin.id)
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-slate-700/50 text-slate-500'"
                    >{{ pluginStore.isActive(plugin.id) ? 'Actif' : 'Inactif' }}</span>
                    <span
                      v-if="pluginStore.isExternalPlugin(plugin.id)"
                      class="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-violet-500/15 text-violet-400 flex items-center gap-1"
                    >
                      <ExternalLink class="w-2.5 h-2.5" />
                      Externe
                    </span>
                  </div>
                  <p v-if="plugin.description" class="text-[10px] text-slate-500 truncate mt-0.5">
                    {{ plugin.description }}
                  </p>
                </div>

                <div class="flex items-center gap-1.5 flex-shrink-0">
                  <!-- Toggle -->
                  <button
                    @click="pluginStore.togglePlugin(plugin.id)"
                    class="flex-shrink-0 inline-flex items-center w-9 h-5 rounded-full p-0.5 transition-colors duration-200"
                    :style="pluginStore.isActive(plugin.id)
                      ? `background-color:${plugin.color}`
                      : 'background-color:#2a3045'"
                  >
                    <span
                      class="block w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200"
                      :class="pluginStore.isActive(plugin.id) ? 'translate-x-4' : 'translate-x-0'"
                    />
                  </button>

                  <!-- Remove -->
                  <button
                    @click="removePlugin(plugin.id)"
                    title="Désinstaller"
                    class="w-7 h-7 flex items-center justify-center rounded-md
                           text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Minus class="w-3.5 h-3.5" />
                  </button>

                  <!-- Expand -->
                  <button
                    @click="toggleExpand(plugin.id)"
                    class="w-6 h-6 flex items-center justify-center rounded-md
                           text-slate-500 hover:text-slate-300 hover:bg-surface-overlay transition-colors"
                  >
                    <ChevronRight
                      class="w-3.5 h-3.5 transition-transform duration-150"
                      :class="expandedPlugin === plugin.id ? 'rotate-90' : ''"
                    />
                  </button>
                </div>
              </div>

              <!-- Expanded details -->
              <Transition name="expand">
                <div v-if="expandedPlugin === plugin.id" class="px-5 pb-3">
                  <div class="ml-12 space-y-3">
                    <!-- Description complète -->
                    <div v-if="plugin.description">
                      <p class="text-[9px] uppercase tracking-wider text-slate-600 mb-1">Description</p>
                      <p class="text-[11px] text-slate-300 leading-relaxed">{{ plugin.description }}</p>
                    </div>

                    <!-- Metadata -->
                    <div class="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <p class="text-[9px] uppercase tracking-wider text-slate-600">ID</p>
                        <p class="text-[10px] text-slate-400 font-mono mt-0.5">{{ plugin.id }}</p>
                      </div>
                      <div>
                        <p class="text-[9px] uppercase tracking-wider text-slate-600">Couleur</p>
                        <div class="flex items-center gap-1.5 mt-0.5">
                          <span class="w-3 h-3 rounded-full border border-white/20" :style="`background-color:${plugin.color}`" />
                          <p class="text-[10px] text-slate-400 font-mono">{{ plugin.color }}</p>
                        </div>
                      </div>
                      <div>
                        <p class="text-[9px] uppercase tracking-wider text-slate-600">Icône</p>
                        <div class="flex items-center gap-1.5 mt-0.5">
                          <PluginIcon :icon="plugin.icon" class="w-3 h-3 text-slate-400" />
                          <p class="text-[10px] text-slate-400 font-mono">{{ plugin.icon }}</p>
                        </div>
                      </div>
                      <div>
                        <p class="text-[9px] uppercase tracking-wider text-slate-600">Contrat</p>
                        <div class="flex gap-1.5 mt-0.5">
                          <span class="text-[9px] px-1.5 py-0.5 rounded bg-surface-overlay text-slate-400">setup()</span>
                          <span
                            class="text-[9px] px-1.5 py-0.5 rounded"
                            :class="plugin.teardown
                              ? 'bg-surface-overlay text-slate-400'
                              : 'bg-surface-overlay text-slate-600 line-through'"
                          >teardown()</span>
                        </div>
                      </div>
                    </div>

                    <!-- Plugin settings -->
                    <PluginSettingsPanel
                      v-if="plugin.settingsDescriptors && plugin.settingsDescriptors.length > 0"
                      :plugin-id="plugin.id"
                      :descriptors="plugin.settingsDescriptors"
                    />
                  </div>
                </div>
              </Transition>
            </div>
          </div>

          <!-- ═══ TAB : Catalogue ═══════════════════════════════════════════ -->
          <div v-if="activeTab === 'catalog'" class="flex-1 overflow-y-auto">
            <!-- All installed -->
            <div v-if="availablePlugins.length === 0 && !searchQuery" class="px-5 py-10 text-center">
              <Package class="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p class="text-xs text-slate-500">Tous les plugins sont déjà installés</p>
            </div>

            <!-- No search results -->
            <div v-if="availablePlugins.length === 0 && searchQuery" class="px-5 py-8 text-center">
              <p class="text-xs text-slate-500">Aucun résultat pour « {{ searchQuery }} »</p>
            </div>

            <!-- Available plugins -->
            <div
              v-for="plugin in availablePlugins"
              :key="plugin.id"
              class="flex items-start gap-3 px-5 py-3 border-b border-surface-border last:border-b-0
                     hover:bg-surface-overlay/50 transition-colors"
            >
              <div
                class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                :style="`background-color:${plugin.color}15;color:${plugin.color}`"
              >
                <PluginIcon :icon="plugin.icon" class="w-4 h-4" />
              </div>

              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-slate-200">{{ plugin.label }}</p>
                <p v-if="plugin.description" class="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                  {{ plugin.description }}
                </p>
              </div>

              <button
                @click="installPlugin(plugin.id)"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium
                       border transition-colors"
                style="color: var(--accent-500); border-color: var(--accent-500)"
              >
                <Plus class="w-3 h-3" />
                Installer
              </button>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between px-5 py-3 border-t border-surface-border flex-shrink-0">
            <button
              @click="downloadTemplate"
              class="flex items-center gap-1.5 text-[10px] text-slate-600 hover:text-slate-300 transition-colors"
              title="Télécharger un template de plugin"
            >
              <Download class="w-3 h-3" />
              <span>Télécharger template</span>
            </button>
            <button
              @click="emit('close')"
              class="px-4 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
              style="background-color: var(--accent-600)"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active > div:last-child,
.modal-leave-active > div:last-child {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
.modal-enter-from > div:last-child,
.modal-leave-to > div:last-child {
  transform: scale(0.95);
  opacity: 0;
}

.expand-enter-active, .expand-leave-active {
  transition: max-height 0.2s ease, opacity 0.2s ease;
  overflow: hidden;
}
.expand-enter-from, .expand-leave-to {
  max-height: 0;
  opacity: 0;
}
.expand-enter-to, .expand-leave-from {
  max-height: 200px;
  opacity: 1;
}
</style>
