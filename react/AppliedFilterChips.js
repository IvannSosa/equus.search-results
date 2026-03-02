import React, { useMemo } from 'react'
import { zip } from 'ramda'
import { useRuntime } from 'vtex.render-runtime'
import { useCssHandles } from 'vtex.css-handles'
import { useSearchPage } from 'vtex.search-page-context/SearchPageContext'

const CSS_HANDLES = [
  'appliedFiltersContainer',
  'appliedFilterChip',
  'appliedFilterChipRemove',
  'appliedFilterChipText',
  'appliedFiltersClearAll',
]

const NON_FILTER_MAPS = ['c', 'category-1', 'category-2', 'category-3', 'category-4', 'ft', 'seller', 'productClusterIds']

const AppliedFilterChips = () => {
  const handles = useCssHandles(CSS_HANDLES)
  const { setQuery } = useRuntime()
  const { searchQuery } = useSearchPage()

  const query = searchQuery?.variables?.query
  const map = searchQuery?.variables?.map

  const appliedFilters = useMemo(() => {
    if (!query || !map) return []

    const cleanQuery = query.replace(/^\//, '')
    const querySegments = cleanQuery.split('/')
    const mapSegments = map.split(',')

    if (querySegments.length !== mapSegments.length) return []

    const paired = zip(querySegments, mapSegments)

    return paired
      .map(([value, mapVal]) => {
        if (NON_FILTER_MAPS.includes(mapVal)) return null

        let displayName = decodeURIComponent(value)

        // Look up human-readable name from search facets
        const facets = searchQuery?.data?.facets

        if (facets?.specificationFilters) {
          for (const group of facets.specificationFilters) {
            const match = group.facets?.find(
              f =>
                decodeURIComponent(f.value).toLowerCase() ===
                decodeURIComponent(value).toLowerCase()
            )

            if (match) {
              displayName = match.name
              break
            }
          }
        }

        if (facets?.brands) {
          const brandMatch = facets.brands.find(
            b =>
              decodeURIComponent(b.value).toLowerCase() ===
              decodeURIComponent(value).toLowerCase()
          )

          if (brandMatch) {
            displayName = brandMatch.name
          }
        }

        return { value, map: mapVal, displayName }
      })
      .filter(Boolean)
  }, [query, map, searchQuery])

  const removeFilter = filter => {
    const cleanQuery = query.replace(/^\//, '')
    const querySegments = cleanQuery.split('/')
    const mapSegments = map.split(',')
    const paired = zip(querySegments, mapSegments)

    const remaining = paired.filter(
      ([value, mapVal]) =>
        !(
          decodeURIComponent(value).toLowerCase() ===
            decodeURIComponent(filter.value).toLowerCase() &&
          mapVal === filter.map
        )
    )

    const newQuery = remaining.map(([v]) => v).join('/')
    const newMap = remaining.map(([, m]) => m).join(',')

    setQuery({
      map: newMap || undefined,
      query: `/${newQuery}`,
      page: undefined,
    })
  }

  const clearAll = () => {
    const cleanQuery = query.replace(/^\//, '')
    const querySegments = cleanQuery.split('/')
    const mapSegments = map.split(',')
    const paired = zip(querySegments, mapSegments)

    const categoryOnly = paired.filter(([, mapVal]) =>
      NON_FILTER_MAPS.includes(mapVal)
    )

    const newQuery = categoryOnly.map(([v]) => v).join('/')
    const newMap = categoryOnly.map(([, m]) => m).join(',')

    setQuery({
      map: newMap || undefined,
      query: `/${newQuery}`,
      page: undefined,
      priceRange: undefined,
    })
  }

  if (appliedFilters.length === 0) return null

  return (
    <div className={handles.appliedFiltersContainer}>
      {appliedFilters.map((filter, i) => (
        <button
          key={`${filter.map}-${filter.value}-${i}`}
          className={handles.appliedFilterChip}
          onClick={() => removeFilter(filter)}
          type="button"
        >
          <svg
            className={handles.appliedFilterChipRemove}
            xmlns="http://www.w3.org/2000/svg"
            width="6"
            height="6"
            viewBox="0 0 7 7"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M6.5 0.5L0.5 6.5M0.5 0.5L6.5 6.5"
              stroke="#3E3E3E"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className={handles.appliedFilterChipText}>
            {filter.displayName}
          </span>
        </button>
      ))}
      <button
        className={handles.appliedFiltersClearAll}
        onClick={clearAll}
        type="button"
      >
        Borrar todo
      </button>
    </div>
  )
}

export default AppliedFilterChips
