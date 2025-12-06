<template>
  <div class="tabs tabs-bordered">
    <!-- Tabs -->
    <a :class="tabClass('combined')" @click="activeTab = 'combined'">Combined</a>
    <a :class="tabClass('crafted')" @click="activeTab = 'crafted'">Top‑Level Items</a>
    <a :class="tabClass('g_no')" @click="activeTab = 'g_no'">Gathered</a>
    <a :class="tabClass('g_with')" @click="activeTab = 'g_with'">Gathered + Locations</a>
    <a :class="tabClass('tree')" @click="activeTab = 'tree'">Recipe Tree</a>
  </div>

  <div class="mt-4 card bg-base-100 border border-base-300">
    <div class="card-body gap-4">
      <!-- Header row with segmented control -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h3 class="card-title text-lg">{{ titleFor(activeTab) }}</h3>

        <!-- Pill‑shaped 4‑button group (hidden on tree tab) -->
        <div v-if="activeTab !== 'tree'" class="join">
          <button
            v-for="opt in formatOrder"
            :key="opt"
            class="join-item btn btn-sm"
            :class="format === opt ? 'btn-primary' : 'btn-ghost'"
            type="button"
            :aria-pressed="format === opt"
            @click="format = opt"
          >
            {{ opt.toUpperCase() }}
          </button>
        </div>
      </div>

      <!-- CONTENT AREA -->
      <!-- Combined view -->
      <template v-if="activeTab === 'combined'">
        <div class="relative">
          <button
            class="btn btn-xs btn-ghost absolute right-2 top-2"
            type="button"
            :aria-label="copiedKey === 'combined' ? 'Copied' : 'Copy text'"
            @click="copyCurrent('combined')"
          >
            <svg
              v-if="copiedKey !== 'combined'"
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </button>
          <pre
            class="whitespace-pre-wrap text-sm overflow-auto rounded border border-base-300 p-3"
          >{{ combinedText }}</pre>
        </div>
      </template>

      <!-- Crafted -->
      <template v-else-if="activeTab === 'crafted'">
        <div class="relative">
          <button
            class="btn btn-xs btn-ghost absolute right-2 top-2"
            type="button"
            :aria-label="copiedKey === 'crafted' ? 'Copied' : 'Copy text'"
            @click="copyCurrent('crafted')"
          >
            <svg
              v-if="copiedKey !== 'crafted'"
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </button>
          <pre
            class="whitespace-pre-wrap text-sm overflow-auto rounded border border-base-300 p-3"
          >{{ craftedText }}</pre>
        </div>
      </template>

      <!-- Gathering (no‑location) -->
      <template v-else-if="activeTab === 'g_no'">
        <div class="relative">
          <button
            class="btn btn-xs btn-ghost absolute right-2 top-2"
            type="button"
            :aria-label="copiedKey === 'g_no' ? 'Copied' : 'Copy text'"
            @click="copyCurrent('g_no')"
          >
            <svg
              v-if="copiedKey !== 'g_no'"
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </button>
          <pre
            class="whitespace-pre-wrap text-sm overflow-auto rounded border border-base-300 p-3"
          >{{ gatheringNoLocText }}</pre>
        </div>
      </template>

      <!-- Gathering (with location) -->
      <template v-else-if="activeTab === 'g_with'">
        <div class="relative">
          <button
            class="btn btn-xs btn-ghost absolute right-2 top-2"
            type="button"
            :aria-label="copiedKey === 'g_with' ? 'Copied' : 'Copy text'"
            @click="copyCurrent('g_with')"
          >
            <svg
              v-if="copiedKey !== 'g_with'"
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </button>
          <pre
            class="whitespace-pre-wrap text-sm overflow-auto rounded border border-base-300 p-3"
          >{{ gatheringWithLocText }}</pre>
        </div>
      </template>

      <!-- Recipe Tree (text‑only, with Copy) -->
      <div v-else>
        <div class="relative">
          <button
            class="btn btn-ghost btn-xs absolute right-2 top-2"
            aria-label="Copy recipe tree"
            @click="copyText('tree')"
          >
            <span v-if="copiedKey === 'tree'" class="flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              Copied
            </span>
            <span v-else class="flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M9 2a2 2 0 00-2 2H6a2 2 0 00-2 2v12a2 2 0 002 2h6.5a.5.5 0 000-1H6a1 1 0 01-1-1V6a1 1 0 011-1h1v1a2 2 0 002 2h3a2 2 0 002-2V5h1a1 1 0 011 1v4.5a.5.5 0 001 0V6a2 2 0 00-2-2h-1a2 2 0 00-2-2H9zm0 2h3a1 1 0 011 1v1H8V5a1 1 0 011-1z"></path>
                <path d="M13 11a2 2 0 012-2h5a2 2 0 012 2v9a2 2 0 01-2 2h-5a2 2 0 01-2-2v-9zm2 0h5v9h-5v-9z"></path>
              </svg>
              Copy
            </span>
          </button>
          <pre
            class="font-mono whitespace-pre-wrap text-sm overflow-auto rounded border border-base-300 p-3"
            v-text="props.treeText"
          ></pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { FormatKind } from "../lib/format";
