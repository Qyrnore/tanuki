<template>
  <div class="card bg-base-100 border border-base-300">
    <div class="card-body gap-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="card-title">Pick workshop items &amp; quantities</h2>
        <div class="flex gap-2">
          <button
            class="btn btn-primary btn-sm"
            :disabled="selectedCount === 0"
            @click="processNow"
            title="Process with current selection"
          >
            Calculate New Project ({{ selectedCount }})
          </button>
          <button class="btn btn-ghost btn-sm" :disabled="selectedCount === 0" @click="clearAll">
            Clear
          </button>
        </div>
      </div>

      <!-- Two balanced columns inside the panel -->
      <div class="grid gap-5 md:grid-cols-2">
        <!-- Left: searchable file list -->
        <div>
          <div class="join w-full">
            <input v-model="q" class="input input-bordered join-item w-full" placeholder="Search CSV names…" />
            <button class="btn join-item" @click="q = ''">Clear</button>
          </div>
          <div class="text-xs opacity-70 mt-2">
            Showing {{ filtered.length }} of {{ files.length }} files.
          </div>

          <div class="flex gap-2 mt-3">
            <button class="btn btn-xs" @click="selectAllFiltered">Select filtered</button>
            <button class="btn btn-xs" @click="invertSelection">Invert</button>
          </div>

          <div class="mt-3 h-80 overflow-auto rounded border border-base-300">
            <ul class="menu menu-sm">
              <li v-for="f in filtered" :key="f">
                <label class="flex items-center gap-2 px-3 py-2">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-sm"
                    :checked="qtyMap.get(f) !== undefined"
                    @change="toggle(f)"
                  />
                  <span class="truncate">{{ f }}</span>
                </label>
              </li>
            </ul>
          </div>
        </div>

        <!-- Right: selected list with quantities -->
        <div>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">Selected ({{ selectedCount }})</h3>
          </div>

          <div class="mt-3 h-80 overflow-auto rounded border border-base-300">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Item CSV</th>
                  <th class="w-48">Quantity</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="f in selectedList" :key="f">
                  <td class="truncate">{{ f }}</td>
                  <td>
                    <div class="join">
                      <button class="btn btn-xs join-item" @click="dec(f)">-</button>
                      <input
                        class="input input-bordered input-xs join-item w-16 text-center"
                        :value="qtyMap.get(f) ?? 1"
                        @input="onQtyInput(f, $event)"
                        inputmode="numeric"
                      />
                      <button class="btn btn-xs join-item" @click="inc(f)">+</button>
                    </div>
                  </td>
                  <td class="text-right">
                    <button class="btn btn-ghost btn-xs" title="Remove" @click="remove(f)">✕</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p class="text-xs opacity-70 mt-3">
            Quantities behave like duplicating a file in the old workflow (e.g., <b>3</b> == three copies).
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{
  /** Folder path to the CSVs, e.g. "data/fabrication_requirements/" (must end with `/`) */
  basePath: string;
  /** Filenames inside basePath, e.g. ["Cobalt Ingot.csv", "Steel Joint Plate.csv"] */
  files: string[];
  /** When false, disable Process (e.g., refs not loaded yet) */
  canProcess?: boolean;
}>();

const emit = defineEmits<{
  /** Emits weighted docs and expects the app to process immediately */
  (e: 'process', docs: { name: string; text: string; qty: number }[]): void;
}>();

const q = ref('');
const qtyMap = ref<Map<string, number>>(new Map()); // filename -> qty >= 1

const filtered = computed(() => {
  const s = q.value.trim().toLowerCase();
  if (!s) return props.files.slice();
  return props.files.filter((f) => f.toLowerCase().includes(s));
});

const selectedList = computed(() =>
  Array.from(qtyMap.value.keys()).sort((a, b) => a.localeCompare(b)),
);
const selectedCount = computed(() => qtyMap.value.size);

