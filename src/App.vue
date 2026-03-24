<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  ChevronLeft, ChevronRight,
  Map as MapIcon, Layers, CircleDot, X,
} from 'lucide-vue-next'
import * as LucideIcons from 'lucide-vue-next'
import type { Component } from 'vue'
import MapEngine from '@/components/MapEngine.vue'
import { usePluginStore } from '@/store/pluginStore'
import { fuelPlugin } from '@/plugins/fuelPlugin'

const pluginStore = usePluginStore()

onMounted(() => {
  pluginStore.registerPlugin(fuelPlugin)
})

const sidebarOpen = ref(true)
const toggleSidebar = () => { sidebarOpen.value = !sidebarOpen.value }

const fuelDetail = computed(() => {
  const f = pluginStore.selectedFeature
  if (!f || f.pluginId !== 'fuel') return null
  const p = f.properties
  return {
    name: String(p['name'] ?? ''),
    city: String(p['city'] ?? ''),
    brand: String(p['brand'] ?? ''),
    price_sp95: Number(p['price_sp95']),
    price_diesel: Number(p['price_diesel']),
    color: String(p['color'] ?? '#f97316'),
  }
})

function resolveIcon(name: string): Component {
  return (LucideIcons as unknown as Record<string, Component>)[name] ?? CircleDot
}
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-surface font-sans">

    <!-- ═══ SIDEBAR GAUCHE ══════════════════════════════════════════════════ -->
    <aside
      class="relative flex flex-col flex-shrink-0 bg-surface-raised border-r border-surface-border
             transition-all duration-300 ease-in-out overflow-hidden z-20"
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
      </div>

      <!-- Bouton toggle flottant sur le bord droit de la sidebar -->
      <button
        @click="toggleSidebar"
        :title="sidebarOpen ? 'Réduire' : 'Agrandir'"
        class="absolute top-4 -right-3.5 z-50 w-7 h-7 rounded-full
               bg-surface-raised border border-surface-border
               flex items-center justify-center
               text-slate-400 hover:text-slate-100 hover:bg-surface-overlay
               transition-colors shadow-lg"
      >
        <ChevronLeft v-if="sidebarOpen" class="w-3.5 h-3.5" />
        <ChevronRight v-else class="w-3.5 h-3.5" />
      </button>

      <!-- Calques -->
      <div class="flex-1 overflow-y-auto py-3">
        <div class="flex items-center gap-2 px-3 mb-2">
          <Layers class="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <Transition name="fade">
            <span v-if="sidebarOpen" class="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Calques
            </span>
          </Transition>
        </div>

        <ul class="space-y-0.5 px-1.5">
          <li v-for="plugin in pluginStore.plugins" :key="plugin.id">
            <button
              @click="pluginStore.togglePlugin(plugin.id)"
              :title="!sidebarOpen
                ? `${plugin.label}${plugin.description ? ' — ' + plugin.description : ''}`
                : plugin.description"
              class="w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-150"
              :class="pluginStore.isActive(plugin.id)
                ? 'bg-surface-overlay text-slate-100'
                : 'text-slate-400 hover:bg-surface-overlay hover:text-slate-200'"
            >
              <span
                class="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
                :style="pluginStore.isActive(plugin.id)
                  ? `background-color:${plugin.color}22;color:${plugin.color}`
                  : ''"
              >
                <component :is="resolveIcon(plugin.icon)" class="w-3.5 h-3.5" />
              </span>

              <Transition name="fade">
                <div v-if="sidebarOpen" class="flex-1 min-w-0 text-left">
                  <p class="text-xs font-medium truncate leading-tight">{{ plugin.label }}</p>
                  <p v-if="plugin.description" class="text-[10px] text-slate-500 truncate leading-tight mt-0.5">
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

        <div v-if="pluginStore.plugins.length === 0" class="px-3 py-6 text-center">
          <Transition name="fade">
            <p v-if="sidebarOpen" class="text-xs text-slate-600">Aucun plugin enregistré</p>
          </Transition>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t border-surface-border px-3 py-2.5 flex items-center gap-2 flex-shrink-0">
        <span
          class="w-1.5 h-1.5 rounded-full flex-shrink-0"
          :class="pluginStore.activeIds.size > 0 ? 'bg-emerald-500' : 'bg-slate-600'"
        />
        <Transition name="fade">
          <span v-if="sidebarOpen" class="text-xs text-slate-500">
            <template v-if="pluginStore.activeIds.size > 0">
              {{ pluginStore.activeIds.size }}
              calque{{ pluginStore.activeIds.size > 1 ? 's' : '' }}
              actif{{ pluginStore.activeIds.size > 1 ? 's' : '' }}
            </template>
            <template v-else>Aucun calque actif</template>
          </span>
        </Transition>
      </div>
    </aside>

    <!-- ═══ CARTE (centre) ═══════════════════════════════════════════════════ -->
    <main class="flex-1 relative min-h-0 min-w-0">
      <MapEngine />
    </main>

    <!-- ═══ PANNEAU DÉTAIL (droite, overlay sur la carte) ════════════════════ -->
    <aside
      class="absolute top-0 right-0 h-full z-30 bg-surface-raised border-l border-surface-border
             flex flex-col overflow-hidden transition-transform duration-300 ease-in-out"
      :class="fuelDetail ? 'translate-x-0 w-80' : 'translate-x-full w-80'"
    >
      <div v-if="fuelDetail" class="w-80 flex flex-col h-full">
        <!-- En-tête -->
        <div class="flex items-center gap-3 px-4 py-4 border-b border-surface-border flex-shrink-0">
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-lg"
            :style="`background-color:${fuelDetail.color}22`"
          >⛽</div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-slate-100 truncate">{{ fuelDetail.name }}</p>
            <p class="text-xs text-slate-500 mt-0.5">{{ fuelDetail.brand }} · {{ fuelDetail.city }}</p>
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

        <!-- Prix -->
        <div class="p-4 space-y-3 flex-1 overflow-y-auto">
          <p class="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Tarifs</p>

          <!-- SP95 -->
          <div class="flex items-center justify-between bg-surface rounded-lg px-4 py-3">
            <div>
              <p class="text-xs font-medium text-slate-300">Sans Plomb 95</p>
              <p class="text-[10px] text-slate-500 mt-0.5">SP95</p>
            </div>
            <div class="text-right">
              <p class="text-2xl font-bold leading-none" :style="`color:${fuelDetail.color}`">
                {{ fuelDetail.price_sp95.toFixed(3) }}
              </p>
              <p class="text-[10px] text-slate-500 mt-1">€ / litre</p>
            </div>
          </div>

          <!-- Diesel -->
          <div class="flex items-center justify-between bg-surface rounded-lg px-4 py-3">
            <div>
              <p class="text-xs font-medium text-slate-300">Gazole</p>
              <p class="text-[10px] text-slate-500 mt-0.5">Diesel</p>
            </div>
            <div class="text-right">
              <p class="text-2xl font-bold text-slate-300 leading-none">
                {{ fuelDetail.price_diesel.toFixed(3) }}
              </p>
              <p class="text-[10px] text-slate-500 mt-1">€ / litre</p>
            </div>
          </div>
        </div>
      </div>
    </aside>

  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateX(-4px);
}

</style>
