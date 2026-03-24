<script setup lang="ts">
import { ref } from 'vue'
import { X, RotateCcw, Plus, Trash2 } from 'lucide-vue-next'
import * as LucideIcons from 'lucide-vue-next'
import type { Component } from 'vue'
import { useSettingsStore, type AccentColor, type MapStyleKey } from '@/store/settingsStore'
import { QUICK_FILTERS } from '@/store/pluginStore'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const settings = useSettingsStore()

function resolveIcon(name: string): Component {
  return (LucideIcons as unknown as Record<string, Component>)[name] ?? LucideIcons.CircleDot
}

// ─── Formulaire ajout filtre custom ──────────────────────────────────────────

const showAddForm = ref(false)
const newLabel = ref('')
const newQuery = ref('')
const newIcon = ref('MapPin')
const newColor = ref('#8b5cf6')

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#22c55e', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b',
]

const COMMON_ICONS = [
  'MapPin', 'Heart', 'Star', 'Flame', 'Zap', 'Shield',
  'Eye', 'Flag', 'Bell', 'Camera', 'Music', 'Coffee',
  'Wifi', 'Phone', 'Mail', 'Home', 'Car', 'Bike',
  'TreePine', 'Mountain', 'Waves', 'Sun', 'Leaf', 'Dog',
]

