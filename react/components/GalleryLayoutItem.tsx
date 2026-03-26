import type { ComponentType } from 'react'
import React, { memo, useCallback, useMemo } from 'react'
import { usePixel } from 'vtex.pixel-manager'
import ProductSummary from 'vtex.product-summary/ProductSummaryCustom'
import { useSearchPage } from 'vtex.search-page-context/SearchPageContext'
import { useRuntime } from 'vtex.render-runtime'

import type { Product } from '../Gallery'
import type { PreferredSKU } from '../GalleryLayout'

/**
 * Keys from VTEX Intelligent Search that are NOT product specifications.
 * We skip these when looking for spec-based filters in the URL.
 */
const NON_SPEC_KEYS = new Set([
  'category-1',
  'category-2',
  'category-3',
  'category-4',
  'brand',
  'productclusterids',
  'c',
  'b',
  'ft',
  'department',
  'subcategory',
])

function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function slugToComparable(slug: string): string {
  return normalize(slug).replace(/[-_\s]+/g, '')
}

/**
 * Groups spec filters by key. Same key = OR (any value matches),
 * different keys = AND (all keys must match).
 * E.g. medida=twin + medida=queen + color=rojo →
 *   { medida: ["twin","queen"], color: ["rojo"] }
 */
function getActiveSpecFilterGroups(
  query: Record<string, string>
): Map<string, string[]> {
  const map = query?.map?.split(',') ?? []
  const queryPath = query?.query?.split('/').filter(Boolean) ?? []

  if (!map.length || !queryPath.length) return new Map()

  const groups = new Map<string, string[]>()

  for (let i = 0; i < map.length; i++) {
    const key = map[i]?.toLowerCase()
    const value = queryPath[i]

    if (!key || !value) continue
    if (NON_SPEC_KEYS.has(key)) continue

    const existing = groups.get(key)

    if (existing) {
      existing.push(value)
    } else {
      groups.set(key, [value])
    }
  }

  return groups
}

/**
 * Collects all variation names across all SKU items.
 * Only filters whose key matches a real variation should trigger SKU switching
 * (e.g. "color", "medida", "talle") — NOT product-level specs like "composición".
 */
function getVariationNames(items: any[]): Set<string> {
  const names = new Set<string>()

  for (const item of items) {
    if (item.variations?.length) {
      for (const v of item.variations) {
        if (v.name) names.add(slugToComparable(v.name))
      }
    }
  }

  return names
}

function findMatchingItem(
  items: any[],
  filterGroups: Map<string, string[]>
): any | null {
  if (!items?.length || !filterGroups.size) return null

  const variationNames = getVariationNames(items)

  // Only keep filter groups whose key is a real SKU variation.
  // Values are stored in URL order — last added = last in array = user's latest selection.
  const variationGroups = new Map<string, string[]>()

  for (const [key, values] of filterGroups) {
    if (!variationNames.has(slugToComparable(key))) continue

    // Reverse so the last selected value has highest priority
    variationGroups.set(
      slugToComparable(key),
      values.map(slugToComparable).reverse()
    )
  }

  if (!variationGroups.size) return null

  // Try each value combination in priority order (last selected first).
  // For each variation key, iterate values from last→first and return
  // the first SKU that matches.
  for (const [filterKey, filterValues] of variationGroups) {
    for (const filterValue of filterValues) {
      const match = items.find((item: any) => {
        if (!item.variations?.length) return false

        // Must match this specific value for this key
        const matchesTarget = item.variations.some((v: any) => {
          if (slugToComparable(v.name ?? '') !== filterKey) return false

          return v.values?.some(
            (val: string) => slugToComparable(val) === filterValue
          )
        })

        if (!matchesTarget) return false

        // Must also match at least one value for every OTHER variation key
        return [...variationGroups].every(([otherKey, otherValues]) => {
          if (otherKey === filterKey) return true

          return item.variations.some((v: any) => {
            if (slugToComparable(v.name ?? '') !== otherKey) return false

            return v.values?.some((val: string) =>
              otherValues.includes(slugToComparable(val))
            )
          })
        })
      })

      if (match) return match
    }
  }

  return null
}

