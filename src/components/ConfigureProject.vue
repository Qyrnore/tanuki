<template>
  <div class="card bg-base-100 border border-base-300 min-w-0">
    <div class="card-body gap-5">
      <!-- Header / actions -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="card-title">Configure Batch Project</h2>
        <div class="flex gap-2">
          <button
            class="btn btn-primary btn-sm"
            :disabled="selectedCount === 0"
            @click="processNow"
            title="Process with current selection"
          >
            Calculate Totals ({{ selectedCount }} Recipes Selected)
          </button>
          <button
            class="btn btn-ghost btn-sm"
            :disabled="selectedCount === 0"
            @click="clearAll"
          >
            Clear Selections
          </button>
        </div>
      </div>

      <!-- Two balanced columns; stack on small screens -->
      <div class="grid gap-5 md:grid-cols-2 min-w-0">
        <!-- Left: searchable file list -->
        <div class="min-w-0">
          <div class="join w-full">
            <input
              v-model="q"
              class="input input-bordered join-item w-full"
              placeholder="Search recipe names…"
            />
          </div>
          <div class="text-xs opacity-70 mt-2">
            Showing {{ filtered.length }} of {{ files.length }} recipes.
          </div>

          <div class="flex gap-2 mt-3">
            <button class="btn btn-xs" @click="selectAllFiltered">
              Check All
            </button>
            <button class="btn btn-xs" @click="invertSelection">Invert Checks</button>
          </div>

          <!-- Scroll area constrained; prevents rightward creep -->
          <div class="mt-3 max-h-80 md:max-h-[28rem] overflow-auto rounded border border-base-300">
            <ul class="menu menu-sm">
              <li v-for="f in filtered" :key="f">
                <label class="flex items-center gap-2 px-3 py-2">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-sm"
                    :checked="qtyMap[f] !== undefined"
                    @change="toggle(f)"
                  />
                  <span class="truncate">{{ labelFor(f) }}</span>
                </label>
              </li>
            </ul>
          </div>
        </div>

        <!-- Right: selected list with quantities -->
        <div class="min-w-0">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">Selected Recipes ({{ selectedCount }})</h3>
          </div>

          <!-- Table wrapper with both X/Y scroll constrained -->
          <div class="mt-3 max-h-80 md:max-h-[28rem] overflow-auto overflow-x-auto rounded border border-base-300">
            <table class="table table-sm table-zebra w-full table-fixed">
              <thead class="sticky top-0 bg-base-200 z-10">
                <tr>
                  <th class="w-2/3">Item Name</th>
                  <th class="w-1/3">Quantity</th>
                  <th class="w-10"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="f in selectedList" :key="f">
                  <td class="truncate align-top pt-4 min-w-0">{{ labelFor(f) }}</td>
                  <td>
                    <div class="join">
                      <button class="btn btn-xs join-item" @click="dec(f)">-</button>
                      <!-- Prevent iOS auto-zoom on focus: >=16px on mobile -->
                      <input
                        class="input input-bordered join-item w-20 text-center text-[16px] md:input-xs md:w-16 md:text-xs"
                        :class="{ 'input-error': invalidReason(f) }"
                        :value="qtyMap[f] ?? '1'"
                        @input="onQtyInput(f, $event)"
                        @blur="touch(f)"
                        inputmode="numeric"
                        placeholder="qty"
                        aria-label="Quantity"
                        ref="qtyInputs"
                        :data-key="f"
                      />
                      <button class="btn btn-xs join-item" @click="inc(f)">+</button>
                    </div>
                    <p v-if="touched[f] && invalidReason(f)" class="mt-1 text-[10px] text-error">
                      {{ invalidReason(f) }}
                    </p>
                  </td>
                  <td class="text-right">
                    <button
                      class="btn btn-ghost btn-xs"
                      title="Remove"
                      @click="remove(f)"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p class="text-xs opacity-70 mt-3">
            Workshop projects selected appear here, adjust quantities as needed.
          </p>
          <p class="text-xs opacity-70 mt-1">
            <b>*NOTE:</b> Tanuki only loads in company workshop project recipes by default, see "Custom Recipes & Gathering" for other items.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

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
  (e: "process", docs: { name: string; text: string; qty: number }[]): void;
}>();

const q = ref("");

// Use a plain reactive object for reactivity.
// Store as STRING so users can clear the field during editing.
// New selections default to "1".
const qtyMap = ref<Record<string, string>>({}); // filename -> '1'..'9999' or '' while editing
const touched = ref<Record<string, boolean>>({}); // per-row touched state for error display

// --- helpers to interact with qtyMap like a Map ---
function hasQty(key: string) {
  return Object.prototype.hasOwnProperty.call(qtyMap.value, key);
}
function getQty(key: string): string | undefined {
  return hasQty(key) ? qtyMap.value[key] : undefined;
}
function setQty(key: string, val: string) {
  qtyMap.value = { ...qtyMap.value, [key]: val };
}
function delQty(key: string) {
  const clone = { ...qtyMap.value };
  delete clone[key];
  qtyMap.value = clone;
  const t = { ...touched.value };
  delete t[key];
  touched.value = t;
}
function resetQtyMap(next: Record<string, string>) {
  qtyMap.value = { ...next };
  // reset touched status for any removed rows
  const t: Record<string, boolean> = {};
  for (const k of Object.keys(next)) t[k] = touched.value[k] ?? false;
  touched.value = t;
}

function touch(key: string) {
  touched.value = { ...touched.value, [key]: true };
}

