<template>
  <div class="mockup-code whitespace-pre-wrap">
    <pre data-prefix=">"><code>{{ text }}</code></pre>
  </div>
</template>

<script setup lang="ts">
defineProps<{ text: string }>();
</script>