function toggle(f: string) {
  const m = new Map(qtyMap.value);
  if (m.has(f)) m.delete(f);
  else m.set(f, 1);
  qtyMap.value = m;
}
function selectAllFiltered() {
  const m = new Map(qtyMap.value);
  for (const f of filtered.value) if (!m.has(f)) m.set(f, 1);
  qtyMap.value = m;
}
function invertSelection() {
  const current = new Set(qtyMap.value.keys());
  const m = new Map<string, number>();
  for (const f of filtered.value) {
    if (!current.has(f)) m.set(f, 1);
  }
  // keep selections outside filter unchanged
  for (const f of qtyMap.value.keys()) {
    if (!filtered.value.includes(f)) m.set(f, qtyMap.value.get(f)!);
  }
  qtyMap.value = m;
}
function clearAll() {
  qtyMap.value = new Map();
}
function remove(f: string) {
  const m = new Map(qtyMap.value);
  m.delete(f);
  qtyMap.value = m;
}

function clampInt(v: number, min = 1, max = 9999) {
  if (!Number.isFinite(v)) return 1;
  v = Math.floor(v);
  if (v < min) v = min;
  if (v > max) v = max;
  return v;
}
function inc(f: string) {
  const m = new Map(qtyMap.value);
  const cur = m.get(f) ?? 1;
  m.set(f, clampInt(cur + 1));
  qtyMap.value = m;
}
function dec(f: string) {
  const m = new Map(qtyMap.value);
  const cur = m.get(f) ?? 1;
  m.set(f, clampInt(cur - 1));
  qtyMap.value = m;
}
function onQtyInput(f: string, e: Event) {
  const raw = (e.target as HTMLInputElement).value;
  const n = clampInt(Number(raw));
  const m = new Map(qtyMap.value);
  m.set(f, n);
  qtyMap.value = m;
}

function isHtml(ct: string | null | undefined) {
  return (ct ?? '').toLowerCase().includes('text/html');
}

/** Try a list of candidate URLs and return the first CSV text that works. */
async function tryFetchCsv(candidates: string[]): Promise<string | null> {
  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn('[ConfigureProject] fetch not ok', res.status, url);
        continue;
      }
      const ct = res.headers.get('content-type');
      if (isHtml(ct)) {
        console.warn('[ConfigureProject] got HTML (SPA fallback) for', url);
        continue;
      }
      const t = await res.text();
      // Tiny sanity: discourage clearly-empty files
      if (!t || !t.trim()) {
        console.warn('[ConfigureProject] empty CSV for', url);
        continue;
      }
      return t;
    } catch (e) {
      console.warn('[ConfigureProject] fetch error for', url, e);
    }
  }
  return null;
}

async function processNow() {
  const docs: { name: string; text: string; qty: number }[] = [];

  // Build a few candidate URL shapes to survive both Vite dev and GitHub Pages.
  const origin = window.location.origin;                                 // http://localhost:5173
  const base   = import.meta.env.BASE_URL;                               // "/" (dev) or "/repo/" (Pages)
  const absBase = new URL(base, origin).toString();                      // absolute base

  for (const f of selectedList.value) {
    const enc = encodeURIComponent(f);
    const candidates = [
      // Preferred
      `${absBase}${props.basePath}${enc}`,
      // Fallbacks that help if BASE_URL or trailing slashes are off
      `${base}${props.basePath}${enc}`,
      `${props.basePath}${enc}`,
      `/${props.basePath}${enc}`,
    ];

    const text = await tryFetchCsv(candidates);
    if (text) {
      const qty = qtyMap.value.get(f) ?? 1;
      docs.push({ name: f, text, qty: clampInt(qty) });
    }
  }

  console.debug('[ConfigureProject] processed docs:', docs.length);

  if (docs.length === 0) {
    // Show the exact first candidate we tried for easier debugging
    const example = `${absBase}${props.basePath}${encodeURIComponent(selectedList.value[0] ?? '')}`;
    alert(`No item CSVs loaded.\nTried e.g.:\n${example}\n\nCheck that the files exist under /public/${props.basePath} in your project.`);
  }

  emit('process', docs);
}


</script>
