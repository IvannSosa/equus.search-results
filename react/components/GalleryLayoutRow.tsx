import type { ComponentType } from 'react'
import React, { memo } from 'react'
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
import { pathOr } from 'ramda'

const CSS_HANDLES = ['galleryItem'] as const

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
}) => {
  const handles = useCssHandles(CSS_HANDLES)
  const { banners, bannerVistaSecundaria, layoutNamesForSecondaryView } = useBanners();
  const { searchQuery, page } = useSearchPage();
  const { isMobile } = useDevice();
  const maxItems = pathOr(10, ['data', 'productSearch', 'recordsFiltered'], searchQuery);

  // Select banners based on currentLayoutName
  const selectedBanners = currentLayoutName === layoutNamesForSecondaryView
    ? bannerVistaSecundaria
    : banners;


  // Use the itemsPerRow value directly without mobile limitation
  const effectiveItemsPerRow = itemsPerRow;

  const finalBanners = selectedBanners?.reduce((acc, banner) => {
    // Use mobile settings if on mobile, otherwise use desktop settings
    const position = isMobile ? (banner.positionMobile || banner.position) : banner.position
    const widthPosition = isMobile ? (banner.widthPositionMobile || banner.widthPosition) : banner.widthPosition
    const repeatBanner = isMobile ? (banner.repeatBannerMobile !== undefined ? banner.repeatBannerMobile : banner.repeatBanner) : banner.repeatBanner

    if (repeatBanner) {
      // Repeat every N positions where N is the banner position
      const interval = Number(position)
      for (let i = 0; i <= maxItems; i++) {
        const repeatPosition = interval * i
        if (repeatPosition <= 100) {
          acc.push({
            banner: banner,
            position: repeatPosition,
            widthPosition: 100 / effectiveItemsPerRow * Number(widthPosition)
          })
        }
      }
    } else {
      acc.push({
        banner: banner,
        position: position,
        widthPosition: 100 / effectiveItemsPerRow * Number(widthPosition)
      })
    }

    return acc
  }, [] as any[])


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

  return (
    <>
      {products.map((product, index) => {
        const absoluteProductIndex = rowIndex * effectiveItemsPerRow + index + 1
        // Calculate global position considering pagination
        const globalPosition = (page - 1) * maxItems + absoluteProductIndex

        // Check if there's a banner for this global position
        const bannerForPosition = finalBanners?.find(banner => banner.position === globalPosition)

        if (bannerForPosition) {
          return (
            <div key={`banner-${absoluteProductIndex}`} className={styles.bannerItem} style={{ width: `${bannerForPosition.widthPosition}%` }}>
              <a className={styles.bannerUrl} href={bannerForPosition.banner.url}>
                <img className={styles.bannerImage} src={isMobile ? bannerForPosition.banner.imageMobile : bannerForPosition.banner.image} alt={bannerForPosition.banner.alt} />
              </a>
            </div>
          )
        }

        return (
          <div
            key={product.cacheId}
            style={style}
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
      })}
    </>
  )
}

export default memo(GalleryLayoutRow)