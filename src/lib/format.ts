export type Row = Record<string, string | number>;
export type FormatKind = "web" | "txt" | "md" | "csv";

export const COLUMNS = {
  crafted: ["Item", "Quantity"] as const,
  gatheringNoLoc: ["Ingredient", "Total Quantity", "Method"] as const,
  gatheringWithLoc: ["Ingredient", "Total Quantity", "Method", "Location Info"] as const,
};

// ---------- CSV ----------
function escapeCsv(val: string | number): string {
  const s = String(val ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCSV(rows: Row[], columns: readonly string[]): string {
  const header = columns.join(",");
  const body = rows.map(r => columns.map(c => escapeCsv(r[c] ?? "")).join(",")).join("\n");
  return [header, body].filter(Boolean).join("\n");
}

// ---------- Generic Markdown (single table) ----------
export function toMarkdown(rows: Row[], columns: readonly string[]): string {
  const header = `| ${columns.join(" | ")} |`;
  const sep = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map(r => `| ${columns.map(c => String(r[c] ?? "")).join(" | ")} |`).join("\n");
  return [header, sep, body].filter(Boolean).join("\n");
}

// ---------- Notebook-style TXT helpers (headers + aligned MD tables) ----------
/** align: 'l' | 'c' | 'r' per column */
function mdAlignedSep(align: Array<"l" | "c" | "r">, widths: number[]): string {
  return `| ${align
    .map((a, i) => {
      const base = (widths[i] ?? 0) - (a !== "c" ? 1 : 2);
      const dashLen = Math.max(3, base);
      const dashes = "-".repeat(dashLen);
      if (a === "l") return `:${dashes}`;
      if (a === "r") return `${dashes}:`;
      return `:${dashes}:`;
    })
    .join(" | ")} |`;
}

function computeColWidths(rows: Row[], cols: string[]): number[] {
  const w: number[] = cols.map((c) => c.length);
  for (const r of rows) {
    cols.forEach((c, i) => {
      const cur = w[i] ?? 0;
      const len = String((r as any)[c] ?? "").length;
      w[i] = Math.max(cur, len);
    });
  }
  return w;
}

function mdTableWithAlignment(
  rows: Row[],
  cols: string[],
  align: Array<"l" | "c" | "r">
): string {
  // Ensure we have a width for every col (fallback to that column’s header length)
  const rawWidths = computeColWidths(rows, cols);
  const widths = cols.map((c, i) => rawWidths[i] ?? c.length); 

  const pad = (s: string, i: number) => {
    const cell = String(s ?? "");
    const target = widths[i] ?? cell.length;
    if (align[i] === "r") return cell.padStart(target, " ");
    if (align[i] === "c") {
      const space = Math.max(0, target - cell.length);
      const left = Math.floor(space / 2);
      const right = space - left;
      return " ".repeat(left) + cell + " ".repeat(right);
    }
    return cell.padEnd(target, " ");
  };

  const header = `| ${cols.map((c, i) => pad(c, i)).join(" | ")} |`;
  const sep = mdAlignedSep(align, widths);
  const body = rows
    .map((r) => `| ${cols.map((c, i) => pad(String((r as any)[c] ?? ""), i)).join(" | ")} |`)
    .join("\n");

  return [header, sep, body].filter(Boolean).join("\n");
}

// TXT (crafted): header + aligned table (Item, Quantity)
export function toTXT_crafted_notebook(rows: Row[]): string {
  const cols = ["Item", "Quantity"];
  const table = mdTableWithAlignment(rows, cols, ["l", "r"]);
  return `=== Total Crafted Items ===\n${table}`;
}

// TXT (gathering): group by Method; each section has aligned table
export function toTXT_gathering_notebook(rows: Row[], withLocation = false): string {
  const byMethod = new Map<string, Row[]>();
  for (const r of rows) {
    const m = String(r["Method"] ?? "unknown");
    if (!byMethod.has(m)) byMethod.set(m, []);
    byMethod.get(m)!.push(r);
  }
  const sections: string[] = [];
  const methods = Array.from(byMethod.keys()).sort((a, b) => a.localeCompare(b));
  for (const m of methods) {
    const group = (byMethod.get(m) ?? []).slice()
      .sort((a, b) => String(a["Ingredient"]).localeCompare(String(b["Ingredient"])));
    const cols = withLocation ? ["Ingredient", "Total Quantity", "Location Info"] : ["Ingredient", "Total Quantity"];
    const align = withLocation ? ["l", "r", "l"] as const : ["l", "r"] as const;
    const table = mdTableWithAlignment(group, cols, align as any);
    sections.push(`=== ${m} ===\n${table}`);
  }
  return sections.join("\n\n");
}

// ---------- Markdown grouped for gathering (Method sections) ----------
export function toMarkdown_grouped(rows: Row[], columns: readonly string[], groupByMethod: boolean): string {
  if (!groupByMethod) return toMarkdown(rows, columns);
  const byMethod = new Map<string, Row[]>();
  for (const r of rows) {
    const m = String(r["Method"] ?? "unknown");
    if (!byMethod.has(m)) byMethod.set(m, []);
    byMethod.get(m)!.push(r);
  }
  const out: string[] = [];
  const methods = Array.from(byMethod.keys()).sort((a, b) => a.localeCompare(b));
  for (const m of methods) {
    const cols = (columns as string[]).filter(c => c !== "Method");
    const key = cols[0] ?? "";
    const getVal = (row: Row, k: string) => (k ? String(row[k] ?? "") : "");
    const group = (byMethod.get(m) ?? []).slice()
      .sort((a, b) => getVal(a, key).localeCompare(getVal(b, key)));
    const header = `| ${cols.join(" | ")} |`;
    const sep = `| ${cols.map(() => "---").join(" | ")} |`;
    const body = group.map(r => `| ${cols.map(c => String(r[c] ?? "")).join(" | ")} |`).join("\n");
    out.push(`### === ${m} ===\n${header}\n${sep}\n${body}`);
  }
  return out.join("\n\n");
}
