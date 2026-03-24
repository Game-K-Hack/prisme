<script setup lang="ts">
import { X, RotateCcw } from 'lucide-vue-next'
import { useSettingsStore, type AccentColor, type MapStyleKey } from '@/store/settingsStore'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const settings = useSettingsStore()
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

/* Couleurs d'accent pour les boutons */
button[style*="--color-indigo"]  { background-color: #6366f1; }
button[style*="--color-violet"]  { background-color: #8b5cf6; }
button[style*="--color-blue"]    { background-color: #3b82f6; }
button[style*="--color-emerald"] { background-color: #10b981; }
button[style*="--color-rose"]    { background-color: #f43f5e; }
button[style*="--color-amber"]   { background-color: #f59e0b; }
</style>