/**
 * Fallback for fulltext search: matches words from the search term
 * against variation values to select the right SKU.
 * E.g. searching "juego sábanas queen" → "queen" matches "medida" variation.
 * Only checks real SKU variations (color, medida, talle), not product specs.
 */
function findMatchingItemBySearchTerm(
  items: any[],
  searchTerm: string
): any | null {
  if (!items?.length || !searchTerm) return null

  const variationNames = getVariationNames(items)

  if (!variationNames.size) return null

  const words = searchTerm
    .split(/\s+/)
    .map(slugToComparable)
    .filter((w) => w.length > 2)

  if (!words.length) return null

  let bestMatch: any | null = null
  let bestScore = 0

  for (const item of items) {
    if (!item.variations?.length) continue

    let score = 0

    for (const v of item.variations) {
      // Only check variations that are real SKU differentiators
      if (!variationNames.has(slugToComparable(v.name ?? ''))) continue

      for (const val of v.values ?? []) {
        const valComparable = slugToComparable(val)

        for (const word of words) {
          if (valComparable === word) {
            score += 2
          } else if (valComparable.includes(word) || word.includes(valComparable)) {
            score += 1
          }
        }
      }
    }

    if (score > bestScore) {
      bestScore = score
      bestMatch = item
    }
  }

  return bestMatch
}

interface GalleryLayoutItemProps {
  GalleryItemComponent: ComponentType<any>
  item: Product
  displayMode: string
  summary: unknown
  position: number
  listName: string
  /** Logic to enable which SKU will be the selected item */
  preferredSKU?: PreferredSKU
}

const GalleryLayoutItem: React.FC<GalleryLayoutItemProps> = ({
  GalleryItemComponent,
  item,
  displayMode,
  summary,
  position,
  listName,
  preferredSKU,
}) => {
  const { push } = usePixel()
  const { searchQuery } = useSearchPage()
  const { query } = useRuntime()

  // Memoize spec filter groups from URL — same `query` object for all gallery items,
  // so this avoids re-parsing map/query strings inside every product's useMemo.
  const filterGroups = useMemo(
    () => getActiveSpecFilterGroups(query ?? {}),
    [query]
  )

  // Fulltext search term for fallback SKU matching
  const searchTerm = useMemo(() => {
    const fullText = searchQuery?.variables?.fullText

    return typeof fullText === 'string' ? fullText : ''
  }, [searchQuery?.variables?.fullText])

  const product = useMemo(() => {
    const mapped = ProductSummary.mapCatalogProductToProductSummary(
      item,
      preferredSKU
    )

    if (!mapped.items?.length) return mapped

    // Priority 1: spec filters from URL (PLP with facets)
    let matchingItem =
      filterGroups.size > 0
        ? findMatchingItem(mapped.items, filterGroups)
        : null

    // Priority 2: fulltext search term fallback
    if (!matchingItem && searchTerm) {
      matchingItem = findMatchingItemBySearchTerm(mapped.items, searchTerm)
    }

    if (!matchingItem) return mapped

    // Already the correct SKU — no override needed
    if (matchingItem.itemId === mapped.sku?.itemId) return mapped

    // Override SKU before ProductSummaryContext is created
    return {
      ...mapped,
      sku: {
        ...matchingItem,
        image: matchingItem.images?.[0],
        seller: matchingItem.sellers?.[0],
      },
      selectedItem: matchingItem,
    }
  }, [item, preferredSKU, filterGroups, searchTerm])

  const handleClick = useCallback(() => {
    push({
      event: 'productClick',
      product,
      query: searchQuery?.variables?.query,
      map: searchQuery?.variables?.map,
      position,
      list: listName,
    })
  }, [
    product,
    push,
    searchQuery?.variables?.map,
    searchQuery?.variables?.query,
    position,
    listName,
  ])

  return (
    <GalleryItemComponent
      {...summary}
      product={product}
      displayMode={displayMode}
      actionOnClick={handleClick}
      listName={listName}
      position={position}
    />
  )
}

export default memo(GalleryLayoutItem)