function humanizeFilename(f: string): string {
  // drop extension
  const base = f.replace(/\.[^.]+$/, "");
  // split on underscores/spaces, capitalize first letter
  return base
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

function labelFor(f: string): string {
  return humanizeFilename(f);
}

// --- filtering & selection ---
const filtered = computed(() => {
  const s = q.value.trim().toLowerCase();
  if (!s) return props.files.slice();
  return props.files.filter((f) => {
    const raw = f.toLowerCase();
    const label = labelFor(f).toLowerCase();
    return raw.includes(s) || label.includes(s);
  });
});

const selectedList = computed(() =>
  Object.keys(qtyMap.value).sort((a, b) => a.localeCompare(b))
);
const selectedCount = computed(() => Object.keys(qtyMap.value).length);

function toggle(f: string) {
  if (hasQty(f)) delQty(f);
  else setQty(f, "1"); // default remains 1, no touch() here
}

function selectAllFiltered() {
  const next: Record<string, string> = { ...qtyMap.value };
  for (const f of filtered.value) if (!hasQty(f)) next[f] = "1";
  resetQtyMap(next);
}
function invertSelection() {
  const next: Record<string, string> = {};
  // add items currently in filtered but not selected
  for (const f of filtered.value) if (!hasQty(f)) next[f] = "1";
  // keep selections outside filter unchanged
  for (const [k, v] of Object.entries(qtyMap.value)) {
    if (!filtered.value.includes(k)) next[k] = v;
  }
  resetQtyMap(next);
}
function clearAll() {
  resetQtyMap({});
}
function remove(f: string) {
  delQty(f);
}

// --- quantity helpers ---
function clamp(n: number, min = 1, max = 9999) {
  if (!Number.isFinite(n)) return min;
  n = Math.floor(n);
  if (n < min) n = min;
  if (n > max) n = max;
  return n;
}

/** Parse a string into a positive int; returns null for blank/invalid/<=0 */
function parseQty(s: string | undefined | null): number | null {
  if (s == null) return null;
  if (s.trim() === "") return null; // blank is invalid for processing
  // strictly digits
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return clamp(n, 1, 9999);
}

function inc(f: string) {
  const cur = parseQty(getQty(f));
  const next = clamp((cur ?? 0) + 1);
  setQty(f, String(next));
  touch(f);
}
function dec(f: string) {
  const cur = parseQty(getQty(f) ?? "1"); // treat empty as 1 when stepping
  const next = clamp((cur ?? 1) - 1);
  setQty(f, String(next));
  touch(f);
}
function onQtyInput(f: string, e: Event) {
  const raw = (e.target as HTMLInputElement).value;
  setQty(f, raw); // allow '' while editing
}

function invalidReason(f: string): string | null {
  const v = getQty(f);
  if (v == null) return "Required";
  if (v.trim() === "") return "Quantity is required";
  if (!/^\d+$/.test(v)) return "Use digits only";
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "Must be a positive number";
  if (n > 9999) return "Too large (max 9999)";
  return null;
}

const hasInvalid = computed(() =>
  selectedList.value.some((f) => invalidReason(f) !== null)
);

// --- fetch & process ---
function isHtml(ct: string | null | undefined) {
  return (ct ?? "").toLowerCase().includes("text/html");
}

/** Try a list of candidate URLs and return the first CSV text that works. */
async function tryFetchCsv(candidates: string[]): Promise<string | null> {
  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn("[ConfigureProject] fetch not ok", res.status, url);
        continue;
      }
      const ct = res.headers.get("content-type");
      if (isHtml(ct)) {
        console.warn("[ConfigureProject] got HTML (SPA fallback) for", url);
        continue;
      }
      const t = await res.text();
      if (!t || !t.trim()) {
        console.warn("[ConfigureProject] empty CSV for", url);
        continue;
      }
      return t;
    } catch (e) {
      console.warn("[ConfigureProject] fetch error for", url, e);
    }
  }
  return null;
}

async function processNow() {
  // Block processing if any invalid; focus the first invalid input
  if (hasInvalid.value) {
    // mark all as touched to reveal messages
    const t: Record<string, boolean> = {};
    for (const k of Object.keys(qtyMap.value)) t[k] = true;
    touched.value = t;
    alert("Please fix the highlighted quantities before continuing.");
    return;
  }

  const docs: { name: string; text: string; qty: number }[] = [];

  const origin = window.location.origin; // http://localhost:5173
  const base = import.meta.env.BASE_URL; // "/" (dev) or "/repo/" (Pages)
  const absBase = new URL(base, origin).toString(); // absolute base

  for (const f of selectedList.value) {
    const qtyParsed = parseQty(getQty(f));
    if (qtyParsed === null) continue; // defensive

    const enc = encodeURIComponent(f);
    const candidates = [
      `${absBase}${props.basePath}${enc}`,
      `${base}${props.basePath}${enc}`,
      `${props.basePath}${enc}`,
      `/${props.basePath}${enc}`,
    ];

    const text = await tryFetchCsv(candidates);
    if (text) {
      docs.push({ name: f, text, qty: qtyParsed });
    }
  }

  if (docs.length === 0) {
    const example = `${absBase}${props.basePath}${encodeURIComponent(
      selectedList.value[0] ?? ""
    )}`;
    alert(
      `No item CSVs loaded.\n\nTried e.g.:\n${example}\n\nCheck that the files exist in this project.`
    );
  }

  emit("process", docs);
}
</script>
