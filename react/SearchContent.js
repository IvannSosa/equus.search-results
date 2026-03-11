import React from 'react'
import { ExtensionPoint } from 'vtex.render-runtime'
import { path } from 'ramda'
import {
  useSearchPage,
  useSearchPageState,
} from 'vtex.search-page-context/SearchPageContext'

const SearchContent = () => {
  const { searchQuery, showFacets, lazyItemsRemaining } = useSearchPage()
  const { mobileLayout, showContentLoader } = useSearchPageState()

  const products =
    path(['data', 'productSearch', 'products'], searchQuery) || []

  const redirect = path(['data', 'productSearch', 'redirect'], searchQuery)

  // Keep a ref to the last valid products so we can show them behind the loader
  const prevProductsRef = React.useRef(products)

  if (products.length > 0) {
    prevProductsRef.current = products
  }

  // Initial load or redirect — nothing to show yet
  if (showContentLoader === undefined || redirect) {
    return null
  }

  // Use previous products while loading so the gallery stays visible
  const displayProducts = showContentLoader
    ? prevProductsRef.current
    : products

  if (!displayProducts || displayProducts.length === 0) {
    return <ExtensionPoint id="not-found" />
  }

  return (
    <>
      <ExtensionPoint
        id="gallery"
        products={displayProducts}
        className="bn"
        mobileLayoutMode={mobileLayout}
        showingFacets={showFacets}
        lazyItemsRemaining={lazyItemsRemaining}
      />
    </>
  )
}

export default SearchContent
