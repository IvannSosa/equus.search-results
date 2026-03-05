import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import classNames from 'classnames'
import { ProductListContext } from 'vtex.product-list-context'
import { Spinner } from 'vtex.styleguide'
import { useCssHandles, applyModifiers } from 'vtex.css-handles'
import { useResponsiveValue } from 'vtex.responsive-values'
import type { MaybeResponsiveInput } from 'vtex.responsive-values'
import { useRuntime } from 'vtex.render-runtime'
import { SearchPageContext } from 'vtex.search-page-context'
import { useSearchPage } from 'vtex.search-page-context/SearchPageContext'

import GalleryLayoutRow from './components/GalleryLayoutRow'
import SettingsContext from './components/SettingsContext'
import { useFilterToggle } from './components/FilterToggleContext'
import ProductListEventCaller from './utils/ProductListEventCaller'
import type { Product } from './Gallery'
import {
  SET_GALLERY_LAYOUTS_TYPE,
  SWITCH_GALLERY_LAYOUT_TYPE,
} from './constants'
import { useBreadcrumb } from './hooks/useBreadcrumb'
import { useSearchTitle } from './hooks/useSearchTitle'

const LAZY_RENDER_THRESHOLD = 2

const CSS_HANDLES = ['gallery'] as const

const { ProductListProvider } = ProductListContext
const { useSearchPageState, useSearchPageStateDispatch } = SearchPageContext

interface LayoutOption {
  name: string
  component: string
  itemsPerRow: MaybeResponsiveInput<number>
}

export type Slots = Record<string, ComponentType>

export interface GalleryLayoutProps {
  layouts: LayoutOption[]
  lazyItemsRemaining: number
  products: Product[]
  showingFacets: boolean
  summary: unknown
  /** Logic to enable which SKU will be the selected item */
  preferredSKU?: PreferredSKU
  slots: Slots
}

export type PreferredSKU =
  | 'FIRST_AVAILABLE'
  | 'LAST_AVAILABLE'
  | 'PRICE_ASC'
  | 'PRICE_DESC'

