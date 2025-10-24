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


## File tree

```
.
├── .github/
│ └── workflows/
│ └── pages.yml
├── index.html
├── package.json
├── postcss.config.cjs
├── README.md
├── tailwind.config.cjs
├── tsconfig.json
├── vite.config.ts
└── src/
├── main.ts
├── App.vue
├── assets/
│ └── index.css
├── lib/
│ ├── csv.ts
│ ├── logic.ts
│ └── types.ts
└── components/
├── FileDrop.vue
├── ResultsTabs.vue
├── DataTable.vue
└── RecipeTree.vue
```