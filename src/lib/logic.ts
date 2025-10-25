import { parseCsvLoose } from "./csv";
import type { RecipesMap, RecipeItem, GatheringInfo, GatheringMap, RequirementRow } from "./types";

export interface PartsDoc {
    name: string;
    text: string;
    qty: number; // integer >= 1
}

/**
 * Robustly read "Item,Quantity" pairs from multiple CSV texts and apply a multiplier.
 * - Ignores headers/blank/comment lines
 * - Accepts extra columns; takes the first 2
 * - Accepts CRLF / LF
 * - Trims quotes and whitespace
 */
export function buildTopLevelFromWeightedParts(parts: PartsDoc[]): Map<string, number> {
    const totals = new Map<string, number>();

    for (const doc of parts) {
        const weight = Number.isFinite(doc.qty) && doc.qty > 0 ? Math.floor(doc.qty) : 1;
        const lines = doc.text.split(/\r?\n/);

        for (const raw of lines) {
            if (!raw) continue;
            const line = raw.trim();
            if (!line || line.startsWith('#')) continue;

            // Split once on the first comma; fall back to generic split
            let a = '', b = '';
            const idx = line.indexOf(',');
            if (idx >= 0) {
                a = line.slice(0, idx).trim().replace(/^"(.*)"$/, '$1');
                b = (line.slice(idx + 1).split(',')[0] ?? '').trim().replace(/^"(.*)"$/, '$1');
            } else {
                const parts = line.split(',');
                a = (parts[0] ?? '').trim().replace(/^"(.*)"$/, '$1');
                b = (parts[1] ?? '').trim().replace(/^"(.*)"$/, '$1');
            }

            // Skip header-looking rows
            const al = a.toLowerCase();
            const bl = b.toLowerCase();
            if (!a || al === 'item' || al === 'product' || bl === 'quantity' || bl === 'qty') continue;

            const n = Number(b);
            if (!Number.isFinite(n)) continue;

            const add = n * weight;
            totals.set(a, (totals.get(a) ?? 0) + add);
        }
    }
    return totals;
}

// Build totals from input CSVs.
export function buildTopLevelFromPartsCsvs(filesText: string[]): Map<string, number> {
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
// Accept both tuples and object items


export function formatRecipeTree(
    topMap: Map<string, number>,
    recipes: RecipesMap
): string {
    const lines: string[] = ['=== Recipe Breakdown ==='];
    const entries = Array.from(topMap.entries()); // [[name, qty], ...]

    function norm(pair: RecipeItem): [string, number] {
        return Array.isArray(pair) ? [pair[0], pair[1]] : [pair.ingredient, pair.qty];
    }

    function fmtNode(name: string, qty: number, prefix = '', isLast = false) {
        const branch = isLast ? '└── ' : '├── ';
        lines.push(`${prefix}${branch}(${qty}) ${name}`);

        const kids = recipes[name] ?? [];
        const nextPrefix = prefix + (isLast ? '    ' : '│   ');
        for (const [i, item] of kids.entries()) {
            const [childName, childQty] = norm(item); // item is RecipeItem (not undefined)
            const lastChild = i === kids.length - 1;
            fmtNode(childName, childQty * qty, nextPrefix, lastChild);
        }
    }


    entries.forEach(([prod, qty], i) => {
        const isLastTop = i === entries.length - 1;
        fmtNode(prod, qty, '', isLastTop);
        // Separator only BETWEEN top-level items
        if (!isLastTop) lines.push('|');
    });

    // Ensure no trailing bar
    if (lines.length && lines[lines.length - 1] === '|') lines.pop();

    return lines.join('\n');
}
