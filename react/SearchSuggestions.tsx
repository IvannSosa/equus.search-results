import React from 'react'
import { useQuery } from 'react-apollo'
import { Link } from 'vtex.render-runtime'
import { useSearchPage } from 'vtex.search-page-context/SearchPageContext'
import searchSuggestionsQuery from 'vtex.store-resources/QuerySearchSuggestions'

import styles from './searchSuggestions.css'

interface SearchSuggestionsProps {
  customPage?: string
}

interface SuggestionData {
  searchSuggestions: {
    searches: Array<{
      term: string
      count: number
    }>
  }
}

const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  customPage,
}) => {
  const { searchQuery } = useSearchPage()
  const fullText = searchQuery?.variables?.fullText

  if (!fullText) {
    return null
  }

  const { data, loading } = useQuery<SuggestionData>(searchSuggestionsQuery, {
    variables: { fullText },
  })

  const suggestions = data?.searchSuggestions?.searches ?? []

  return (
    <div className={styles.container}>
      {!loading && suggestions.length > 0 && (
        <div className={styles.suggestionsRow}>
          <p className={styles.suggestionsLabel}>
            Sugerencias relacionadas a la palabra
          </p>
          {suggestions.map(suggestion => (
            <Link
              key={suggestion.term}
              className={styles.suggestionLink}
              page={customPage || 'store.search'}
              query="map=ft"
              params={{ term: suggestion.term }}
            >
              {suggestion.term}
            </Link>
          ))}
        </div>
      )}
      <p className={styles.resultTitle}>
        {'Resultados de búsqueda: '}
        <span className={styles.resultTerm}>{fullText}</span>
      </p>
    </div>
  )
}

export default SearchSuggestions
