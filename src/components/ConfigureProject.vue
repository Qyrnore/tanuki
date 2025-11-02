<template>
  <div class="card bg-base-100 border border-base-300 min-w-0">
    <div class="card-body gap-5">
      <!-- Header / actions -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="card-title">Configure Batch Project</h2>
        <div class="flex gap-2">
          <button
            class="btn btn-primary btn-sm"
            :disabled="selectedCount === 0 || hasInvalid"
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

      <!-- Search + Exclusion controls -->
      <div class="flex flex-col gap-2">
        <div class="join w-full">
          <input
            v-model="q"
            class="input input-bordered join-item w-full"
            placeholder="Search recipe names…"
          />
          <button class="btn join-item" @click="q = ''">Clear</button>
        </div>

        <!-- Exclusions: always applied; text box hidden by default but editable -->
        <div class="flex items-center justify-between">
          <div class="text-xs opacity-70">
            Exclusions are always active (edit to change): {{ excludesSummary }}
          </div>
          <button class="btn btn-ghost btn-xs" @click="excludesVisible = !excludesVisible">
            {{ excludesVisible ? 'Hide' : 'Edit' }} exclusions
          </button>
        </div>
        <div v-show="excludesVisible" class="w-full">
          <input
            v-model="excludesText"
            class="input input-bordered w-full"
            placeholder="Comma-separated phrases to exclude…"
          />
          <div class="text-xs opacity-60 mt-1">
            Example: Roof, Signboard, Wall Decoration, Fence, Door, Exterior, Window, Roof Decoration
          </div>
        </div>
      </div>

      <!-- Two balanced columns; stack on small screens -->
      <div class="grid gap-5 md:grid-cols-2 min-w-0">
        <!-- Left: searchable file list -->
        <div class="min-w-0">
          <div class="text-xs opacity-70 mt-2">
            Showing {{ filtered.length }} of {{ files.length }} recipes.
          </div>

          <div class="flex gap-2 mt-3">
            <button class="btn btn-xs" @click="selectAllFiltered">Check All</button>
            <button class="btn btn-xs" @click="invertSelection">Invert Checks</button>
          </div>

          <!-- Scroll area constrained; prevents rightward creep -->
          <div class="mt-3 max-h-80 md:max-h-[28rem] overflow-auto rounded border border-base-300">
            <ul class="menu menu-sm">
              <li v-for="f in filtered" :key="f">
                <label
                  class="flex items-center gap-2 px-3 py-2 relative"
                  @mouseenter="onHoverStart('left', f, 1, $event)"
                  @mouseleave="onHoverEnd"
                  @touchstart.passive="onTouchStart('left', f, 1, $event)"
                  @touchend.passive="onTouchEnd"
                  @touchcancel.passive="onTouchEnd"
                >
                  <input
                    type="checkbox"
                    class="checkbox checkbox-sm"
                    :checked="qtyMap[f] !== undefined"
                    @change="toggle(f)"
                  />
                  <span class="truncate">{{ prettyName(f) }}</span>
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
                <tr
                  v-for="f in selectedList"
                  :key="f"
                  @mouseenter="onHoverStart('right', f, parseQty(getQty(f)) ?? 1, $event)"
                  @mouseleave="onHoverEnd"
                  @touchstart.passive="onTouchStart('right', f, parseQty(getQty(f)) ?? 1, $event)"
                  @touchend.passive="onTouchEnd"
                  @touchcancel.passive="onTouchEnd"
                >
                  <td class="truncate align-top pt-4 min-w-0">{{ prettyName(f) }}</td>
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
            <b>*NOTE:</b> Tanuki only loads in company workshop project recipes by default, see “Custom Recipes &amp; Gathering” for other items.
          </p>
        </div>
      </div>
    </div>

    <!-- Teleported hover/press bubble (fixed, not clipped by scroll) -->
    <teleport to="body">
      <div
        v-if="bubble.visible"
        class="fixed z-[9999] pointer-events-none transition-opacity duration-150"
        :style="bubbleStyle"
      >
        <div class="chat" :class="bubble.side === 'left' ? 'chat-start' : 'chat-end'">
          <div
            class="chat-bubble max-w-[min(28rem,92vw)] whitespace-pre font-mono text-xs shadow-xl"
            v-html="bubble.html"
          ></div>
        </div>
      </div>
    </teleport>
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

