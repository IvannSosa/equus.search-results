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

interface SpecFilter {
  key: string
  value: string
}

function getActiveSpecFilters(query: Record<string, string>): SpecFilter[] {
  const map = query?.map?.split(',') ?? []
  const queryPath = query?.query?.split('/').filter(Boolean) ?? []

  if (!map.length || !queryPath.length) return []

  const filters: SpecFilter[] = []

  for (let i = 0; i < map.length; i++) {
    const key = map[i]?.toLowerCase()
    const value = queryPath[i]

    if (!key || !value) continue
    if (NON_SPEC_KEYS.has(key)) continue

    filters.push({ key, value })
  }

  return filters
}

function findMatchingItem(items: any[], filters: SpecFilter[]): any | null {
  if (!items?.length || !filters.length) return null

  return items.find((item: any) => {
    return filters.every((filter) => {
      const filterKeyComparable = slugToComparable(filter.key)
      const filterValueComparable = slugToComparable(filter.value)

      if (item.variations?.length) {
        const matchInVariations = item.variations.some((v: any) => {
          const nameComparable = slugToComparable(v.name ?? '')
          if (nameComparable !== filterKeyComparable) return false

          return v.values?.some(
            (val: string) => slugToComparable(val) === filterValueComparable
          )
        })

        if (matchInVariations) return true
      }

      const specKeys = Object.keys(item).filter(
        (k) => Array.isArray(item[k]) && typeof item[k][0] === 'string'
      )

      return specKeys.some((specKey) => {
        if (slugToComparable(specKey) !== filterKeyComparable) return false

        return (item[specKey] as string[]).some(
          (val) => slugToComparable(val) === filterValueComparable
        )
      })
    })
  })
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

  // Memoize spec filters from URL — same `query` object for all gallery items,
  // so this avoids re-parsing map/query strings inside every product's useMemo.
  const activeFilters = useMemo(() => getActiveSpecFilters(query ?? {}), [query])

  const product = useMemo(() => {
    const mapped = ProductSummary.mapCatalogProductToProductSummary(
      item,
      preferredSKU
    )

    if (!activeFilters.length || !mapped.items?.length) return mapped

    const matchingItem = findMatchingItem(mapped.items, activeFilters)

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
  }, [item, preferredSKU, activeFilters])

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
