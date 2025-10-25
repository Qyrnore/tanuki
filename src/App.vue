<template>
  <div class="min-h-screen p-4 md:p-6">
    <!-- Header -->
    <header class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 mb-5">
      <h1 class="text-3xl font-extrabold tracking-tight">Tanuki</h1>
      <div class="flex items-center gap-2">
        <button
          class="btn btn-sm"
          @click="showRefPanels = !showRefPanels"
          :aria-expanded="showRefPanels"
          aria-controls="custom-ref-panels"
        >
          {{ showRefPanels ? 'Hide' : 'Show' }} custom recipe &amp; gathering
        </button>
        <button class="btn btn-sm" @click="toggleTheme">Toggle Theme</button>
      </div>
    </header>

    <!-- Main content -->
    <main class="max-w-7xl mx-auto">
      <!-- Responsive grid: when results exist, show 12-col with 7/5 split; otherwise left fills all -->
      <div class="grid gap-5 lg:grid-cols-12">
        <!-- LEFT: controls -->
        <section
          :class="resultsReady ? 'lg:col-span-7' : 'lg:col-span-12'"
          class="flex flex-col gap-4"
        >
          <!-- Collapsible custom reference panels -->
          <div
            id="custom-ref-panels"
            v-show="showRefPanels"
            class="grid md:grid-cols-2 gap-4"
          >
            <div class="card bg-base-100 border border-base-300">
              <div class="card-body">
                <h2 class="card-title">Reference: recipe_book.csv</h2>
                <div v-if="recipeBookText" class="badge badge-success badge-sm">Loaded</div>
                <div v-else>
                  <FileDrop title="Upload recipe_book.csv" accept=".csv" @files="onRecipeBook" />
                </div>
              </div>
            </div>

            <div class="card bg-base-100 border border-base-300">
              <div class="card-body">
                <h2 class="card-title">Reference: recipe_gathering.csv</h2>
                <div v-if="gatheringText" class="badge badge-success badge-sm">Loaded</div>
                <div v-else>
                  <FileDrop title="Upload recipe_gathering.csv" accept=".csv" @files="onGathering" />
                </div>
              </div>
            </div>
          </div>

          <!-- Configure Project -->
          <ConfigureProject
            v-if="allItems.length > 0"
            :base-path="itemsBasePath"
            :files="allItems"
            @process="onProcessBundle"
          />

          <p v-if="!haveRefs" class="text-sm opacity-70">
            Reference CSVs must be present before processing (auto-loaded from <code>/public</code> if available,
            or upload via the toggle above).
          </p>
        </section>

        <!-- RIGHT: results (sticky when visible) -->
        <aside v-if="resultsReady" class="lg:col-span-5">
          <div class="lg:sticky lg:top-4">
            <ResultsTabs
              :crafted-rows="craftedRows"
              :gathering-no-loc="gatheringNoLoc"
              :gathering-with-loc="gatheringWithLoc"
              :tree-text="treeText"
            />
          </div>
        </aside>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import FileDrop from './components/FileDrop.vue';
import ResultsTabs from './components/ResultsTabs.vue';
import ConfigureProject from './components/ConfigureProject.vue';

import { readFileText } from './lib/csv';
import {
  buildTopLevelFromWeightedParts,
  parseRecipeBookCsv,
  parseGatheringCsv,
  buildCraftedTotals,
  buildGatheringList,
  formatRecipeTree,
  type PartsDoc,
} from './lib/logic';

// --- UI state ---
const showRefPanels = ref(false);

// --- Reference CSVs ---
const recipeBookText = ref<string | null>(null);
const gatheringText = ref<string | null>(null);
const haveRefs = computed(() => !!recipeBookText.value && !!gatheringText.value);

// --- Selected item docs (with quantities) ---
const partsDocs = ref<PartsDoc[]>([]);

// --- Output viewmodels ---
const craftedRows = ref<{ Item: string; Quantity: number }[]>([]);
const gatheringNoLoc = ref<Record<string, string | number>[]>([]);
const gatheringWithLoc = ref<Record<string, string | number>[]>([]);
const treeText = ref('');
const resultsReady = computed(() => craftedRows.value.length > 0);