const GalleryLayout: React.FC<GalleryLayoutProps> = ({
  layouts,
  lazyItemsRemaining,
  products,
  showingFacets,
  summary,
  preferredSKU,
  slots,
}) => {
  const { trackingId } = useContext(SettingsContext) || {}
  const handles = useCssHandles(CSS_HANDLES)
  const { getSettings } = useRuntime()
  const { selectedGalleryLayout, isFetchingMore } = useSearchPageState()
  const searchPageStateDispatch = useSearchPageStateDispatch()
  const { filtersVisible } = useFilterToggle()
  const { searchQuery } = useSearchPage()

  // Fade animation: fade-out container + loader, stagger fade-in per item
  const isFilterLoading = !!(searchQuery?.loading && !isFetchingMore)
  const [gridPhase, setGridPhase] = useState<'idle' | 'fadeOut' | 'staggerIn'>('idle')
  const prevLoadingRef = useRef(false)
  const staggerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Loading just started → always fade out (cancel any running stagger)
    if (isFilterLoading && !prevLoadingRef.current) {
      if (staggerTimerRef.current) {
        clearTimeout(staggerTimerRef.current)
        staggerTimerRef.current = null
      }
      setGridPhase('fadeOut')
    }

    // Loading just ended → stagger in
    if (!isFilterLoading && prevLoadingRef.current) {
      setGridPhase('staggerIn')
      staggerTimerRef.current = setTimeout(() => {
        setGridPhase('idle')
        staggerTimerRef.current = null
      }, 1500)
    }

    prevLoadingRef.current = isFilterLoading
  }, [isFilterLoading])

  const breadcrumb = useBreadcrumb()
  const searchTitle = useSearchTitle(breadcrumb ?? [], { matchFt: true }).trim()

  // Not using ?? operator because trackingId and searchTitle can be ''
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const listName = trackingId || searchTitle || 'Search result'

  useEffect(() => {
    searchPageStateDispatch({
      type: SET_GALLERY_LAYOUTS_TYPE,
      args: { galleryLayouts: layouts },
    })
  }, [layouts, searchPageStateDispatch])

  const currentLayoutOption = useMemo(() => {
    let layoutOption

    if (selectedGalleryLayout) {
      layoutOption = layouts.find(
        layout => layout.name === selectedGalleryLayout
      )
    } else {
      console.error(
        'No default gallery layout defined. Set it in search-result-layout by using the defaultGalleryLayout prop.'
      )
    }

    if (!layoutOption) {
      layoutOption = layouts[0]

      searchPageStateDispatch({
        type: SWITCH_GALLERY_LAYOUT_TYPE,
        args: {
          selectedGalleryLayout: layouts[0].name,
          focus: false,
        },
      })
    }

    return layoutOption
  }, [selectedGalleryLayout, layouts, searchPageStateDispatch])

  const itemsPerRow = useResponsiveValue(currentLayoutOption.itemsPerRow)

  const galleryRows = useMemo(() => {
    const rows = []

    let i = 0

    while (i * itemsPerRow < products.length) {
      const start = i * itemsPerRow
      const end = (i + 1) * itemsPerRow

      rows.push(products.slice(start, end))
      i++
    }

    return rows
  }, [itemsPerRow, products])

  if (!layouts || layouts.length === 0) {
    return null
  }

  if (!slots[currentLayoutOption.component]) {
    console.error(
      `Define a Slot with name "${currentLayoutOption.component}" for the layout "${currentLayoutOption.name}".`
    )

    return null
  }

  const filtersModifier = filtersVisible ? 'filtersOpen' : 'filtersClosed'

  const galleryClasses = classNames(
    applyModifiers(handles.gallery, [currentLayoutOption.name, filtersModifier]),
    'flex flex-row flex-wrap items-stretch bn ph1 na4',
    {
      'justify-center': !showingFacets && !filtersVisible,
      'pl9-l': showingFacets || filtersVisible,
    }
  )

  const isLazyRenderEnabled =
    getSettings('vtex.store')?.enableSearchRenderingOptimization

  return (
    <ProductListProvider listName={listName as string}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes galleryItemFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes logoSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes logoFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes logoFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}} />
      <div style={{ position: 'relative' }}>
        {gridPhase === 'fadeOut' && (
          <div style={{
            position: 'sticky',
            top: '40vh',
            display: 'flex',
            justifyContent: 'center',
            zIndex: 10,
            pointerEvents: 'none',
            animation: 'logoFadeIn 200ms ease-in forwards',
          }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="37"
              height="37"
              viewBox="0 0 37 37"
              fill="none"
              style={{ animation: 'logoSpin 0.8s linear infinite' }}
            >
              <circle cx="7.53704" cy="7.53704" r="7.53704" fill="#6A6A6A" />
              <circle cx="29.4628" cy="7.53704" r="7.53704" fill="#6A6A6A" />
              <circle cx="7.53704" cy="29.4631" r="7.53704" fill="#6A6A6A" />
              <circle cx="29.4628" cy="29.4631" r="7.53704" fill="#6A6A6A" />
            </svg>
          </div>
        )}
        <div
          id="gallery-layout-container"
          className={galleryClasses}
          style={gridPhase === 'fadeOut' ? {
            opacity: 0,
            transition: 'opacity 100ms ease-out',
          } : undefined}
        >
          {galleryRows.map((rowProducts, index) => (
            <GalleryLayoutRow
              key={`${currentLayoutOption.name}-${index}`}
              products={rowProducts}
              lazyRender={
                !!isLazyRenderEnabled && index >= LAZY_RENDER_THRESHOLD
              }
              summary={summary}
              displayMode="normal"
              itemsPerRow={itemsPerRow}
              gridPhase={gridPhase}
              baseIndex={index * itemsPerRow}
              currentLayoutName={currentLayoutOption.name}
              rowIndex={index}
              listName={listName}
              preferredSKU={preferredSKU}
              GalleryItemComponent={slots[currentLayoutOption.component]}
            />
          ))}
          {typeof lazyItemsRemaining === 'number' &&
            lazyItemsRemaining > 0 && (
              <div
                style={{
                  width: '100%',
                  height: 300 * Math.ceil(lazyItemsRemaining / itemsPerRow),
                }}
                className="flex justify-center pt10"
              >
                <Spinner />
              </div>
            )}
        </div>
      </div>
      <ProductListEventCaller />
    </ProductListProvider>
  )
}

export default GalleryLayout