// === Exclusions (always active) ===
const excludesVisible = ref(false);
const excludesText = ref(
  "Roof, Signboard, Wall Decoration, Fence, Door, Exterior, Window, Roof Decoration"
);
const excludesSummary = computed(() => {
  const parts = splitExcludes(excludesText.value);
  return parts.length ? parts.join(", ") : "none";
});
function splitExcludes(s: string): string[] {
  return s
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

// Map-like qty storage as string so field can be cleared while editing
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

// Pretty name from filename
function prettyName(file: string): string {
  const name = file.replace(/\.csv$/i, "");
  return name
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

// Filtering (search + exclusions always applied)
const filtered = computed(() => {
  const s = q.value.trim().toLowerCase();
  const excludes = splitExcludes(excludesText.value).map((p) => p.toLowerCase());
  const base = props.files;
  return base.filter((f) => {
    const human = prettyName(f).toLowerCase();
    if (excludes.some((ex) => human.includes(ex))) return false;
    if (!s) return true;
    return human.includes(s);
  });
});

const selectedList = computed(() =>
  Object.keys(qtyMap.value).sort((a, b) => prettyName(a).localeCompare(prettyName(b)))
);
const selectedCount = computed(() => Object.keys(qtyMap.value).length);

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

// Quantity helpers
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

// Fetch & process
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
      if (t && t.trim()) return t;
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
    alert(`No item CSVs loaded.\n\nTried e.g.:\n${example}\n\nCheck that the files exist in this project.`);
  }

  emit("process", docs);
}

// ===== Rainbow CSV preview (raw and qty-adjusted), teleported bubble =====
type BubbleSide = "left" | "right";
const bubble = ref<{ visible: boolean; html: string; x: number; y: number; side: BubbleSide }>({
  visible: false,
  html: "",
  x: 0,
  y: 0,
  side: "left",
});
const bubbleStyle = computed(() => {
  return {
    left: `${bubble.value.x}px`,
    top: `${bubble.value.y}px`,
    opacity: bubble.value.visible ? "1" : "0",
  } as Record<string, string>;
});
let longPressTimer: number | null = null;

function anchorRectFromEvent(ev: MouseEvent | TouchEvent) {
  const target = ev.currentTarget as HTMLElement | null;
  if (!target) return null;
  return target.getBoundingClientRect();
}
function placeBubbleAbove(rect: DOMRect, side: BubbleSide) {
  const margin = 8;
  const bubbleWidth = Math.min(448, window.innerWidth * 0.92); // ~28rem
  const x =
    side === "left"
      ? Math.min(rect.right + margin, window.innerWidth - bubbleWidth - margin)
      : Math.max(rect.left - bubbleWidth - margin, margin);
  const y = Math.max(rect.top - 12, margin);
  return { x, y };
}

const csvHtml = ref<Record<string, string>>({});
const csvHtmlWithQty = ref<Record<string, string>>({});
const loadingHtml =
  '<span class="opacity-60">Loading…</span>';

