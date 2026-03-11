import React, { useMemo } from 'react'
import { zip } from 'ramda'
import { useRuntime } from 'vtex.render-runtime'
import { useCssHandles } from 'vtex.css-handles'
import { useSearchPage } from 'vtex.search-page-context/SearchPageContext'

const CSS_HANDLES = ['clearFiltersButton']

const NON_FILTER_MAPS = ['c', 'category-1', 'ft', 'seller', 'productClusterIds']

const ClearFiltersButton = ({ text = 'Borrar todo' }) => {
  const handles = useCssHandles(CSS_HANDLES)
  const { setQuery } = useRuntime()
  const { searchQuery } = useSearchPage()

  const query = searchQuery?.variables?.query
  const map = searchQuery?.variables?.map

  const hasFilters = useMemo(() => {
    if (!query || !map) return false

    const mapSegments = map.split(',')

    return mapSegments.some(m => !NON_FILTER_MAPS.includes(m))
  }, [query, map])

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

  if (!hasFilters) return null

  return (
    <button
      className={handles.clearFiltersButton}
      onClick={clearAll}
      type="button"
    >
      {text}
    </button>
  )
}

ClearFiltersButton.schema = {
  title: 'Clear Filters Button',
  type: 'object',
  properties: {
    text: {
      title: 'Button text',
      type: 'string',
      default: 'Borrar todo',
    },
  },
}

export default ClearFiltersButton
