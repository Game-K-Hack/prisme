<script setup lang="ts">
import { computed } from 'vue'
import * as LucideIcons from 'lucide-vue-next'
import { CircleDot } from 'lucide-vue-next'
import type { Component } from 'vue'

const props = defineProps<{
  icon: string
  class?: string
}>()

const isUrl = computed(() =>
  props.icon.startsWith('http://') ||
  props.icon.startsWith('https://') ||
  props.icon.startsWith('data:')
)

const lucideComponent = computed<Component>(() =>
  (LucideIcons as unknown as Record<string, Component>)[props.icon] ?? CircleDot
)
</script>

<template>
  <img
    v-if="isUrl"
    :src="icon"
    :class="props.class"
    alt=""
    draggable="false"
    style="object-fit:contain"
  />
  <component
    v-else
    :is="lucideComponent"
    :class="props.class"
  />
</template>
