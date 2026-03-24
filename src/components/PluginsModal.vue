<script setup lang="ts">
import { ref, computed } from 'vue'
import { X, Power, PowerOff, Info, ChevronRight, Plus, Minus, Package, Search } from 'lucide-vue-next'
import * as LucideIcons from 'lucide-vue-next'
import type { Component } from 'vue'
import { usePluginStore } from '@/store/pluginStore'
import { PLUGIN_CATALOG } from '@/plugins/registry'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const pluginStore = usePluginStore()
const expandedPlugin = ref<string | null>(null)
const activeTab = ref<'installed' | 'catalog'>('installed')
const searchQuery = ref('')

function resolveIcon(name: string): Component {
  return (LucideIcons as unknown as Record<string, Component>)[name] ?? LucideIcons.CircleDot
}

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

/** Plugins installés, filtrés par recherche */
const filteredInstalled = computed(() =>
  pluginStore.plugins.filter(p => matchesSearch(p.label, p.description))
)

/** Plugins du catalogue pas encore installés, filtrés par recherche */
const availablePlugins = computed(() =>
  PLUGIN_CATALOG.filter(p => !pluginStore.registry.has(p.id) && matchesSearch(p.label, p.description))
)

function installPlugin(id: string): void {
  const plugin = PLUGIN_CATALOG.find(p => p.id === id)
  if (plugin) pluginStore.registerPlugin(plugin)
}

function removePlugin(id: string): void {
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
                {{ activeCount }} actif{{ activeCount > 1 ? 's' : '' }} · {{ totalInstalled }} installé{{ totalInstalled > 1 ? 's' : '' }} · {{ PLUGIN_CATALOG.length }} disponible{{ PLUGIN_CATALOG.length > 1 ? 's' : '' }}
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
                  <component :is="resolveIcon(plugin.icon)" class="w-4 h-4" />
                </div>

                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="text-xs font-semibold text-slate-200 truncate">{{ plugin.label }}</p>
                    <span
                      class="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                      :class="pluginStore.isActive(plugin.id)
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-slate-700/50 text-slate-500'"
                    >{{ pluginStore.isActive(plugin.id) ? 'Actif' : 'Inactif' }}</span>
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
                          <component :is="resolveIcon(plugin.icon)" class="w-3 h-3 text-slate-400" />
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
                <component :is="resolveIcon(plugin.icon)" class="w-4 h-4" />
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
            <div class="flex items-center gap-1.5 text-[10px] text-slate-600">
              <Info class="w-3 h-3" />
              <span>{{ PLUGIN_CATALOG.length }} plugins dans le catalogue</span>
            </div>
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
