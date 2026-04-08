import React, { useEffect, useMemo, useRef } from 'react'
import { ProductListContext } from 'vtex.product-list-context'
import { useCssHandles } from 'vtex.css-handles'
import { useDevice } from 'vtex.device-detector'
import { ExtensionPoint, useRuntime } from 'vtex.render-runtime'
import { SearchPageContext } from 'vtex.search-page-context'
import {
  useSearchPage,
} from 'vtex.search-page-context/SearchPageContext'
import { path } from 'ramda'
import ProductSummary from 'vtex.product-summary/ProductSummaryCustom'
import { usePixel } from 'vtex.pixel-manager'

import { useBanners } from './GalleryBanners'
import ProductListEventCaller from '../utils/ProductListEventCaller'
import { SET_GALLERY_LAYOUTS_TYPE } from '../constants'

const { ProductListProvider } = ProductListContext
const { useSearchPageState, useSearchPageStateDispatch } = SearchPageContext

const CSS_HANDLES = [
  'sabanaGallery',
  'sabanaGallerySabana',
  'sabanaGalleryGrid',
  'sabanaRow',
  'sabanaRowLarge',
  'sabanaItem',
  'sabanaItemLarge',
  'sabanaBannerRow',
  'sabanaBannerRowSingle',
  'sabanaBannerRowMultiple',
  'sabanaBannerItem',
  'sabanaBannerLink',
  'sabanaBannerImage',
  'sabanaGridRow',
  'sabanaGridItem',
] as const

const DEFAULT_DESKTOP_PATTERN = [3, 2, 4, 3, 3, 4]
const DEFAULT_MOBILE_PATTERN = [1, 2, 1, 1, 2, 2]

const LAYOUT_SABANA = 'primary'
const LAYOUT_GRID = 'secondary'

const LAYOUTS = [
  { name: LAYOUT_SABANA, component: 'SabanaSummary', itemsPerRow: { desktop: 4, phone: 2 } },
  { name: LAYOUT_GRID, component: 'GridSummary', itemsPerRow: { desktop: 6, phone: 3 } },
]

interface Product {
  productId: string
  cacheId: string
  productName: string
  linkText: string
  [key: string]: unknown
}

interface BannerForRow {
  image: string
  imageMobile?: string
  url: string
  alt: string
  widthPercent: number
}

type Slots = Record<string, React.ComponentType<any>>

interface SabanaGalleryProps {
  desktopPattern?: string
  mobilePattern?: string
  gridDesktopColumns?: number
  gridMobileColumns?: number
  [slotName: string]: unknown
}

interface SabanaGalleryComponent extends React.FC<SabanaGalleryProps> {
  schema?: Record<string, unknown>
}

const parsePattern = (value: string | undefined, fallback: number[]): number[] => {
  if (!value) return fallback

  const parsed = value
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0)

  return parsed.length > 0 ? parsed : fallback
}

/** Individual product item with click tracking */
const SabanaProductItem: React.FC<{
  product: Product
  position: number
  listName: string
  ItemComponent?: React.ComponentType<any>
}> = ({ product, position, listName, ItemComponent }) => {
  const { push } = usePixel()
  const { searchQuery } = useSearchPage()

  const mappedProduct = useMemo(
    () => ProductSummary.mapCatalogProductToProductSummary(product),
    [product]
  )

  const handleClick = () => {
    push({
      event: 'productClick',
      product: mappedProduct,
      query: searchQuery?.variables?.query,
      map: searchQuery?.variables?.map,
      position,
      list: listName,
    })
  }

  if (ItemComponent) {
    return (
      <ItemComponent
        product={mappedProduct}
        actionOnClick={handleClick}
        listName={listName}
        position={position}
      />
    )
  }

  return (
    <ExtensionPoint
      id="product-summary"
      product={mappedProduct}
      actionOnClick={handleClick}
      listName={listName}
      position={position}
    />
  )
}

