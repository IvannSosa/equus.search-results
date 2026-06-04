/**
 * Interleave gallery banners into a product row WITHOUT dropping products.
 *
 * The legacy GalleryLayoutRow rendered a banner INSTEAD of the product whose
 * global position matched the banner, silently dropping that product. This
 * helper instead inserts each matching banner BEFORE the product and always
 * emits the product, so no product is ever lost.
 */
import type { Product } from '../Gallery'

export interface ResolvedBanner {
  /** Banner payload (image/url/alt) as configured in search-result-banners. */
  banner: {
    image: string
    imageMobile?: string
    url: string
    alt: string
  }
  /** Absolute 1-based global position the banner targets. */
  position: number
  /** Width as a percentage of the row (already computed by the caller). */
  widthPosition: number
}

export type RowItem =
  | {
      kind: 'banner'
      banner: ResolvedBanner['banner']
      widthPosition: number
      key: string
    }
  | {
      kind: 'product'
      product: Product
      position: number
    }

/**
 * Build the ordered list of cells for one product row. For each product at
 * index `i`, any banner whose globalPosition equals that product's global
 * position is inserted BEFORE the product; the product is always appended.
 *
 * globalPosition mirrors the legacy formula exactly:
 *   (page - 1) * maxItems + (rowIndex * itemsPerRow + i + 1)
 */
export function buildRowItems(args: {
  products: Product[]
  banners: ResolvedBanner[]
  rowIndex: number
  itemsPerRow: number
  page: number
  maxItems: number
}): RowItem[] {
  const { products, banners, rowIndex, itemsPerRow, page, maxItems } = args
  const items: RowItem[] = []

  products.forEach((product, index) => {
    const absoluteProductIndex = rowIndex * itemsPerRow + index + 1
    const globalPosition = (page - 1) * maxItems + absoluteProductIndex

    const matching = banners.filter(b => b.position === globalPosition)
    matching.forEach((b, bIndex) => {
      items.push({
        kind: 'banner',
        banner: b.banner,
        widthPosition: b.widthPosition,
        key: `banner-${globalPosition}-${bIndex}`,
      })
    })

    items.push({ kind: 'product', product, position: absoluteProductIndex })
  })

  return items
}
