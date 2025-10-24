import { parseCsvLoose } from "./csv";
import type { RecipesMap, GatheringInfo, GatheringMap, RequirementRow } from "./types";

// Build totals from input CSVs.
export function buildTopLevel(filesText: string[]): Map<string, number> {
  const totals = new Map<string, number>();

  for (const text of filesText) {
    const rows = parseCsvLoose(text);
    for (const r of rows) {
      if (r.length < 2) continue;

      const name = r[0];
      if (typeof name !== 'string' || name.trim() === '') continue;

      const qtyRaw = r[1];
      const qty = Number(qtyRaw);
      if (!Number.isFinite(qty)) continue;

      totals.set(name, (totals.get(name) ?? 0) + qty);
    }
  }

  return totals;
}


// Parse the (crafting) recipe book.
export function parseRecipeBookCsv(text: string): RecipesMap {
    const rows = parseCsvLoose(text);
    const recipes: RecipesMap = {};
    for (const row of rows) {
        if (!row[0]) continue;
        const product = row[0];
        const ingList: Array<{ ingredient: string; qty: number }> = [];
        for (let i = 1; i < row.length; i += 2) {
            const ing = row[i];
            const qty = Number(row[i + 1] ?? '0');
            if (!ing) break;
            ingList.push({ ingredient: ing, qty: Number.isFinite(qty) ? qty : 0 });
        }
        recipes[product] = ingList;
    }
    return recipes;
}

// Parse gathering info map. (ingredient, method, ...location columns, etc.)
export function parseGatheringCsv(text: string): GatheringMap {
    const rows = parseCsvLoose(text);
    const map: GatheringMap = {};
    for (const row of rows) {
        const name = row[0];
        if (!name) continue;
        const method = (row[1] ?? 'unknown').toString().trim() || 'unknown';
        const location = row.slice(2).filter((s) => s && s.trim()).join(', ');
        map[name] = { method, location };
    }
    return map;
}

// Recursive ingredient expansion for required ingredients.
export function recurseCraftingRecipes(
    item: string,
    multiplier: number,
    recipes: RecipesMap,
    bucket: Map<string, number>
) {
    const ingList = recipes[item];
    if (!ingList || ingList.length === 0) {
        bucket.set(item, (bucket.get(item) ?? 0) + multiplier);
        return;
    }
    for (const { ingredient, qty } of ingList) {
        const options = ingredient.split('|').map((s) => s.trim()).filter(Boolean);
        const share = (qty * multiplier) / options.length;
        for (const opt of options) {
            recurseCraftingRecipes(opt, share, recipes, bucket);
        }
    }
}

// Build gathered item list rows
export function buildGatheringList(
    topLevel: Map<string, number>,
    recipes: RecipesMap,
    gathering: GatheringMap
): RequirementRow[] {
    const req = new Map<string, number>();
    for (const [product, qty] of topLevel) {
        recurseCraftingRecipes(product, qty, recipes, req);
    }
    const rows: RequirementRow[] = [];
    for (const [ingredient, totalQty] of Array.from(req.entries()).sort((a, b) =>
        a[0].localeCompare(b[0]),
    )) {
        const gi = gathering[ingredient] as GatheringInfo | undefined;
        rows.push({
            Ingredient: ingredient,
            'Total Quantity': totalQty,
            Method: gi?.method || 'unknown',
            'Location Info': gi?.location ?? '',
        });
    }
    return rows;
}

// Sort crafted totals for output
export function buildCraftedTotals(topLevel: Map<string, number>): { Item: string; Quantity: number }[] {
    return Array.from(topLevel.entries())
        .map(([item, quantity]) => ({ Item: item, Quantity: quantity }))
        .sort((a, b) => a.Item.localeCompare(b.Item));
}

// Render the recipe tree (quantity first)
export function formatRecipeTree(
    topLevel: Map<string, number>,
    recipes: RecipesMap,
): string {
    const items = Array.from(topLevel.entries());
    const lines: string[] = ['=== Recipe Breakdown ==='];

    const fmtNode = (name: string, qty: number, prefix = '', isLast = false) => {
        const branch = isLast ? '└── ' : '├── ';
        lines.push(`${prefix}${branch}(${trimZeros(qty)}) ${name}`);
        const kids = recipes[name];
        if (!kids || kids.length === 0) return;
        kids.forEach((k, idx) => {
            const last = idx === kids.length - 1;
            const nextPrefix = prefix + (isLast ? '    ' : '│   ');
            fmtNode(k.ingredient, k.qty * qty, nextPrefix, last);
        });
    };

    items.forEach(([prod, qty], idx) => {
        fmtNode(prod, qty, '', idx === items.length - 1);
        lines.push('|');
    });

    return lines.join('\n') + '\n';
}

function trimZeros(n: number): string {
    return Number.isInteger(n) ? `${n}` : `${+n.toFixed(6)}`.replace(/\.0+$/, '');
}