const SabanaGallery: SabanaGalleryComponent = ({
  desktopPattern: desktopPatternStr,
  mobilePattern: mobilePatternStr,
  gridDesktopColumns = 6,
  gridMobileColumns = 3,
  ...slots
}) => {
  const typedSlots = slots as unknown as Slots
  const handles = useCssHandles(CSS_HANDLES)
  const { isMobile } = useDevice()
  const { banners } = useBanners()
  const { searchQuery, maxItemsPerPage, page } = useSearchPage()
  const runtime = useRuntime() as any
  const searchPageState = useSearchPageState() as unknown as Record<string, unknown>
  const searchPageStateDispatch = useSearchPageStateDispatch()
  const showContentLoader = searchPageState?.showContentLoader
  const selectedGalleryLayout = (searchPageState?.selectedGalleryLayout as string) || LAYOUT_SABANA

  const products: Product[] =
    (path(['data', 'productSearch', 'products'], searchQuery) as Product[]) || []

  const redirect = path(['data', 'productSearch', 'redirect'], searchQuery)

  // Register layouts for the gallery layout switcher
  useEffect(() => {
    searchPageStateDispatch({
      type: SET_GALLERY_LAYOUTS_TYPE,
      args: { galleryLayouts: LAYOUTS },
    })
  }, [searchPageStateDispatch])

  const isGridMode = selectedGalleryLayout === LAYOUT_GRID

  // Resolve which product-summary slot to use based on current layout
  const currentLayout = LAYOUTS.find(l => l.name === selectedGalleryLayout) || LAYOUTS[0]
  const CurrentItemComponent = typedSlots[currentLayout.component] || undefined

  const desktopPattern = parsePattern(desktopPatternStr, DEFAULT_DESKTOP_PATTERN)
  const mobilePattern = parsePattern(mobilePatternStr, DEFAULT_MOBILE_PATTERN)
  const pattern = isMobile ? mobilePattern : desktopPattern

  const listName = 'Sabana Gallery'

  // ---- Sabana mode: irregular pattern with banners ----
  const rows = useMemo(() => {
    if (isGridMode) return []

    const result: { products: Product[]; itemsInRow: number; startIndex: number }[] = []
    let productIndex = 0
    let patternIndex = 0

    while (productIndex < products.length) {
      const itemsInRow = pattern[patternIndex % pattern.length]
      const rowProducts = products.slice(productIndex, productIndex + itemsInRow)

      result.push({
        products: rowProducts,
        itemsInRow,
        startIndex: productIndex,
      })

      productIndex += itemsInRow
      patternIndex++
    }

    return result
  }, [products, pattern, isGridMode])

  // ---- Grid mode: uniform rows ----
  const gridColumns = isMobile ? gridMobileColumns : gridDesktopColumns

  const gridRows = useMemo(() => {
    if (!isGridMode) return []

    const result: Product[][] = []
    let i = 0

    while (i < products.length) {
      result.push(products.slice(i, i + gridColumns))
      i += gridColumns
    }

    return result
  }, [products, gridColumns, isGridMode])

  // Map banners by position (1-based product index)
  const bannersAfterPosition = useMemo(() => {
    if (!banners?.length) return new Map<number, BannerForRow[]>()

    const map = new Map<number, BannerForRow[]>()

    banners.forEach((banner: any) => {
      const position = isMobile
        ? (banner.positionMobile || banner.position)
        : banner.position

      if (!position) return

      const widthStr = isMobile
        ? (banner.widthPositionMobile || banner.widthPosition || '4')
        : (banner.widthPosition || '4')

      const cols = Number(widthStr)
      // Desktop: base 4 columnas (4=100%, 2=50%, 1=25%)
      // Mobile: base 2 columnas (2=100%, 1=50%)
      const base = isMobile ? 2 : 4
      const widthPercent = (100 / base) * cols

      const existing = map.get(Number(position)) || []
      existing.push({
        image: banner.image,
        imageMobile: (banner as any).imageMobile,
        url: banner.url,
        alt: banner.alt,
        widthPercent,
      })
      map.set(Number(position), existing)
    })

    return map
  }, [banners, isMobile])

  // Track the lowest page ever loaded during this component's lifetime.
  // This correctly handles: show-more (appends, min stays), fetch-previous
  // (prepends, min decreases), and direct page loads.
  const initialPage = page || 1
  const currentUrlPage = runtime.query?.page
    ? Number(runtime.query.page)
    : initialPage

  const minPageRef = useRef(Math.min(initialPage, currentUrlPage))

  if (currentUrlPage < minPageRef.current) {
    minPageRef.current = currentUrlPage
  }

  const pageOffset =
    (minPageRef.current - 1) * (maxItemsPerPage || products.length)

  const getBannersBeforeRow = (startIndex: number, itemsInRow: number) => {
    const result: BannerForRow[] = []

    for (let i = startIndex + 1; i <= startIndex + itemsInRow; i++) {
      const absolutePosition = i + pageOffset
      const rowBanners = bannersAfterPosition.get(absolutePosition)
      if (rowBanners) {
        result.push(...rowBanners)
      }
    }

    return result
  }

  const isLargeRow = (itemsInRow: number) => {
    if (isMobile) return itemsInRow === 1
    return itemsInRow <= 2
  }

  if (showContentLoader === undefined || showContentLoader || redirect) {
    return null
  }

  if (!products.length) {
    return <ExtensionPoint id="not-found" />
  }

  // ---- Grid mode render ----
  if (isGridMode) {
    const gridItemWidth = `${100 / gridColumns}%`

    return (
      <ProductListProvider listName={listName}>
        <div className={`${handles.sabanaGallery} ${handles.sabanaGalleryGrid}`}>
          {gridRows.map((rowProducts, rowIndex) => (
            <div
              key={`grid-row-${rowIndex}`}
              className={handles.sabanaGridRow}
              style={{ display: 'flex', flexWrap: 'wrap' }}
            >
              {rowProducts.map((product, index) => {
                const absolutePosition = rowIndex * gridColumns + index + 1

                return (
                  <div
                    key={product.cacheId}
                    className={`${handles.sabanaGridItem} pa4`}
                    style={{ flexBasis: gridItemWidth, maxWidth: gridItemWidth }}
                  >
                    <SabanaProductItem
                      product={product}
                      position={absolutePosition}
                      listName={listName}
                      ItemComponent={CurrentItemComponent}
                    />
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        <ProductListEventCaller />
      </ProductListProvider>
    )
  }

  // ---- Sabana mode render ----
  return (
    <ProductListProvider listName={listName}>
      <div className={`${handles.sabanaGallery} ${handles.sabanaGallerySabana}`}>
        {rows.map((row, rowIndex) => {
          const rowBanners = getBannersBeforeRow(row.startIndex, row.itemsInRow)
          const large = isLargeRow(row.itemsInRow)
          // Desktop: solo filas large (2 cols) llevan width forzado, el resto usa tamaño natural
          // Mobile: todas las filas llevan width forzado para que entren en pantalla
          const itemWidth = (large || isMobile) ? `${100 / row.itemsInRow}%` : undefined

          return (
            <React.Fragment key={`sabana-row-${rowIndex}`}>
              {rowBanners.length > 0 && (
                <div
                  className={`${handles.sabanaBannerRow} ${rowBanners.length === 1 ? handles.sabanaBannerRowSingle : handles.sabanaBannerRowMultiple}`}
                  style={{ display: 'flex', flexWrap: 'wrap', width: '100%' }}
                >
                  {rowBanners.map((banner, bannerIndex) => (
                    <div
                      key={`banner-${rowIndex}-${bannerIndex}`}
                      className={handles.sabanaBannerItem}
                      style={{
                        width: `${banner.widthPercent}%`,
                        padding: '0.5rem 0.3125rem',
                      }}
                    >
                      <a href={banner.url} className={handles.sabanaBannerLink} style={{ display: 'inline-flex', width: '100%', height: '100%' }}>
                        <img
                          src={isMobile && banner.imageMobile ? banner.imageMobile : banner.image}
                          alt={banner.alt || ''}
                          className={handles.sabanaBannerImage}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </a>
                    </div>
                  ))}
                </div>
              )}

              <div
                className={`${handles.sabanaRow} ${large ? handles.sabanaRowLarge : ''}`}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: large ? 'flex-start' : 'center',
                }}
              >
                {row.products.map((product, index) => {
                  const absolutePosition = row.startIndex + index + 1

                  return (
                    <div
                      key={product.cacheId}
                      className={`${handles.sabanaItem} ${large ? handles.sabanaItemLarge : ''} pa4`}
                      style={
                        itemWidth
                          ? { flexBasis: itemWidth, maxWidth: itemWidth }
                          : undefined
                      }
                    >
                      <SabanaProductItem
                        product={product}
                        position={absolutePosition}
                        listName={listName}
                        ItemComponent={CurrentItemComponent}
                      />
                    </div>
                  )
                })}
              </div>
            </React.Fragment>
          )
        })}
      </div>
      <ProductListEventCaller />
    </ProductListProvider>
  )
}

SabanaGallery.schema = {
  title: 'Sabana Gallery',
  type: 'object',
  properties: {
    desktopPattern: {
      title: 'Patrón de grilla desktop',
      description: 'Cantidad de productos por fila, separado por comas (ej: 3,2,4,3,3,4)',
      type: 'string',
      default: '3,2,4,3,3,4',
    },
    mobilePattern: {
      title: 'Patrón de grilla mobile',
      description: 'Cantidad de productos por fila, separado por comas (ej: 1,2,1,1,2,2)',
      type: 'string',
      default: '1,2,1,1,2,2',
    },
    gridDesktopColumns: {
      title: 'Columnas en vista grilla (Desktop)',
      type: 'number',
      default: 6,
    },
    gridMobileColumns: {
      title: 'Columnas en vista grilla (Mobile)',
      type: 'number',
      default: 3,
    },
  },
}

export default SabanaGallery
