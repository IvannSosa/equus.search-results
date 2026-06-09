/* eslint-env jest */
import { buildRowItems, ResolvedBanner } from '../utils/interleaveBanners'

// Minimal product stubs — buildRowItems only reads cacheId/identity.
const makeProducts = (n: number, offset = 0) =>
  Array.from({ length: n }, (_, i) => ({
    cacheId: `p${offset + i + 1}`,
    productId: `${offset + i + 1}`,
  })) as any[]

const banner = (position: number, widthPosition = 25): ResolvedBanner => ({
  banner: { image: 'img.jpg', url: '/x', alt: 'x' },
  position,
  widthPosition,
})

const productCount = (items: ReturnType<typeof buildRowItems>) =>
  items.filter(i => i.kind === 'product').length

describe('buildRowItems', () => {
  it('returns only products (same order) when there are no banners', () => {
    const products = makeProducts(4)
    const items = buildRowItems({
      products,
      banners: [],
      rowIndex: 0,
      itemsPerRow: 4,
      page: 1,
      maxItems: 40,
    })
    expect(items.map(i => (i.kind === 'product' ? i.product.cacheId : 'B'))).toEqual([
      'p1',
      'p2',
      'p3',
      'p4',
    ])
  })

  it('inserts a banner BEFORE the product at the matching global position', () => {
    const products = makeProducts(4)
    // page 1, rowIndex 0, itemsPerRow 4 → product positions are 1,2,3,4.
    const items = buildRowItems({
      products,
      banners: [banner(3)],
      rowIndex: 0,
      itemsPerRow: 4,
      page: 1,
      maxItems: 40,
    })
    expect(items.map(i => (i.kind === 'product' ? i.product.cacheId : 'B'))).toEqual([
      'p1',
      'p2',
      'B',
      'p3',
      'p4',
    ])
  })

  it('REGRESSION: never drops a product — product count equals input length', () => {
    const products = makeProducts(4)
    const items = buildRowItems({
      products,
      banners: [banner(1), banner(2), banner(4)],
      rowIndex: 0,
      itemsPerRow: 4,
      page: 1,
      maxItems: 40,
    })
    expect(productCount(items)).toBe(4)
  })

  it('inserts two banners targeting the same position, both before the product', () => {
    const products = makeProducts(2)
    const items = buildRowItems({
      products,
      banners: [banner(2, 25), banner(2, 50)],
      rowIndex: 0,
      itemsPerRow: 4,
      page: 1,
      maxItems: 40,
    })
    expect(items.map(i => (i.kind === 'product' ? i.product.cacheId : 'B'))).toEqual([
      'p1',
      'B',
      'B',
      'p2',
    ])
    expect(productCount(items)).toBe(2)
  })

  it('ignores banners whose position does not match any product in the row', () => {
    const products = makeProducts(4)
    const items = buildRowItems({
      products,
      banners: [banner(99)],
      rowIndex: 0,
      itemsPerRow: 4,
      page: 1,
      maxItems: 40,
    })
    expect(productCount(items)).toBe(4)
    expect(items.some(i => i.kind === 'banner')).toBe(false)
  })

  it('computes globalPosition with rowIndex and page offset', () => {
    // page 2, maxItems 40, rowIndex 1, itemsPerRow 4:
    // product 0 global position = (2-1)*40 + (1*4 + 0 + 1) = 40 + 5 = 45
    const products = makeProducts(4, 44)
    const items = buildRowItems({
      products,
      banners: [banner(45)],
      rowIndex: 1,
      itemsPerRow: 4,
      page: 2,
      maxItems: 40,
    })
    // banner should sit before the first product of this row (p45)
    expect(items[0].kind).toBe('banner')
    expect(items[1].kind === 'product' && items[1].product.cacheId).toBe('p45')
    expect(productCount(items)).toBe(4)
  })

  it('returns an empty array when there are no products', () => {
    const items = buildRowItems({
      products: [],
      banners: [banner(1)],
      rowIndex: 0,
      itemsPerRow: 4,
      page: 1,
      maxItems: 40,
    })
    expect(items).toEqual([])
  })

  it('sets product.position to the 1-based row-local index', () => {
    // page 2, rowIndex 1, itemsPerRow 4 → first product absoluteProductIndex = 1*4 + 0 + 1 = 5
    const products = makeProducts(2, 44)
    const items = buildRowItems({
      products,
      banners: [],
      rowIndex: 1,
      itemsPerRow: 4,
      page: 2,
      maxItems: 40,
    })
    const productItems = items.filter(i => i.kind === 'product')
    expect(productItems.map(i => (i.kind === 'product' ? i.position : null))).toEqual([5, 6])
  })
})
