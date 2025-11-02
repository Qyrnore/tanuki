<template>
  <div class="card bg-base-100 border border-base-300 min-w-0">
    <div class="card-body gap-5">
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

      <div v-if="hasInvalid" class="alert alert-warning text-sm" role="alert">
        Some quantities are blank or invalid. Please enter a positive whole number for all selected rows.
      </div>

      <div class="grid gap-5 md:grid-cols-2 min-w-0">
        <!-- Left: searchable list + optional excludes editor -->
        <div class="min-w-0">
          <!-- Search -->
          <div class="join w-full">
            <input
              v-model="q"
              class="input input-bordered join-item w-full"
              placeholder="Search recipe names…"
            />
            <button class="btn join-item" @click="q = ''">Clear</button>
          </div>

          <!-- Toggle visibility of excludes box (excludes always active regardless) -->
          <div class="mt-3">
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" class="checkbox checkbox-sm" v-model="showExcludes" />
              <span>Show exclude controls</span>
            </label>
          </div>

          <!-- Excludes textbox (pre-filled; always applied even when hidden) -->
          <div v-show="showExcludes" class="mt-2 flex items-center gap-2">
            <input
              v-model="excludeText"
              class="input input-bordered input-sm w-full"
              placeholder="Comma-separated excludes (e.g., Roof, Signboard, …)"
            />
            <button class="btn btn-sm" @click="resetExcludes" title="Reset to defaults">Reset</button>
          </div>

          <div class="text-xs opacity-70 mt-2">
            Showing {{ filtered.length }} of {{ files.length }} recipes.
          </div>

          <div class="flex gap-2 mt-3">
            <button class="btn btn-xs" @click="selectAllFiltered">Check All</button>
            <button class="btn btn-xs" @click="invertSelection">Invert Checks</button>
          </div>

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
                    <button class="btn btn-ghost btn-xs" title="Remove" @click="remove(f)">✕</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p class="text-xs opacity-70 mt-3">
            Workshop projects selected appear here, adjust quantities as needed.
          </p>
          <p class="text-xs opacity-70 mt-1">
            <b>*NOTE:</b> Tanuki only loads company workshop project recipes by default, see “Custom Recipes &amp; Gathering” for other items.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

const props = defineProps<{
  basePath: string;
  files: string[];
  canProcess?: boolean;
}>();

const emit = defineEmits<{
  (e: "process", docs: { name: string; text: string; qty: number }[]): void;
}>();

const q = ref("");

// humanized label from filename
function humanizeFileName(file: string): string {
  const base = file.replace(/\.csv$/i, "");
  return base
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
function labelFor(file: string) {
  return humanizeFileName(file);
}

// Show/hide excludes editor (excludes apply regardless)
const showExcludes = ref(false);

// Excludes text (pre-filled with defaults). Always applied, even when hidden.
const DEFAULT_EXCLUDES = [
  "Roof",
  "Signboard",
  "Wall Decoration",
  "Fence",
  "Door",
  "Exterior",
  "Window",
  "Roof Decoration",
];
const excludeText = ref(DEFAULT_EXCLUDES.join(", "));

function resetExcludes() {
  excludeText.value = DEFAULT_EXCLUDES.join(", ");
}

// Parse active excludes from excludeText
const excludeTerms = computed(() => {
  return new Set(
    excludeText.value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.toLowerCase())
  );
});

// selection state
const qtyMap = ref<Record<string, string>>({});
const touched = ref<Record<string, boolean>>({});

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
  const t: Record<string, boolean> = {};
  for (const k of Object.keys(next)) t[k] = touched.value[k] ?? false;
  touched.value = t;
}
function touch(key: string) {
  touched.value = { ...touched.value, [key]: true };
}

// filtering: search + always-on excludes
function isExcluded(file: string): boolean {
  if (excludeTerms.value.size === 0) return false;
  const label = labelFor(file).toLowerCase();
  for (const term of excludeTerms.value) {
    if (label.includes(term)) return true;
  }
  return false;
}
const filtered = computed(() => {
  const s = q.value.trim().toLowerCase();
  const list = !s
    ? props.files.slice()
    : props.files.filter((f) => labelFor(f).toLowerCase().includes(s));
  return list.filter((f) => !isExcluded(f));
});

const selectedList = computed(() =>
  Object.keys(qtyMap.value).sort((a, b) => a.localeCompare(b))
);
const selectedCount = computed(() => Object.keys(qtyMap.value).length);

// selection ops
function toggle(f: string) {
  if (hasQty(f)) delQty(f);
  else setQty(f, "1");
}
function selectAllFiltered() {
  const next: Record<string, string> = { ...qtyMap.value };
  for (const f of filtered.value) if (!hasQty(f)) next[f] = "1";
  resetQtyMap(next);
}
function invertSelection() {
  const next: Record<string, string> = {};
  for (const f of filtered.value) if (!hasQty(f)) next[f] = "1";
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

// qty helpers
function clamp(n: number, min = 1, max = 9999) {
  if (!Number.isFinite(n)) return min;
  n = Math.floor(n);
  if (n < min) n = min;
  if (n > max) n = max;
  return n;
}
function parseQty(s: string | undefined | null): number | null {
  if (s == null) return null;
  if (s.trim() === "") return null;
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
  const cur = parseQty(getQty(f) ?? "1");
  const next = clamp((cur ?? 1) - 1);
  setQty(f, String(next));
  touch(f);
}
function onQtyInput(f: string, e: Event) {
  const raw = (e.target as HTMLInputElement).value;
  setQty(f, raw);
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

// fetch & process
function isHtml(ct: string | null | undefined) {
  return (ct ?? "").toLowerCase().includes("text/html");
}
async function tryFetchCsv(candidates: string[]): Promise<string | null> {
  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const ct = res.headers.get("content-type");
      if (isHtml(ct)) continue;
      const t = await res.text();
      if (!t || !t.trim()) continue;
      return t;
    } catch {}
  }
  return null;
}

async function processNow() {
  if (hasInvalid.value) {
    const t: Record<string, boolean> = {};
    for (const k of Object.keys(qtyMap.value)) t[k] = true;
    touched.value = t;
    alert("Please fix the highlighted quantities before continuing.");
    return;
  }

  const docs: { name: string; text: string; qty: number }[] = [];
  const origin = window.location.origin;
  const base = import.meta.env.BASE_URL;
  const absBase = new URL(base, origin).toString();

  for (const f of selectedList.value) {
    const qtyParsed = parseQty(getQty(f));
    if (qtyParsed === null) continue;

    const enc = encodeURIComponent(f);
    const candidates = [
      `${absBase}${props.basePath}${enc}`,
      `${base}${props.basePath}${enc}`,
      `${props.basePath}${enc}`,
      `/${props.basePath}${enc}`,
    ];

    const text = await tryFetchCsv(candidates);
    if (text) docs.push({ name: f, text, qty: qtyParsed });
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
