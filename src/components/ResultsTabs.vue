<template>
  <div class="mt-6">
    <div role="tablist" class="tabs tabs-lifted">
      <!-- Crafted Items -->
      <input type="radio" name="tabs" role="tab" class="tab" aria-label="Crafted Items" checked />
      <div role="tabpanel" class="tab-content bg-base-100 border-base-300 rounded-box p-6">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-lg font-semibold">Total Crafted Items</h3>
          <button class="btn btn-sm" @click="downloadCrafted">Download CSV</button>
        </div>
        <DataTable :headers="['Item','Quantity']" :rows="craftedRows" />
      </div>

      <!-- Gathering (no location) -->
      <input type="radio" name="tabs" role="tab" class="tab" aria-label="Gathering (no location)" />
      <div role="tabpanel" class="tab-content bg-base-100 border-base-300 rounded-box p-6">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-lg font-semibold">Gathering List (no location)</h3>
          <button class="btn btn-sm" @click="downloadGathering(false)">Download CSV</button>
        </div>
        <DataTable :headers="['Ingredient','Total Quantity','Method']" :rows="gatheringNoLoc" />
      </div>

      <!-- Gathering (with location) -->
      <input type="radio" name="tabs" role="tab" class="tab" aria-label="Gathering (with location)" />
      <div role="tabpanel" class="tab-content bg-base-100 border-base-300 rounded-box p-6">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-lg font-semibold">Gathering List (with location)</h3>
          <button class="btn btn-sm" @click="downloadGathering(true)">Download CSV</button>
        </div>
        <DataTable :headers="['Ingredient','Total Quantity','Method','Location Info']" :rows="gatheringWithLoc" />
      </div>

      <!-- Recipe Tree -->
      <input type="radio" name="tabs" role="tab" class="tab" aria-label="Recipe Tree" />
      <div role="tabpanel" class="tab-content bg-base-100 border-base-300 rounded-box p-6">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-lg font-semibold">Recipe Tree</h3>
          <button class="btn btn-sm" @click="downloadTree">Download TXT</button>
        </div>
        <RecipeTree :text="treeText" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DataTable from './DataTable.vue';
import RecipeTree from './RecipeTree.vue';
import { toCsv } from '../lib/csv';

const props = defineProps<{
  craftedRows: { Item: string; Quantity: number }[];
  gatheringNoLoc: Record<string, string | number>[];
  gatheringWithLoc: Record<string, string | number>[];
  treeText: string;
}>();

function dl(name: string, text: string, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadCrafted() {
  const rows = [['Item', 'Quantity'], ...props.craftedRows.map((r) => [r.Item, r.Quantity])];
  dl('workshop_output.csv', toCsv(rows), 'text/csv');
}

function downloadGathering(withLoc: boolean) {
  const headers = withLoc
    ? ['Ingredient', 'Total Quantity', 'Method', 'Location Info']
    : ['Ingredient', 'Total Quantity', 'Method'];
  const rows = (withLoc ? props.gatheringWithLoc : props.gatheringNoLoc) as any[];
  const out = [headers, ...rows.map((r) => headers.map((h) => r[h] ?? ''))];
  dl('gathering_list.csv', toCsv(out), 'text/csv');
}

function downloadTree() {
  dl('recipe_tree.txt', props.treeText, 'text/plain');
}
</script>
