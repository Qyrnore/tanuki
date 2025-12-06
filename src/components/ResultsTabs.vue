<template>
  <div class="tabs tabs-bordered">
    <!-- Tabs -->
    <a :class="tabClass('crafted')" @click="activeTab = 'crafted'"
      >Top‑Level Items</a
    >
    <a :class="tabClass('g_no')" @click="activeTab = 'g_no'">Gathered</a>
    <a :class="tabClass('g_with')" @click="activeTab = 'g_with'"
      >Gathered + Locations</a
    >
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
      <!-- Crafted -->
      <template v-if="activeTab === 'crafted'">
        <div class="relative">
          <button
            class="btn btn-xs btn-ghost absolute right-2 top-2"
            type="button"
            :aria-label="copied ? 'Copied' : 'Copy text'"
            @click="copyCurrent('crafted')"
          >
            <svg
              v-if="!copied"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path
                d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
              ></path>
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M20 6L9 17l-5-5"></path>
            </svg>
          </button>
          <pre
            class="whitespace-pre-wrap text-sm overflow-auto rounded border border-base-300 p-3"
            >{{ craftedText }}</pre
          >
        </div>
      </template>

      <!-- Gathering (no location) -->
      <template v-else-if="activeTab === 'g_no'">
        <div class="relative">
          <button
            class="btn btn-xs btn-ghost absolute right-2 top-2"
            type="button"
            :aria-label="copied ? 'Copied' : 'Copy text'"
            @click="copyCurrent('g_no')"
          >
            <svg
              v-if="!copied"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path
                d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
              ></path>
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M20 6L9 17l-5-5"></path>
            </svg>
          </button>
          <pre
            class="whitespace-pre-wrap text-sm overflow-auto rounded border border-base-300 p-3"
            >{{ gatheringNoLocText }}</pre
          >
        </div>
      </template>

      <!-- Gathering (with location) -->
      <template v-else-if="activeTab === 'g_with'">
        <div class="relative">
          <button
            class="btn btn-xs btn-ghost absolute right-2 top-2"
            type="button"
            :aria-label="copied ? 'Copied' : 'Copy text'"
            @click="copyCurrent('g_with')"
          >
            <svg
              v-if="!copied"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path
                d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
              ></path>
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M20 6L9 17l-5-5"></path>
            </svg>
          </button>
          <pre
            class="whitespace-pre-wrap text-sm overflow-auto rounded border border-base-300 p-3"
            >{{ gatheringWithLocText }}</pre
          >
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
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                ></path>
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
                <path
                  d="M9 2a2 2 0 00-2 2H6a2 2 0 00-2 2v12a2 2 0 002 2h6.5a.5.5 0 000-1H6a1 1 0 01-1-1V6a1 1 0 011-1h1v1a2 2 0 002 2h3a2 2 0 002-2V5h1a1 1 0 011 1v4.5a.5.5 0 001 0V6a2 2 0 00-2-2h-1a2 2 0 00-2-2H9zm0 2h3a1 1 0 011 1v1H8V5a1 1 0 011-1z"
                ></path>
                <path
                  d="M13 11a2 2 0 012-2h5a2 2 0 012 2v9a2 2 0 01-2 2h-5a2 2 0 01-2-2v-9zm2 0h5v9h-5v-9z"
                ></path>
              </svg>
              Copy
            </span>
          </button>
          <pre
            class="font-mono whitespace-pre-wrap text-sm overflow-auto rounded border border-base-300 p-3"
            v-text="treeText"
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

type Tab = "crafted" | "g_no" | "g_with" | "tree";
const activeTab = ref<Tab>("crafted");

const formatOrder: FormatKind[] = ["txt", "md", "csv"];
const format = ref<FormatKind>("txt");
const copiedKey = ref<null | "crafted" | "g_no" | "g_with" | "tree">(null);

function textFor(section: "crafted" | "g_no" | "g_with" | "tree"): string {
  if (section === "tree") return props.treeText ?? "";
  if (section === "crafted") return craftedText.value;
  if (section === "g_no") return gatheringNoLocText.value;
  return gatheringWithLocText.value;
}

async function copyText(section: "crafted" | "g_no" | "g_with" | "tree") {
  const s = textFor(section);
  if (!s) return;
  await navigator.clipboard.writeText(s);
  copiedKey.value = section;
  window.setTimeout(() => (copiedKey.value = null), 1200);
}

function titleFor(tab: Tab) {
  if (tab === "crafted") return "Items Needed for Batch Project";
  if (tab === "g_no") return "Gathering List";
  if (tab === "g_with") return "Gathering List + Locations";
  return "Recipe Tree";
}
function tabClass(tab: Tab) {
  return ["tab", "tab-bordered", activeTab.value === tab ? "tab-active" : ""];
}

/** Notebook‑style TXT + MD/CSV builders (tree uses treeText directly) */
const craftedText = computed(() => {
  if (format.value === "txt")
    return toTXT_crafted_notebook(props.craftedRows as any);
  if (format.value === "md")
    return toMarkdown(
      props.craftedRows as any,
      COLUMNS.crafted as unknown as string[]
    );
  if (format.value === "csv")
    return toCSV(
      props.craftedRows as any,
      COLUMNS.crafted as unknown as string[]
    );
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
    return toCSV(
      props.gatheringNoLoc,
      COLUMNS.gatheringNoLoc as unknown as string[]
    );
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
    return toCSV(
      props.gatheringWithLoc,
      COLUMNS.gatheringWithLoc as unknown as string[]
    );
  return "";
});

/* Copy button logic: copies whichever text is currently visible (non‑web) */
const copied = ref(false);

const currentText = computed(() => {
  if (format.value === "web") return "";
  if (activeTab.value === "crafted") return craftedText.value;
  if (activeTab.value === "g_no") return gatheringNoLocText.value;
  if (activeTab.value === "g_with") return gatheringWithLocText.value;
  return "";
});

async function copyCurrent(expectedTab: "crafted" | "g_no" | "g_with") {
  if (activeTab.value !== expectedTab) return;
  const text = currentText.value;
  if (!text) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    copied.value = true;
    setTimeout(() => (copied.value = false), 1200);
  } catch {}
}
</script>