function addFilter(): void {
  if (!newLabel.value.trim() || !newQuery.value.trim()) return
  settings.addCustomFilter({
    label: newLabel.value.trim(),
    query: newQuery.value.trim(),
    icon: newIcon.value,
    color: newColor.value,
  })
  newLabel.value = ''
  newQuery.value = ''
  newIcon.value = 'MapPin'
  newColor.value = '#8b5cf6'
  showAddForm.value = false
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60" @click="emit('close')" />

        <!-- Panel -->
        <div class="relative w-[420px] max-h-[80vh] bg-surface-raised border border-surface-border
                    rounded-xl shadow-2xl overflow-hidden flex flex-col">

          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-surface-border flex-shrink-0">
            <h2 class="text-sm font-semibold text-slate-100">Paramètres</h2>
            <button
              @click="emit('close')"
              class="w-7 h-7 flex items-center justify-center rounded-md
                     text-slate-500 hover:text-slate-200 hover:bg-surface-overlay transition-colors"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto p-5 space-y-6">

            <!-- ─── Taille du texte ─── -->
            <div>
              <label class="setting-label">Taille du texte</label>
              <div class="flex items-center gap-3 mt-1.5">
                <span class="text-[10px] text-slate-500 w-5">A</span>
                <input
                  type="range" min="11" max="20" step="1"
                  :value="settings.fontSize"
                  @input="settings.fontSize = +($event.target as HTMLInputElement).value"
                  class="setting-range flex-1"
                />
                <span class="text-base text-slate-500 w-5">A</span>
                <span class="text-[10px] text-slate-500 tabular-nums w-8 text-right">{{ settings.fontSize }}px</span>
              </div>
            </div>

            <!-- ─── Largeur sidebar ─── -->
            <div>
              <label class="setting-label">Largeur du panneau</label>
              <div class="flex items-center gap-3 mt-1.5">
                <input
                  type="range" min="200" max="400" step="8"
                  :value="settings.sidebarWidth"
                  @input="settings.sidebarWidth = +($event.target as HTMLInputElement).value"
                  class="setting-range flex-1"
                />
                <span class="text-[10px] text-slate-500 tabular-nums w-10 text-right">{{ settings.sidebarWidth }}px</span>
              </div>
            </div>

            <!-- ─── Couleur d'accent ─── -->
            <div>
              <label class="setting-label">Couleur d'accent</label>
              <div class="flex items-center gap-2 mt-2">
                <button
                  v-for="color in settings.accentOptions"
                  :key="color"
                  @click="settings.accentColor = color as AccentColor"
                  class="w-7 h-7 rounded-full border-2 transition-all duration-150 flex items-center justify-center"
                  :class="settings.accentColor === color
                    ? 'border-white scale-110'
                    : 'border-transparent hover:scale-105'"
                  :style="`background-color: var(--color-${color})`"
                >
                  <span
                    v-if="settings.accentColor === color"
                    class="w-2 h-2 rounded-full bg-white"
                  />
                </button>
              </div>
            </div>

            <!-- ─── Style de carte ─── -->
            <div>
              <label class="setting-label">Style de carte</label>
              <div class="flex gap-2 mt-2">
                <button
                  v-for="(style, key) in settings.mapStyleOptions"
                  :key="key"
                  @click="settings.mapStyle = key as MapStyleKey"
                  class="flex-1 px-3 py-2 rounded-lg border text-[10px] font-medium transition-all duration-150"
                  :class="settings.mapStyle === key
                    ? 'border-[var(--accent-500)] bg-[var(--accent-500)]/10 text-slate-100'
                    : 'border-surface-border text-slate-500 hover:text-slate-300 hover:border-slate-500'"
                >
                  {{ style.label }}
                </button>
              </div>
            </div>

            <!-- ─── Filtres rapides ─── -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <div>
                  <label class="setting-label">Filtres rapides</label>
                  <p class="text-[10px] text-slate-600 mt-0.5">Activer/désactiver ou créer des filtres custom</p>
                </div>
                <button
                  @click="showAddForm = !showAddForm"
                  class="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors"
                  :style="`color:var(--accent-500)`"
                >
                  <Plus class="w-3 h-3" />
                  Créer
                </button>
              </div>

              <!-- Formulaire d'ajout -->
              <Transition name="expand-form">
                <div v-if="showAddForm" class="mb-3 p-3 bg-surface rounded-lg border border-surface-border space-y-2.5">
                  <div>
                    <label class="text-[9px] uppercase tracking-wider text-slate-600">Nom</label>
                    <input
                      v-model="newLabel"
                      placeholder="Ex: Boulangeries"
                      class="w-full mt-1 px-2.5 py-1.5 bg-surface-raised border border-surface-border rounded-md
                             text-[11px] text-slate-200 placeholder-slate-600
                             focus:outline-none focus:border-[var(--accent-500)] transition-colors"
                    />
                  </div>
                  <div>
                    <label class="text-[9px] uppercase tracking-wider text-slate-600">Recherche OSM</label>
                    <input
                      v-model="newQuery"
                      placeholder="Ex: Boulangerie, wheelchair:yes, brand:Leclerc…"
                      class="w-full mt-1 px-2.5 py-1.5 bg-surface-raised border border-surface-border rounded-md
                             text-[11px] text-slate-200 placeholder-slate-600
                             focus:outline-none focus:border-[var(--accent-500)] transition-colors"
                    />
                    <p class="text-[9px] text-slate-600 mt-1">Catégorie connue, texte libre, ou propriété:valeur</p>
                  </div>
                  <div>
                    <label class="text-[9px] uppercase tracking-wider text-slate-600">Icône</label>
                    <div class="flex flex-wrap gap-1 mt-1">
                      <button
                        v-for="ic in COMMON_ICONS"
                        :key="ic"
                        @click="newIcon = ic"
                        class="w-7 h-7 rounded-md flex items-center justify-center transition-all"
                        :class="newIcon === ic
                          ? 'bg-surface-overlay text-slate-100 ring-1 ring-[var(--accent-500)]'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-surface-overlay'"
                      >
                        <component :is="resolveIcon(ic)" class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label class="text-[9px] uppercase tracking-wider text-slate-600">Couleur</label>
                    <div class="flex gap-1.5 mt-1">
                      <button
                        v-for="c in PRESET_COLORS"
                        :key="c"
                        @click="newColor = c"
                        class="w-5 h-5 rounded-full border-2 transition-all"
                        :class="newColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'"
                        :style="`background-color:${c}`"
                      />
                    </div>
                  </div>
                  <div class="flex justify-end gap-2 pt-1">
                    <button
                      @click="showAddForm = false"
                      class="px-3 py-1.5 rounded-md text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                    >Annuler</button>
                    <button
                      @click="addFilter"
                      :disabled="!newLabel.trim() || !newQuery.trim()"
                      class="px-3 py-1.5 rounded-md text-[10px] font-medium text-white transition-colors
                             disabled:opacity-40 disabled:cursor-not-allowed"
                      :style="`background-color:var(--accent-600)`"
                    >Ajouter</button>
                  </div>
                </div>
              </Transition>

              <!-- Liste des filtres -->
              <div class="space-y-1 max-h-52 overflow-y-auto">
                <!-- Built-in -->
                <button
                  v-for="qf in QUICK_FILTERS"
                  :key="qf.id"
                  @click="settings.toggleQuickFilterVisibility(qf.id)"
                  class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all duration-150"
                  :class="settings.isQuickFilterEnabled(qf.id)
                    ? 'border-surface-border bg-surface-overlay/50 text-slate-200'
                    : 'border-transparent bg-transparent text-slate-600'"
                >
                  <component
                    :is="resolveIcon(qf.icon)"
                    class="w-3.5 h-3.5 flex-shrink-0"
                    :style="settings.isQuickFilterEnabled(qf.id) ? `color:${qf.color}` : ''"
                  />
                  <span class="text-[11px] flex-1 text-left">{{ qf.label }}</span>
                  <span
                    class="flex-shrink-0 inline-flex items-center w-7 h-4 rounded-full p-0.5 transition-colors duration-200"
                    :style="settings.isQuickFilterEnabled(qf.id)
                      ? `background-color:${qf.color}`
                      : 'background-color:#2a3045'"
                  >
                    <span
                      class="block w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200"
                      :class="settings.isQuickFilterEnabled(qf.id) ? 'translate-x-3' : 'translate-x-0'"
                    />
                  </span>
                </button>

                <!-- Custom -->
                <div
                  v-for="cqf in settings.customQuickFilters"
                  :key="cqf.id"
                  class="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-dashed border-surface-border
                         bg-surface-overlay/30 text-slate-200"
                >
                  <component
                    :is="resolveIcon(cqf.icon)"
                    class="w-3.5 h-3.5 flex-shrink-0"
                    :style="`color:${cqf.color}`"
                  />
                  <div class="flex-1 min-w-0 text-left">
                    <p class="text-[11px] truncate">{{ cqf.label }}</p>
                    <p class="text-[9px] text-slate-500 truncate">{{ cqf.query }}</p>
                  </div>
                  <button
                    @click="settings.removeCustomFilter(cqf.id)"
                    class="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded
                           text-slate-600 hover:text-red-400 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 class="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            <!-- ─── Mode compact ─── -->
            <div class="flex items-center justify-between">
              <div>
                <label class="setting-label">Mode compact</label>
                <p class="text-[10px] text-slate-600 mt-0.5">Réduit l'espacement vertical</p>
              </div>
              <button
                @click="settings.compactMode = !settings.compactMode"
                class="flex-shrink-0 inline-flex items-center w-9 h-5 rounded-full p-0.5 transition-colors duration-200"
                :style="settings.compactMode
                  ? `background-color:var(--accent-500)`
                  : 'background-color:#2a3045'"
              >
                <span
                  class="block w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200"
                  :class="settings.compactMode ? 'translate-x-4' : 'translate-x-0'"
                />
              </button>
            </div>

            <!-- ─── Afficher footer ─── -->
            <div class="flex items-center justify-between">
              <div>
                <label class="setting-label">Footer sidebar</label>
                <p class="text-[10px] text-slate-600 mt-0.5">Compteur de calques actifs</p>
              </div>
              <button
                @click="settings.showFooter = !settings.showFooter"
                class="flex-shrink-0 inline-flex items-center w-9 h-5 rounded-full p-0.5 transition-colors duration-200"
                :style="settings.showFooter
                  ? `background-color:var(--accent-500)`
                  : 'background-color:#2a3045'"
              >
                <span
                  class="block w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200"
                  :class="settings.showFooter ? 'translate-x-4' : 'translate-x-0'"
                />
              </button>
            </div>

          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between px-5 py-3 border-t border-surface-border flex-shrink-0">
            <button
              @click="settings.resetDefaults()"
              class="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              <RotateCcw class="w-3 h-3" />
              Réinitialiser
            </button>
            <button
              @click="emit('close')"
              class="px-4 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
              :style="`background-color:var(--accent-600)`"
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
.setting-label {
  @apply text-xs font-medium text-slate-300;
}

.setting-range {
  @apply h-1 rounded-full appearance-none bg-surface-border cursor-pointer;
  accent-color: var(--accent-500);
}
.setting-range::-webkit-slider-thumb {
  @apply appearance-none w-3.5 h-3.5 rounded-full border-2 border-white cursor-pointer;
  background-color: var(--accent-500);
}

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
.modal-enter-from > div:last-child {
  transform: scale(0.95);
  opacity: 0;
}
.modal-leave-to > div:last-child {
  transform: scale(0.95);
  opacity: 0;
}

.expand-form-enter-active, .expand-form-leave-active {
  transition: max-height 0.25s ease, opacity 0.2s ease;
  overflow: hidden;
}
.expand-form-enter-from, .expand-form-leave-to {
  max-height: 0;
  opacity: 0;
}
.expand-form-enter-to, .expand-form-leave-from {
  max-height: 400px;
  opacity: 1;
}

/* Couleurs d'accent pour les boutons */
button[style*="--color-indigo"]  { background-color: #6366f1; }
button[style*="--color-violet"]  { background-color: #8b5cf6; }
button[style*="--color-blue"]    { background-color: #3b82f6; }
button[style*="--color-emerald"] { background-color: #10b981; }
button[style*="--color-rose"]    { background-color: #f43f5e; }
button[style*="--color-amber"]   { background-color: #f59e0b; }
</style>
