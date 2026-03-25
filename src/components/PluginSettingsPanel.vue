<script setup lang="ts">
import { usePluginStore } from '@/store/pluginStore'
import type { PluginSettingDescriptor } from '@/plugins/index'

const props = defineProps<{
  pluginId: string
  descriptors: PluginSettingDescriptor[]
}>()

const pluginStore = usePluginStore()

function getValue(key: string): unknown {
  return pluginStore.getPluginSetting(props.pluginId, key)
}

function setValue(key: string, value: unknown): void {
  pluginStore.setPluginSetting(props.pluginId, key, value)
}
</script>

<template>
  <div class="space-y-3">
    <p class="text-[9px] uppercase tracking-wider text-slate-600">Paramètres du plugin</p>

    <div
      v-for="desc in descriptors"
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
</template>
