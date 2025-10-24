export type Quantity = number

export interface TopLevelItem { item: string; quantity: Quantity }

export interface RecipesMap {
    [product: string]: Array<{ingredient: string; qty: number }>
}

export interface GatheringInfo {
    method?: string
    location?: string
}

export interface GatheringMap { [ingredient: string]: GatheringInfo }

export interface RequirementRow {
    Ingredient: string
    'Total Quantity': number
    Method?: string
    'Location Info'?: string
}