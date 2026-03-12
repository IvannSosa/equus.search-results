import type { ComponentType } from 'react'
import React, { memo, useMemo } from 'react'
import { useCssHandles, applyModifiers } from 'vtex.css-handles'
import classNames from 'classnames'
import { useBanners } from './GalleryBanners'
import { useRenderOnView } from '../hooks/useRenderOnView'
import { useSearchPage } from 'vtex.search-page-context/SearchPageContext'
import { useRuntime } from 'vtex.render-runtime'
import { useDevice } from 'vtex.device-detector'
import GalleryItem from './GalleryLayoutItem'
import type { Product } from '../Gallery'
import type { PreferredSKU } from '../GalleryLayout'
import styles from '../searchResult.css'

/* ── Category / Collection matcher ── */

const FACETS_LIST = ['category-1', 'category-2', 'category-3', 'c', 'productClusterIds']

const getCurrentPath = (route: Record<string, any> | null): string => {
  const canonical = route?.canonicalPath || route?.path
  if (canonical && typeof canonical === 'string') {
    return canonical.split('?')[0].replace(/\/$/, '').toLowerCase() || '/'
  }
  if (typeof window !== 'undefined' && window.location) {
    return window.location.pathname.split('?')[0].replace(/\/$/, '').toLowerCase() || '/'
  }
  return ''
}

const matchesCurrentContext = (
  matchId: string | undefined,
  currentPath: string,
  categoryId: string | null,
  collectionId: string | null,
  productClusterIds: string[],
  categoryPath: string
): boolean => {
  if (!matchId) return true // sin matchId → se muestra en todas las PLPs

  const id = matchId.trim()
  if (!id) return true

  if (id.startsWith('/')) {
    const normalized = id.toLowerCase().replace(/\/$/, '')
    return currentPath === normalized || currentPath.startsWith(normalized + '/')
  }

  if (categoryId && id === categoryId) return true
  if (collectionId && id === collectionId) return true
  if (productClusterIds.includes(id)) return true
  if (categoryPath && id === categoryPath) return true

  return false
}

const CSS_HANDLES = ['galleryItem'] as const

interface ResolvedBanner {
  banner: {
    image: string
    imageMobile?: string
    url: string
    alt: string
  }
  position: number | undefined
  widthPosition: number
}

interface GalleryLayoutRowProps {
  currentLayoutName: string
  displayMode: string
  GalleryItemComponent: ComponentType
  itemsPerRow: number
  lazyRender: boolean
  products: Product[]
  summary: unknown
  rowIndex: number
  listName: string
  /** Logic to enable which SKU will be the selected item */
  preferredSKU?: PreferredSKU
  /** Fade animation phase: 'idle' | 'fadeOut' | 'staggerIn' */
  gridPhase?: string
  /** Base product index for stagger delay calculation */
  baseIndex?: number
}

