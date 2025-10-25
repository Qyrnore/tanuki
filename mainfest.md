# Project: tanuki-workshop-web (pnpm + Tailwind v4 + daisyUI v5)

A Vue + TypeScript SPA that reproduces your Jupyter workflow (crafted totals, gathering lists, recipe tree) client‑side. Uses Tailwind **v4** + daisyUI **v5** and deploys to GitHub Pages via Actions. This version is aligned with your last request: **pnpm** and **newest Tailwind/daisyUI combo**.

> Browser sandbox note: sites can’t read local folders. We support CSV uploads **and** a “bundled preset” mode that fetches CSVs shipped under `public/`.

---

## Tailwind v4 & PostCSS

> Tailwind v4 uses CSS-first config; no `tailwind.config.js` or `postcss.config` needed. The Vite plugin handles integration.

---

---

### src/lib/logic.ts
```ts
import { parseCsvLoose } from './csv'
import type { RecipesMap, GatheringMap, GatheringInfo, RequirementRow } from './types'

export function buildTopLevelFromPartsCsvs(filesText: string[]): Map<string, number> {
  const totals = new Map<string, number>()
  for (const text of filesText) {
    const rows = parseCsvLoose(text)
    for (const r of rows) {
      if (r.length < 2) continue
      const name = r[0]
      const qty = Number(r[1])
      if (!Number.isFinite(qty)) continue
      totals.set(name, (totals.get(name) ?? 0) + qty)
    }
  }
  return totals
}

export function parseRecipeBookCsv(text: string): RecipesMap {
  const rows = parseCsvLoose(text)
  const recipes: RecipesMap = {}
  for (const row of rows) {
    if (!row[0]) continue
    const product = row[0]
    const ingList: Array<{ ingredient: string; qty: number }> = []
    for (let i = 1; i < row.length; i += 2) {
      const ing = row[i]
      const qty = Number(row[i + 1] ?? '0')
      if (!ing) break
      ingList.push({ ingredient: ing, qty: Number.isFinite(qty) ? qty : 0 })
    }
    recipes[product] = ingList
  }
  return recipes
}

export function parseGatheringCsv(text: string): GatheringMap {
  const rows = parseCsvLoose(text)
  const map: GatheringMap = {}
  for (const row of rows) {
    const name = row[0]
    if (!name) continue
    const method = (row[1] ?? 'unknown').toString().trim() || 'unknown'
    const location = row.slice(2).filter((s) => s && s.trim()).join(', ')
    map[name] = { method, location }
  }
  return map
}

export function computeBaseRequirements(
  item: string,
  multiplier: number,
  recipes: RecipesMap,
  bucket: Map<string, number>,
) {
  const ingList = recipes[item]
  if (!ingList || ingList.length === 0) {
    bucket.set(item, (bucket.get(item) ?? 0) + multiplier)
    return
  }
  for (const { ingredient, qty } of ingList) {
    const options = ingredient.split('|').map((s) => s.trim()).filter(Boolean)
    const share = qty * multiplier / options.length
    for (const opt of options) {
      computeBaseRequirements(opt, share, recipes, bucket)
    }
  }
}

export function buildGatheringList(
  topLevel: Map<string, number>,
  recipes: RecipesMap,
  gathering: GatheringMap,
): RequirementRow[] {
  const req = new Map<string, number>()
  for (const [product, qty] of topLevel) {
    computeBaseRequirements(product, qty, recipes, req)
  }

  const rows: RequirementRow[] = []
  for (const [ingredient, totalQty] of Array.from(req.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    const gi = gathering[ingredient] as GatheringInfo | undefined
    rows.push({
      Ingredient: ingredient,
      'Total Quantity': totalQty,
      Method: gi?.method ?? 'unknown',
      'Location Info': gi?.location ?? '',
    })
  }
  return rows
}

export function buildCraftedTotals(topLevel: Map<string, number>): { Item: string; Quantity: number }[] {
  return Array.from(topLevel.entries())
    .map(([item, quantity]) => ({ Item: item, Quantity: quantity }))
    .sort((a, b) => a.Item.localeCompare(b.Item))
}

export function formatRecipeTree(
  topLevel: Map<string, number>,
  recipes: RecipesMap,
): string {
  const items = Array.from(topLevel.entries())
  const lines: string[] = ['=== Recipe Breakdown ===']

  const fmtNode = (name: string, qty: number, prefix = '', isLast = false) => {
    const branch = isLast ? '└── ' : '├── '
    lines.push(`${prefix}${branch}(${trimZeros(qty)}) ${name}`)
    const kids = recipes[name]
    if (!kids || kids.length === 0) return
    kids.forEach((k, idx) => {
      const last = idx === kids.length - 1
      const nextPrefix = prefix + (isLast ? '    ' : '│   ')
      fmtNode(k.ingredient, k.qty * qty, nextPrefix, last)
    })
  }

  items.forEach(([prod, qty], idx) => {
    fmtNode(prod, qty, '', idx === items.length - 1)
    lines.push('|')
  })

  return lines.join('
') + '
'
}

function trimZeros(n: number): string {
  return Number.isInteger(n) ? `${n}` : `${+n.toFixed(6)}`.replace(/\.0+$/, '')
}
```

