<template>
  <div
    class="w-full rounded-2xl border border-base-300 p-6 text-center shadow-sm"
    :class="dragOver ? 'bg-base-200' : 'bg-base-100'"
    @dragover.prevent="dragOver = true"
    @dragleave.prevent="dragOver = false"
    @drop.prevent="onDrop"
  >
    <div class="text-xl font-semibold mb-1">{{ title }}</div>
    <p class="opacity-80 mb-4">{{ subtitle }}</p>

    <input
      class="file-input file-input-bordered w-full max-w-md"
      type="file"
      :accept="accept"
      :multiple="multiple"
      @change="onPick"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  title: string;
  subtitle?: string;
  accept?: string;
  multiple?: boolean;
}>();

const emit = defineEmits<{
  (e: 'files', files: File[]): void;
}>();

const dragOver = ref(false);

function onPick(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? []);
  emit('files', files);
}

function onDrop(e: DragEvent) {
  dragOver.value = false;
  const files = Array.from(e.dataTransfer?.files ?? []);
  emit('files', files);
}
</script>