const GalleryLayoutRow: React.FC<GalleryLayoutRowProps> = ({
  GalleryItemComponent,
  displayMode,
  itemsPerRow,
  lazyRender,
  products,
  summary,
  currentLayoutName,
  rowIndex,
  listName,
  preferredSKU,
  gridPhase = 'idle',
  baseIndex = 0,
}) => {
  const handles = useCssHandles(CSS_HANDLES)
  const allBanners = useBanners()
  const { searchQuery, page, params } = useSearchPage()
  const { route } = useRuntime()
  const { isMobile } = useDevice()

  const selectedFacets = searchQuery?.variables?.selectedFacets as
    | Array<{ key: string; value: string }>
    | undefined

  const banners = useMemo(() => {
    const currentPath = getCurrentPath(route)
    const categoryId = params?.id ?? params?.term ?? null
    const collectionId = searchQuery?.variables?.query ?? null
    const productClusterIds = (selectedFacets || [])
      .filter((f) => f.key === 'productClusterIds')
      .map((f) => f.value)
    const categoryPath = (selectedFacets || [])
      .filter((f) => FACETS_LIST.includes(f.key))
      .map((f) => f.value)
      .join('/')

    // Si hay banners específicos para el layout actual, solo mostrar esos
    // Si no hay ninguno específico, mostrar los genéricos (sin layoutId)
    const hasLayoutSpecific = allBanners.some(
      (b) => b.layoutId?.trim() === currentLayoutName
    )

    return allBanners.filter((b) => {
      const bannerLayout = b.layoutId?.trim()

      if (hasLayoutSpecific) {
        // Hay banners para este layout → solo esos
        if (bannerLayout !== currentLayoutName) return false
      } else {
        // No hay banners específicos → solo los genéricos (sin layoutId)
        if (bannerLayout) return false
      }

      return matchesCurrentContext(
        b.matchId,
        currentPath,
        categoryId,
        collectionId,
        productClusterIds,
        categoryPath
      )
    })
  }, [allBanners, route, params, searchQuery, selectedFacets, currentLayoutName])

  const currentPage = page || 1
  const effectiveItemsPerRow = isMobile ? Math.min(itemsPerRow, 2) : itemsPerRow
  const pageSize = products.length || effectiveItemsPerRow

  const finalBanners = useMemo(() => {
    if (!banners?.length) return [] as ResolvedBanner[]

    return banners.reduce((acc, banner) => {
      const position = isMobile ? (banner.positionMobile || banner.position) : banner.position
      const widthPosition = isMobile ? (banner.widthPositionMobile || banner.widthPosition) : banner.widthPosition
      const repeatBanner = isMobile
        ? (banner.repeatBannerMobile !== undefined ? banner.repeatBannerMobile : banner.repeatBanner)
        : banner.repeatBanner

      const widthPercent = (100 / effectiveItemsPerRow) * Number(widthPosition || 1)

      if (repeatBanner && position) {
        const interval = Number(position)
        if (interval > 0) {
          for (let i = 1; i * interval <= 200; i++) {
            acc.push({ banner, position: i * interval, widthPosition: widthPercent })
          }
        }
      } else {
        acc.push({ banner, position, widthPosition: widthPercent })
      }

      return acc
    }, [] as ResolvedBanner[])
  }, [banners, isMobile, effectiveItemsPerRow])

  const style = {
    flexBasis: `${100 / effectiveItemsPerRow}%`,
    maxWidth: `${100 / effectiveItemsPerRow}%`,
  }

  const { hasBeenViewed, dummyElement } = useRenderOnView({
    lazyRender,
    offset: 900,
  })

  if (!hasBeenViewed) {
    return dummyElement
  }

  const items: React.ReactNode[] = []

  products.forEach((product, index) => {
    const absoluteProductIndex = rowIndex * effectiveItemsPerRow + index + 1
    const globalPosition = (currentPage - 1) * pageSize + absoluteProductIndex

    // Insert banner BEFORE this product if a banner targets this global position
    const bannerForPosition = finalBanners.find(b => b.position === globalPosition)

    if (bannerForPosition) {
      const bannerSrc = isMobile
        ? (bannerForPosition.banner.imageMobile || bannerForPosition.banner.image)
        : bannerForPosition.banner.image

      if (bannerSrc) {
        const imgElement = (
          <img
            className={styles.bannerImage}
            src={bannerSrc}
            alt={bannerForPosition.banner.alt || ''}
          />
        )

        items.push(
          <div
            key={`banner-${globalPosition}`}
            className={classNames(
              styles.bannerItem,
              applyModifiers(handles.galleryItem, [
                displayMode,
                currentLayoutName,
              ])
            )}
            style={{ width: `${bannerForPosition.widthPosition}%` }}
          >
            {bannerForPosition.banner.url ? (
              <a className={styles.bannerUrl} href={bannerForPosition.banner.url}>
                {imgElement}
              </a>
            ) : (
              imgElement
            )}
          </div>
        )
      }
    }

    // Always render the product (banners insert, never replace)
    const globalIndex = baseIndex + index
    const staggerStyle = gridPhase === 'staggerIn'
      ? {
          ...style,
          opacity: 0,
          animation: `galleryItemFadeIn 250ms ease-out forwards`,
          animationDelay: `${globalIndex * 40}ms`,
        }
      : style

    items.push(
      <div
        key={product.cacheId}
        style={staggerStyle}
        className={classNames(
          applyModifiers(handles.galleryItem, [
            displayMode,
            currentLayoutName,
          ]),
          'pa4'
        )}
      >
        <GalleryItem
          GalleryItemComponent={GalleryItemComponent}
          item={product}
          summary={summary}
          displayMode={displayMode}
          position={absoluteProductIndex}
          listName={listName}
          preferredSKU={preferredSKU}
        />
      </div>
    )
  })

  return <>{items}</>
}

export default memo(GalleryLayoutRow)