<template>
  <div class="rounded border border-base-300 bg-base-100 overflow-x-auto">
    <pre
      class="p-4 text-left font-mono text-sm whitespace-pre leading-relaxed min-w-[48rem]"
    >{{ text }}</pre>
  </div>
</template>

<script setup lang="ts">
defineProps<{ text: string }>();
</script>