---

### src/components/FileDrop.vue
```vue
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

<script lang="ts" setup>
import { ref } from 'vue'

const props = defineProps<{
  title: string
  subtitle?: string
  accept?: string
  multiple?: boolean
}>()

const emit = defineEmits<{
  (e: 'files', files: File[]): void
}>()

const dragOver = ref(false)

function onPick(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  emit('files', files)
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  const files = Array.from(e.dataTransfer?.files ?? [])
  emit('files', files)
}
</script>
```

---

### src/components/DataTable.vue
```vue
<template>
  <div class="overflow-x-auto">
    <table class="table table-zebra w-full">
      <thead>
        <tr>
          <th v-for="h in headers" :key="h">{{ h }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, idx) in rows" :key="idx">
          <td v-for="h in headers" :key="h">{{ row[h] }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps<{
  headers: string[]
  rows: Record<string, string | number>[]
}>()
</script>
```

---

### src/components/RecipeTree.vue
```vue
<template>
  <div class="mockup-code whitespace-pre-wrap">
    <pre data-prefix=">"><code>{{ text }}</code></pre>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps<{ text: string }>()
</script>
```

---

### src/components/ResultsTabs.vue
```vue
<template>
  <div class="mt-6">
    <div role="tablist" class="tabs tabs-lifted">
      <input type="radio" name="tabs" role="tab" class="tab" aria-label="Crafted Items" checked />
      <div role="tabpanel" class="tab-content bg-base-100 border-base-300 rounded-box p-6">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-lg font-semibold">Total Crafted Items</h3>
          <button class="btn btn-sm" @click="downloadCrafted">Download CSV</button>
        </div>
        <DataTable :headers="['Item','Quantity']" :rows="craftedRows" />
      </div>

      <input type="radio" name="tabs" role="tab" class="tab" aria-label="Gathering (no location)" />
      <div role="tabpanel" class="tab-content bg-base-100 border-base-300 rounded-box p-6">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-lg font-semibold">Gathering List (no location)</h3>
          <button class="btn btn-sm" @click="downloadGathering(false)">Download CSV</button>
        </div>
        <DataTable :headers="['Ingredient','Total Quantity','Method']" :rows="gatheringNoLoc" />
      </div>

      <input type="radio" name="tabs" role="tab" class="tab" aria-label="Gathering (with location)" />
      <div role="tabpanel" class="tab-content bg-base-100 border-base-300 rounded-box p-6">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-lg font-semibold">Gathering List (with location)</h3>
          <button class="btn btn-sm" @click="downloadGathering(true)">Download CSV</button>
        </div>
        <DataTable :headers="['Ingredient','Total Quantity','Method','Location Info']" :rows="gatheringWithLoc" />
      </div>

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

<script lang="ts" setup>
import DataTable from './DataTable.vue'
import RecipeTree from './RecipeTree.vue'
import { toCsv } from '@/lib/csv'

const props = defineProps<{
  craftedRows: { Item: string; Quantity: number }[]
  gatheringNoLoc: Record<string, string | number>[]
  gatheringWithLoc: Record<string, string | number>[]
  treeText: string
}>()

function dl(name: string, text: string, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function downloadCrafted() {
  const rows = [["Item","Quantity"], ...props.craftedRows.map(r => [r.Item, r.Quantity])]
  dl('workshop_output.csv', toCsv(rows), 'text/csv')
}

function downloadGathering(withLoc: boolean) {
  const headers = withLoc ? ['Ingredient','Total Quantity','Method','Location Info'] : ['Ingredient','Total Quantity','Method']
  const rows = (withLoc ? props.gatheringWithLoc : props.gatheringNoLoc) as any[]
  const out = [headers, ...rows.map((r) => headers.map((h) => r[h] ?? ''))]
  dl('gathering_list.csv', toCsv(out), 'text/csv')
}

function downloadTree() {
  dl('recipe_tree.txt', props.treeText, 'text/plain')
}
</script>
```

---