function isHtml(ct: string | null | undefined) {
  return (ct ?? '').toLowerCase().includes('text/html');
}
async function fetchTextAsset(path: string): Promise<string | null> {
  const origin = window.location.origin;
  const base   = import.meta.env.BASE_URL;
  const absBase = new URL(base, origin).toString();
  const candidates = [
    `${absBase}${path}`,
    `${base}${path}`,
    `${path}`,
    `/${path}`,
  ];
  for (const url of candidates) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const ct = r.headers.get('content-type');
      if (isHtml(ct)) continue;
      const t = await r.text();
      if (t && t.trim()) return t;
    } catch {}
  }
  return null;
}

// --- Theme toggle ---
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme') || 'dark';
  html.setAttribute('data-theme', current === 'dark' ? 'emerald' : 'dark');
}

// --- Clear results when inputs change ---
function clearResults() {
  craftedRows.value = [];
  gatheringNoLoc.value = [];
  gatheringWithLoc.value = [];
  treeText.value = '';
}

// --- Upload fallbacks for references ---
async function onRecipeBook(files: File[] | FileList | readonly File[]) {
  const f = (files as any)?.[0] as File | undefined;
  recipeBookText.value = f ? await readFileText(f) : null;
  clearResults();
}

async function onGathering(files: File[] | FileList | readonly File[]) {
  const f = (files as any)?.[0] as File | undefined;
  gatheringText.value = f ? await readFileText(f) : null;
  clearResults();
}

// --- One-click process from ConfigureProject ---
// --- Compute pipeline ---
async function onProcessBundle(docs: PartsDoc[]) {
  console.debug('[App] onProcessBundle docs:', docs.length);
  partsDocs.value = docs;

  if (!docs.length) {
    // User clicked with no selection or fetch failed for all
    alert('No items selected or files failed to load. Try selecting at least one CSV.');
    return;
  }
  if (!haveRefs.value) {
    alert('Missing references: recipe_book.csv and/or recipe_gathering.csv. Toggle the panel to provide them or add them to /public.');
    return;
  }

  clearResults();
  processAll();
}

function processAll() {
  if (!haveRefs.value || partsDocs.value.length === 0) return;

  console.time('[App] processAll');
  const topMap = buildTopLevelFromWeightedParts(partsDocs.value);
  console.debug('[App] topMap size:', topMap.size);

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

  console.debug('[App] crafted rows:', craftedRows.value.length, 'gather rows:', gatheringRows.length);
  console.timeEnd('[App] processAll');

  if (craftedRows.value.length === 0) {
    // Surface a gentle hint if we processed but produced nothing
    alert('Processed, but produced no rows. This usually means the selected CSVs did not parse as "Item,Quantity". Try a different file.');
  }
}


// --- Load refs + manifest list on mount ---
const itemsBasePath = ref<'data/fabrication_requirements/' | 'data/all_items/'>('data/fabrication_requirements/');
const allItems = ref<string[]>([]);

onMounted(async () => {
  // 1) Auto-load the two reference CSVs from /public
  recipeBookText.value = await fetchTextAsset('recipe_book.csv');
  gatheringText.value  = await fetchTextAsset('recipe_gathering.csv');

  // 2) Load a manifest that describes the CSV files for ConfigureProject
  //    We support a few shapes so this "just works":
  //    A) { sets: [{ path: "...", files: [...] }, ...] }
  //    B) { path: "...", files: [...] }
  //    C) [ "file1.csv", "file2.csv", ... ]   (assume fabrication_requirements path)
  let manifestText =
    (await fetchTextAsset('manifest.json')) ??
    (await fetchTextAsset('data/manifest.json')); // optional fallback

  if (manifestText) {
    try {
      const m = JSON.parse(manifestText);

      // A) sets[]
      if (m?.sets && Array.isArray(m.sets)) {
        // Prefer the new folder, fall back to old if needed
        let set = m.sets.find((s: any) => s?.path === 'data/fabrication_requirements/');
        if (set?.path && Array.isArray(set.files)) {
          itemsBasePath.value = set.path;
          allItems.value = set.files as string[];
        }
      }
      // B) single object with path/files
      else if (m?.path && Array.isArray(m.files)) {
        itemsBasePath.value = m.path;
        allItems.value = m.files as string[];
      }
      // C) bare array of filenames
      else if (Array.isArray(m)) {
        itemsBasePath.value = 'data/fabrication_requirements/';
        allItems.value = m as string[];
      }
    } catch {
      /* ignore bad JSON */
    }
  }

  // Optional: visible status for quick debugging
  console.debug('[App] refs:', { recipe: !!recipeBookText.value, gathering: !!gatheringText.value });
  console.debug('[App] items path:', itemsBasePath.value, 'count:', allItems.value.length);
});

</script>
