<script setup lang="ts">
import { ref } from 'vue'
import { usePluginStore } from '@/store/pluginStore'
import type { PluginSettingDescriptor } from '@/plugins/index'

const props = defineProps<{
  pluginId: string
  descriptors: PluginSettingDescriptor[]
}>()

const pluginStore = usePluginStore()
const pendingAction = ref<string | null>(null)

function getValue(key: string): unknown {
  return pluginStore.getPluginSetting(props.pluginId, key)
}

function setValue(key: string, value: unknown): void {
  pluginStore.setPluginSetting(props.pluginId, key, value)
}

async function runAction(key: string): Promise<void> {
  if (pendingAction.value) return
  pendingAction.value = key
  try {
    await pluginStore.callPluginAction(props.pluginId, key)
  } finally {
    pendingAction.value = null
  }
}

// Séparer les actions des paramètres classiques pour l'affichage
const settings = props.descriptors.filter(d => d.type !== 'action')
const actions  = props.descriptors.filter(d => d.type === 'action')
</script>

<template>
  <div class="space-y-4">

    <!-- Paramètres classiques -->
    <div v-if="settings.length > 0" class="space-y-3">
      <p class="text-[9px] uppercase tracking-wider text-slate-600">Paramètres</p>

      <div
        v-for="desc in settings"
        :key="desc.key"
        class="flex items-center justify-between gap-3"
      >
        <div class="flex-1 min-w-0">
          <p class="text-[11px] font-medium text-slate-300">{{ desc.label }}</p>
          <p v-if="desc.description" class="text-[9px] text-slate-600 mt-0.5">{{ desc.description }}</p>
        </div>

        <!-- Boolean toggle -->
        <button
          v-if="desc.type === 'boolean'"
          @click="setValue(desc.key, !getValue(desc.key))"
          class="flex-shrink-0 inline-flex items-center w-8 h-[18px] rounded-full p-0.5 transition-colors duration-200"
          :style="getValue(desc.key)
            ? 'background-color:var(--accent-500)'
            : 'background-color:#2a3045'"
        >
          <span
            class="block w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200"
            :class="getValue(desc.key) ? 'translate-x-3' : 'translate-x-0'"
          />
        </button>

        <!-- Select -->
        <select
          v-else-if="desc.type === 'select'"
          :value="getValue(desc.key)"
          @change="setValue(desc.key, ($event.target as HTMLSelectElement).value)"
          class="flex-shrink-0 px-2 py-1 bg-surface border border-surface-border rounded-md
                 text-[10px] text-slate-300 focus:outline-none focus:border-[var(--accent-500)]
                 transition-colors cursor-pointer"
        >
          <option
            v-for="opt in desc.options"
            :key="opt.value"
            :value="opt.value"
            class="bg-surface-raised"
          >{{ opt.label }}</option>
        </select>

        <!-- Range -->
        <div v-else-if="desc.type === 'range'" class="flex items-center gap-2 flex-shrink-0">
          <input
            type="range"
            :min="desc.min" :max="desc.max" :step="desc.step"
            :value="getValue(desc.key)"
            @input="setValue(desc.key, +($event.target as HTMLInputElement).value)"
            class="w-20 h-1 rounded-full appearance-none bg-surface-border cursor-pointer"
            style="accent-color: var(--accent-500)"
          />
          <span class="text-[10px] text-slate-500 tabular-nums w-6 text-right">{{ getValue(desc.key) }}</span>
        </div>

        <!-- Color -->
        <input
          v-else-if="desc.type === 'color'"
          type="color"
          :value="getValue(desc.key)"
          @input="setValue(desc.key, ($event.target as HTMLInputElement).value)"
          class="w-7 h-7 rounded-md border border-surface-border cursor-pointer bg-transparent"
        />
      </div>
    </div>

    <!-- Actions -->
    <div v-if="actions.length > 0" class="space-y-2">
      <p class="text-[9px] uppercase tracking-wider text-slate-600">Actions</p>

      <button
        v-for="desc in actions"
        :key="desc.key"
        @click="runAction(desc.key)"
        :disabled="pendingAction === desc.key"
        class="w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] font-medium
               transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :class="desc.danger
          ? 'border-red-500/30 text-red-400 bg-red-500/8 hover:bg-red-500/15 hover:border-red-500/50'
          : 'border-surface-border text-slate-300 bg-surface hover:bg-surface-overlay hover:border-slate-500'"
      >
        <!-- Spinner si en cours -->
        <svg
          v-if="pendingAction === desc.key"
          class="w-3.5 h-3.5 animate-spin flex-shrink-0"
          fill="none" viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        <svg
          v-else-if="desc.icon === 'RefreshCw'"
          class="w-3.5 h-3.5 flex-shrink-0"
          fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
        >
          <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
        <span>{{ pendingAction === desc.key ? 'En cours…' : desc.label }}</span>
        <span v-if="desc.description && pendingAction !== desc.key" class="ml-auto text-[9px] text-slate-600 font-normal">
          {{ desc.description }}
        </span>
      </button>
    </div>

  </div>
</template>