### src/App.vue (with **preset mode** wired to `public/manifest.json`)
```vue
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

    <div v-else class="grid gap-6">
      <div class="card bg-base-100 border border-base-300">
        <div class="card-body">
          <h2 class="card-title">Bundled preset</h2>
          <p class="opacity-80">Pick a set served from <code>public/data</code>. Upload <code>recipe_book.csv</code> and <code>recipe_gathering.csv</code> once (we also support bundling them in <code>public/</code>).</p>
          <div class="flex items-center gap-3">
            <select class="select select-bordered w-full max-w-lg" v-model="selectedPreset">
              <option disabled value="">— Select a preset —</option>
              <option v-for="s in presets" :key="s.path" :value="s.path">{{ s.name }} ({{ s.files.length }} files)</option>
            </select>
            <button class="btn" :disabled="!selectedPreset || !haveBookAndGathering" @click="loadPreset">Load preset</button>
          </div>
          <div class="text-sm mt-2" v-if="!haveBookAndGathering">
            <span class="opacity-70">Upload <code>recipe_book.csv</code> and <code>recipe_gathering.csv</code> first.</span>
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

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import FileDrop from './components/FileDrop.vue'
import ResultsTabs from './components/ResultsTabs.vue'
import { readFileText } from './lib/csv'
import { buildTopLevelFromPartsCsvs, parseRecipeBookCsv, parseGatheringCsv, buildCraftedTotals, buildGatheringList, formatRecipeTree } from './lib/logic'

const mode = ref<'upload'|'preset'>('preset')

const recipeBookText = ref<string | null>(null)
const gatheringText = ref<string | null>(null)
const partsTexts = ref<string[]>([])

const craftedRows = ref<{ Item: string; Quantity: number }[]>([])
const gatheringNoLoc = ref<Record<string, string | number>[]>([])
const gatheringWithLoc = ref<Record<string, string | number>[]>([])
const treeText = ref('')

function toggleTheme() {
  const html = document.documentElement
  const current = html.getAttribute('data-theme') || 'dark'
  html.setAttribute('data-theme', current === 'dark' ? 'emerald' : 'dark')
}

async function onRecipeBook(files: File[]) {
  recipeBookText.value = files.length ? await readFileText(files[0]) : null
}
async function onGathering(files: File[]) {
  gatheringText.value = files.length ? await readFileText(files[0]) : null
}
async function onParts(files: File[]) {
  partsTexts.value = await Promise.all(files.map(readFileText))
}

const haveBookAndGathering = computed(() => !!recipeBookText.value && !!gatheringText.value)
const ready = computed(() => haveBookAndGathering.value && partsTexts.value.length > 0)
const resultsReady = computed(() => craftedRows.value.length > 0)

function processAll() {
  if (!haveRefs.value || partsDocs.value.length === 0) return;

  const topMap = buildTopLevelFromWeightedParts(partsDocs.value);
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

  if (craftedRows.value.length === 0) {
    alert('Processed, but produced no rows. This usually means the selected CSVs didn’t load. Verify that item CSV URLs are reachable.');
  }
}

interface Preset { name: string; path: string; files: string[] }
const presets = ref<Preset[]>([])
const selectedPreset = ref('')

onMounted(async () => {
  try {
    const res = await fetch('/manifest.json')
    if (res.ok) {
      const j = await res.json()
      presets.value = j.sets ?? []

      // Optional: auto-load bundled reference files if present
      if (j.reference?.recipe_book) {
        const rb = await (await fetch('/' + j.reference.recipe_book)).text()
        recipeBookText.value = rb
      }
      if (j.reference?.recipe_gathering) {
        const rg = await (await fetch('/' + j.reference.recipe_gathering)).text()
        gatheringText.value = rg
      }
    }
  } catch {}
})

async function loadPreset() {
  if (!selectedPreset.value) return
  const set = presets.value.find(p => p.path === selectedPreset.value)
  if (!set) return
  const texts: string[] = []
  for (const fname of set.files) {
    const url = `/${set.path}${fname}`
    const res = await fetch(url)
    texts.push(await res.text())
  }
  partsTexts.value = texts
}
</script>
```

---

### .github/workflows/pages.yml (pnpm)
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch: {}

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Build
        run: |
          REPO_NAME=${{ github.event.repository.name }}
          pnpm exec vite build --base="/${REPO_NAME}/"

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

---

## Public data (drop-in)
Place the contents of **`public_full_bundle.zip`** in your repo root so you have:
```
public/
  manifest.json
  recipe_book.csv
  recipe_gathering.csv
  data/workshop_parts/*.csv
```
This enables **preset mode** without any uploads.

---

## README (pnpm quick start)
```md
# Tanuki Workshop Web (Vue + TS + Tailwind v4 + daisyUI v5)

## Dev
pnpm install
pnpm dev

## Build
pnpm build

## Deploy (GitHub Pages)
Push to `main`. Ensure Settings → Pages → Source = GitHub Actions. Workflow deploys automatically.

## Using the app
- Manual upload mode: drop `recipe_book.csv`, `recipe_gathering.csv`, then all `workshop_parts/*.csv` files.
- Preset mode: pick from `public/data` sets (manifest-driven). Reference CSVs can be bundled to avoid uploads.
```
