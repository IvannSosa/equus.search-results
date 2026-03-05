import type { ComponentType } from 'react'
import React, { memo, useMemo } from 'react'
import { useCssHandles, applyModifiers } from 'vtex.css-handles'
import classNames from 'classnames'
import { useBanners } from './GalleryBanners'
import { useRenderOnView } from '../hooks/useRenderOnView'
import { useSearchPage } from 'vtex.search-page-context/SearchPageContext'
import { useDevice } from 'vtex.device-detector'
import GalleryItem from './GalleryLayoutItem'
import type { Product } from '../Gallery'
import type { PreferredSKU } from '../GalleryLayout'
import styles from '../searchResult.css'

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
  const banners = useBanners()
  const { page } = useSearchPage()
  const { isMobile } = useDevice()

  console.log('page', page)
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
            className={styles.bannerItem}
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
          animation: `galleryItemFadeIn 200ms ease-in forwards`,
          animationDelay: `${globalIndex * 50}ms`,
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