function toRainbowCsvHtml(csvText: string): string {
  // Simple rainbow: cycle tailwind text colors across columns
  const palette = [
    "text-primary",
    "text-secondary",
    "text-accent",
    "text-info",
    "text-success",
    "text-warning",
    "text-error",
  ];
  const lines = csvText.replace(/\r\n/g, "\n").split("\n");
  const htmlLines: string[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = line.split(",");
    const pieces = cols.map((c, i) => {
      const cls = palette[i % palette.length];
      return `<span class="${cls}">${escapeHtml(c.trim())}</span>`;
    });
    htmlLines.push(pieces.join('<span class="opacity-40">, </span>'));
  }
  return htmlLines.join("\n");
}
function adjustCsvQuantities(csvText: string, factor: number): string {
  const lines = csvText.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split(",");
    if (parts.length < 2) {
      out.push(line);
      continue;
    }
    const a = parts[0];
    const b = parts[1];
    const n = Number(b);
    if (Number.isFinite(n)) {
      const v = n * factor;
      const clean = Number.isInteger(v) ? String(v) : String(v).replace(/\.0+$/, "");
      out.push(`${a.trim()}, ${clean}`);
    } else {
      out.push(line);
    }
  }
  return out.join("\n");
}
function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function fetchCsvTextFor(file: string): Promise<string | null> {
  const origin = window.location.origin;
  const base = import.meta.env.BASE_URL;
  const absBase = new URL(base, origin).toString();
  const enc = encodeURIComponent(file);
  const candidates = [
    `${absBase}${props.basePath}${enc}`,
    `${base}${props.basePath}${enc}`,
    `${props.basePath}${enc}`,
    `/${props.basePath}${enc}`,
  ];
  return await tryFetchCsv(candidates);
}
async function prefetchCsvHtml(file: string) {
  if (csvHtml.value[file]) return;
  const text = await fetchCsvTextFor(file);
  csvHtml.value[file] = text ? toRainbowCsvHtml(text) : '<span class="opacity-60">No data</span>';
}
async function prefetchCsvHtmlWithQty(file: string, qty: number) {
  if (qty <= 1) return prefetchCsvHtml(file);
  const key = `${file}::${qty}`;
  if (csvHtmlWithQty.value[key]) return;
  const text = await fetchCsvTextFor(file);
  if (!text) {
    csvHtmlWithQty.value[key] = '<span class="opacity-60">No data</span>';
    return;
  }
  const adjusted = adjustCsvQuantities(text, qty);
  csvHtmlWithQty.value[key] = toRainbowCsvHtml(adjusted);
}

async function ensureHtmlFor(side: BubbleSide, f: string, qty: number) {
  if (side === "left") {
    if (!csvHtml.value[f]) await prefetchCsvHtml(f);
    return csvHtml.value[f] || loadingHtml;
  } else {
    if (qty <= 1) {
      if (!csvHtml.value[f]) await prefetchCsvHtml(f);
      return csvHtml.value[f] || loadingHtml;
    } else {
      const key = `${f}::${qty}`;
      if (!csvHtmlWithQty.value[key]) await prefetchCsvHtmlWithQty(f, qty);
      return csvHtmlWithQty.value[key] || loadingHtml;
    }
  }
}
async function showBubble(side: BubbleSide, f: string, qty: number, ev: MouseEvent | TouchEvent) {
  const rect = anchorRectFromEvent(ev);
  if (!rect) return;
  bubble.value.html = loadingHtml;
  bubble.value.side = side;
  const pos = placeBubbleAbove(rect, side);
  bubble.value.x = pos.x;
  bubble.value.y = pos.y;
  bubble.value.visible = true;
  bubble.value.html = await ensureHtmlFor(side, f, qty);
}
function hideBubble() {
  bubble.value.visible = false;
  bubble.value.html = "";
}
// mouse hover
function onHoverStart(side: BubbleSide, f: string, qty: number, ev: MouseEvent) {
  showBubble(side, f, qty, ev);
}
function onHoverEnd() {
  hideBubble();
}
// mobile long-press
function onTouchStart(side: BubbleSide, f: string, qty: number, ev: TouchEvent) {
  if (longPressTimer) {
    window.clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  longPressTimer = window.setTimeout(() => {
    showBubble(side, f, qty, ev);
  }, 400);
}
function onTouchEnd() {
  if (longPressTimer) {
    window.clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  hideBubble();
}
</script>
