<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  ChevronLeft,
  ChevronRight,
  Map as MapIcon,
  Layers,
  CircleDot,
} from 'lucide-vue-next'
import * as LucideIcons from 'lucide-vue-next'
import type { Component } from 'vue'
import MapEngine from '@/components/MapEngine.vue'
import { usePluginStore } from '@/store/pluginStore'
import { fuelPlugin } from '@/plugins/fuelPlugin'

// ─── Store & plugins ─────────────────────────────────────────────────────────

const pluginStore = usePluginStore()

onMounted(() => {
  // Enregistrement de tous les plugins disponibles
  pluginStore.registerPlugin(fuelPlugin)
  // Ajoutez d'autres plugins ici : pluginStore.registerPlugin(trainPlugin)
})

// ─── Sidebar ─────────────────────────────────────────────────────────────────

const sidebarOpen = ref(true)
const toggleSidebar = () => { sidebarOpen.value = !sidebarOpen.value }

// ─── Icônes dynamiques Lucide ─────────────────────────────────────────────────

function resolveIcon(name: string): Component {
  return (LucideIcons as unknown as Record<string, Component>)[name] ?? CircleDot
}
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-surface font-sans">

    <!-- ═══ SIDEBAR ══════════════════════════════════════════════════════════ -->
    <aside
      class="flex flex-col flex-shrink-0 bg-surface-raised border-r border-surface-border transition-all duration-300 ease-in-out overflow-hidden"
      :class="sidebarOpen ? 'w-64' : 'w-14'"
    >
      <!-- En-tête -->
      <div class="flex items-center h-14 px-3 border-b border-surface-border flex-shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <MapIcon class="w-4 h-4 text-white" />
          </div>
          <Transition name="fade">
            <span v-if="sidebarOpen" class="text-sm font-semibold text-slate-100 tracking-wide truncate">
              Prisme
            </span>
          </Transition>
        </div>

        <button
          @click="toggleSidebar"
          class="ml-auto flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-surface-overlay transition-colors"
          :title="sidebarOpen ? 'Réduire' : 'Agrandir'"
        >
          <ChevronLeft v-if="sidebarOpen" class="w-4 h-4" />
          <ChevronRight v-else class="w-4 h-4" />
        </button>
      </div>

      <!-- Section calques / plugins -->
      <div class="flex-1 overflow-y-auto py-3">
        <!-- Label section -->
        <div class="flex items-center gap-2 px-3 mb-2">
          <Layers class="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <Transition name="fade">
            <span v-if="sidebarOpen" class="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Calques
            </span>
          </Transition>
        </div>

        <!-- Liste des plugins -->
        <ul class="space-y-0.5 px-1.5">
          <li
            v-for="plugin in pluginStore.plugins"
            :key="plugin.id"
          >
            <button
              @click="pluginStore.togglePlugin(plugin.id)"
              :title="!sidebarOpen ? `${plugin.label}${plugin.description ? ' — ' + plugin.description : ''}` : plugin.description"
              class="w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-150 group"
              :class="[
                pluginStore.isActive(plugin.id)
                  ? 'bg-surface-overlay text-slate-100'
                  : 'text-slate-400 hover:bg-surface-overlay hover:text-slate-200',
              ]"
            >
              <!-- Icône plugin -->
              <span
                class="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
                :style="pluginStore.isActive(plugin.id)
                  ? `background-color: ${plugin.color}22; color: ${plugin.color}`
                  : 'background-color: transparent; color: inherit'"
              >
                <component :is="resolveIcon(plugin.icon)" class="w-3.5 h-3.5" />
              </span>

              <!-- Label (masqué si sidebar réduite) -->
              <Transition name="fade">
                <div v-if="sidebarOpen" class="flex-1 min-w-0 text-left">
                  <p class="text-xs font-medium truncate leading-tight">{{ plugin.label }}</p>
                  <p v-if="plugin.description" class="text-[10px] text-slate-500 truncate leading-tight mt-0.5">
                    {{ plugin.description }}
                  </p>
                </div>
              </Transition>

              <!-- Toggle switch -->
              <Transition name="fade">
                <span
                  v-if="sidebarOpen"
                  class="flex-shrink-0 w-8 h-4 rounded-full relative transition-colors duration-200"
                  :style="pluginStore.isActive(plugin.id)
                    ? `background-color: ${plugin.color}`
                    : 'background-color: #2a3045'"
                >
                  <span
                    class="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all duration-200"
                    :class="pluginStore.isActive(plugin.id) ? 'left-4' : 'left-0.5'"
                  />
                </span>
              </Transition>
            </button>
          </li>
        </ul>

        <!-- État vide -->
        <div
          v-if="pluginStore.plugins.length === 0"
          class="px-3 py-6 text-center"
        >
          <Transition name="fade">
            <p v-if="sidebarOpen" class="text-xs text-slate-600">Aucun plugin enregistré</p>
          </Transition>
        </div>
      </div>

      <!-- Pied de sidebar -->
      <div class="border-t border-surface-border p-3 flex-shrink-0">
        <Transition name="fade">
          <p v-if="sidebarOpen" class="text-[10px] text-slate-600 text-center">
            {{ pluginStore.activeIds.size }} calque{{ pluginStore.activeIds.size > 1 ? 's' : '' }} actif{{ pluginStore.activeIds.size > 1 ? 's' : '' }}
          </p>
        </Transition>
      </div>
    </aside>

    <!-- ═══ CARTE ═══════════════════════════════════════════════════════════ -->
    <main class="flex-1 relative overflow-hidden">
      <MapEngine />
    </main>

  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-4px);
}
</style>