import {
  COLUMNS,
  toCSV,
  toMarkdown,
  toMarkdown_grouped,
  toTXT_crafted_notebook,
  toTXT_gathering_notebook,
} from "../lib/format";

const props = defineProps<{
  craftedRows: { Item: string; Quantity: number }[];
  gatheringNoLoc: Record<string, string | number>[];
  gatheringWithLoc: Record<string, string | number>[];
  treeText: string;
}>();

type Tab =
  | "combined"
  | "crafted"
  | "g_no"
  | "g_with"
  | "tree";

const activeTab = ref<Tab>("combined");          // first tab on load

const formatOrder: FormatKind[] = ["txt", "md", "csv"];
const format = ref<FormatKind>("txt");
const copiedKey = ref<null | "combined" | "crafted" | "g_no" | "g_with" | "tree">(null);

/* ---------- helpers for tab titles & styling ---------- */
function titleFor(tab: Tab) {
  if (tab === "combined") return "Combined Overview";
  if (tab === "crafted") return "Items Needed for Batch Project";
  if (tab === "g_no") return "Gathering List";
  if (tab === "g_with") return "Gathered + Locations";
  return "Recipe Tree";
}
function tabClass(tab: Tab) {
  return [
    "tab",
    "tab-bordered",
    activeTab.value === tab ? "tab-active" : "",
  ];
}

/* ---------- text generators for each section ---------- */
const craftedText = computed(() => {
  if (format.value === "txt")
    return toTXT_crafted_notebook(props.craftedRows as any);
  if (format.value === "md")
    return toMarkdown(props.craftedRows as any, COLUMNS.crafted as unknown as string[]);
  if (format.value === "csv")
    return toCSV(props.craftedRows as any, COLUMNS.crafted as unknown as string[]);
  return "";
});

const gatheringNoLocText = computed(() => {
  if (format.value === "txt")
    return toTXT_gathering_notebook(props.gatheringNoLoc, false);
  if (format.value === "md")
    return toMarkdown_grouped(
      props.gatheringNoLoc,
      COLUMNS.gatheringNoLoc as unknown as string[],
      true
    );
  if (format.value === "csv")
    return toCSV(props.gatheringNoLoc, COLUMNS.gatheringNoLoc as unknown as string[]);
  return "";
});

const gatheringWithLocText = computed(() => {
  if (format.value === "txt")
    return toTXT_gathering_notebook(props.gatheringWithLoc, true);
  if (format.value === "md")
    return toMarkdown_grouped(
      props.gatheringWithLoc,
      COLUMNS.gatheringWithLoc as unknown as string[],
      true
    );
  if (format.value === "csv")
    return toCSV(props.gatheringWithLoc, COLUMNS.gatheringWithLoc as unknown as string[]);
  return "";
});

/* ---------- combined output ---------- */
const separator = "\n\n=================================\n=================================\n\n";          // tweak this string to change the visual divider

const combinedText = computed(() => {
  // If the user chose CSV, just concatenate with plain new‑lines (no divider).
  if (format.value === "csv") {
    const csvParts = [
      craftedText.value,
      gatheringNoLocText.value,
      props.treeText
    ].filter(Boolean);
    return csvParts.join("\n");
  }

  // For text / Markdown outputs we build a list that only inserts the separator
  // when the adjacent section actually exists.
  const blocks: string[] = [];

  if (craftedText.value) {
    blocks.push(craftedText.value);
  }

  if (gatheringNoLocText.value) {
    if (blocks.length) blocks.push(separator);
    blocks.push(gatheringNoLocText.value);
  }

  if (props.treeText) {
    if (blocks.length) blocks.push(separator);
    blocks.push(props.treeText);
  }

  return blocks.join("");
});

/* ---------- copy helpers ---------- */
function copyCurrent(tab: Tab) {
  let txt: string | undefined;
  if (tab === "combined") txt = combinedText.value;
  else if (tab === "crafted") txt = craftedText.value;
  else if (tab === "g_no") txt = gatheringNoLocText.value;
  else return; // tree tab uses dedicated copyText()

  if (!txt) return;

  navigator.clipboard
    .writeText(txt)
    .then(() => {
      copiedKey.value = tab;
      window.setTimeout(() => (copiedKey.value = null), 1200);
    })
    .catch(() => {
      // Fallback textarea copy
      const ta = document.createElement("textarea");
      ta.value = txt!;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      copiedKey.value = tab;
      window.setTimeout(() => (copiedKey.value = null), 1200);
    });
}

/* ---------- tree copy helper ---------- */
function copyText(tab: Tab) {
  let txt: string | undefined;
  if (tab === "tree") txt = props.treeText;
  else return;

  if (!txt) return;

  navigator.clipboard
    .writeText(txt)
    .then(() => {
      copiedKey.value = tab;
      window.setTimeout(() => (copiedKey.value = null), 1200);
    })
    .catch(() => {
      const ta = document.createElement("textarea");
      ta.value = txt!;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      copiedKey.value = tab;
      window.setTimeout(() => (copiedKey.value = null), 1200);
    });
}
</script>