<template>
  <div class="min-h-full p-6 max-w-6xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Tanuki Workshop Web</h1>
      <div class="flex items-center gap-2">
        <button class="btn btn-sm" @click="toggleTheme">Toggle Theme</button>
        <a class="btn btn-sm btn-ghost" href="https://github.com/" target="_blank">GitHub</a>
      </div>
    </div>

    <div class="mb-4 join">
      <button class="btn join-item" :class="mode==='upload' ? 'btn-active' : ''" @click="mode='upload'">Manual upload</button>
      <button class="btn join-item" :class="mode==='preset' ? 'btn-active' : ''" @click="mode='preset'">Use bundled preset</button>
    </div>

    <!-- Upload Mode -->
    <div v-if="mode==='upload'" class="grid md:grid-cols-2 gap-6">
      <FileDrop
        title="1) Upload recipe_book.csv"
        subtitle="Alternating columns: product, ingredient1, qty1, ingredient2, qty2, ..."
        accept=".csv"
        @files="onRecipeBook"
      />
      <FileDrop
        title="2) Upload recipe_gathering.csv"
        subtitle="Columns: Ingredient, Method, (optional location fields...)"
        accept=".csv"
        @files="onGathering"
      />
      <div class="md:col-span-2">
        <FileDrop
          title="3) Upload workshop_parts CSVs"
          subtitle="Drop multiple .csv files (surpluses allowed with negatives)"
          accept=".csv"
          :multiple="true"
          @files="onParts"
        />
      </div>
    </div>

    <!-- Preset Mode -->
    <div v-else class="grid gap-6">
      <div class="card bg-base-100 border border-base-300">
        <div class="card-body">
          <h2 class="card-title">Bundled preset</h2>
          <p class="opacity-80">
            Pick a set from <code>public/data</code>. Reference CSVs can be bundled so you don't need to upload them each time.
          </p>
          <div class="flex items-center gap-3">
            <select class="select select-bordered w-full max-w-lg" v-model="selectedPreset">
              <option disabled value="">— Select a preset —</option>
              <option v-for="s in presets" :key="s.path" :value="s.path">
                {{ s.name }} ({{ s.files.length }} files)
              </option>
            </select>
            <button class="btn" :disabled="!selectedPreset || !haveBookAndGathering" @click="loadPreset">Load preset</button>
          </div>
          <div class="text-sm mt-2" v-if="!haveBookAndGathering">
            <span class="opacity-70">Upload <code>recipe_book.csv</code> and <code>recipe_gathering.csv</code> once (or bundle them in <code>public/</code>).</span>
          </div>
        </div>
      </div>

      <div class="grid md:grid-cols-2 gap-6">
        <FileDrop v-if="!recipeBookText" title="Upload recipe_book.csv" accept=".csv" @files="onRecipeBook" />
        <FileDrop v-if="!gatheringText" title="Upload recipe_gathering.csv" accept=".csv" @files="onGathering" />
      </div>
    </div>

    <div class="mt-6 flex gap-3">
      <button class="btn btn-primary" :disabled="!ready" @click="processAll">Process</button>
      <span class="opacity-70" v-if="!ready">Provide both recipe files and a parts set.</span>
    </div>

    <ResultsTabs
      v-if="resultsReady"
      :crafted-rows="craftedRows"
      :gathering-no-loc="gatheringNoLoc"
      :gathering-with-loc="gatheringWithLoc"
      :tree-text="treeText"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import FileDrop from './components/FileDrop.vue';
import ResultsTabs from './components/ResultsTabs.vue';
import { readFileText } from './lib/csv';
import {
  buildTopLevel,
  parseRecipeBookCsv,
  parseGatheringCsv,
  buildCraftedTotals,
  buildGatheringList,
  formatRecipeTree,
} from './lib/logic';

type Mode = 'upload' | 'preset';
const mode = ref<Mode>('preset');

const recipeBookText = ref<string | null>(null);
const gatheringText = ref<string | null>(null);
const partsTexts = ref<string[]>([]);

const craftedRows = ref<{ Item: string; Quantity: number }[]>([]);
const gatheringNoLoc = ref<Record<string, string | number>[]>([]);
const gatheringWithLoc = ref<Record<string, string | number>[]>([]);
const treeText = ref('');

function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme') || 'dark';
  html.setAttribute('data-theme', current === 'dark' ? 'emerald' : 'dark');
}

async function onRecipeBook(files: File[]) {
  recipeBookText.value = files.length ? await readFileText(files[0]) : null;
}
async function onGathering(files: File[]) {
  gatheringText.value = files.length ? await readFileText(files[0]) : null;
}
async function onParts(files: File[]) {
  partsTexts.value = await Promise.all(files.map(readFileText));
}

const haveBookAndGathering = computed(() => !!recipeBookText.value && !!gatheringText.value);
const ready = computed(() => haveBookAndGathering.value && partsTexts.value.length > 0);
const resultsReady = computed(() => craftedRows.value.length > 0);

function processAll() {
  if (!ready.value) return;

  const topMap = buildTopLevel(partsTexts.value);
  const crafted = buildCraftedTotals(topMap);
  const recipes = parseRecipeBookCsv(recipeBookText.value!);
  const gathering = parseGatheringCsv(gatheringText.value!);
  const gatheringRows = buildGatheringList(topMap, recipes, gathering);

  craftedRows.value = crafted;
  gatheringWithLoc.value = gatheringRows.map((r) => ({
    Ingredient: r.Ingredient,
    'Total Quantity': r['Total Quantity'],
    Method: r.Method ?? 'unknown',
    'Location Info': r['Location Info'] ?? '',
  }));
  gatheringNoLoc.value = gatheringRows.map((r) => ({
    Ingredient: r.Ingredient,
    'Total Quantity': r['Total Quantity'],
    Method: r.Method ?? 'unknown',
  }));
  treeText.value = formatRecipeTree(topMap, recipes);
}

// ---- Presets (public/manifest.json) ----
interface Preset { name: string; path: string; files: string[] }
const presets = ref<Preset[]>([]);
const selectedPreset = ref('');

onMounted(async () => {
  try {
    const base = import.meta.env.BASE_URL; // important for GitHub Pages
    const res = await fetch(`${base}manifest.json`);
    if (res.ok) {
      const j = await res.json();
      presets.value = j.sets ?? [];

      // Auto-load bundled reference files if included
      if (j.reference?.recipe_book) {
        const rb = await (await fetch(`${base}${j.reference.recipe_book}`)).text();
        recipeBookText.value = rb;
      }
      if (j.reference?.recipe_gathering) {
        const rg = await (await fetch(`${base}${j.reference.recipe_gathering}`)).text();
        gatheringText.value = rg;
      }
    }
  } catch {
    // ignore fetch errors in dev when public/ not present
  }
});

async function loadPreset() {
  if (!selectedPreset.value) return;
  const set = presets.value.find((p) => p.path === selectedPreset.value);
  if (!set) return;

  const base = import.meta.env.BASE_URL;
  const texts: string[] = [];
  for (const fname of set.files) {
    const url = `${base}${set.path}${fname}`;
    const res = await fetch(url);
    texts.push(await res.text());
  }
  partsTexts.value = texts;
}
</script>
