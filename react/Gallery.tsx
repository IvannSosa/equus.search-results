import React, { Fragment, useEffect, useState, useMemo } from 'react'
import { ProductList as ProductListStructuredData } from 'vtex.structured-data'
import { useRuntime } from 'vtex.render-runtime'
import GalleryLayout from './GalleryLayout'
import type { GalleryLayoutProps, Slots } from './GalleryLayout'
import type { GalleryProps as GalleryLegacyProps } from './GalleryLegacy'
import GalleryLegacy from './GalleryLegacy'
import { useSearchPage } from 'vtex.search-page-context/SearchPageContext'
import { pathOr } from 'ramda'
import axios from 'axios'
// Interfaces para el orden de la galería
interface OrderGalleryItem {
  productId: string
  scoring: number
}

/*
 * This type receives Slots directly, instead of using the 'slots' prop to do it.
 * Is the equivalent of adding '[key: string]: ComponentType' at the end of GalleryLayoutProps
 * and removing the 'slots' prop.
 */
type GalleryLayoutPropsWithSlots = Omit<GalleryLayoutProps, 'slots'> & Slots

const Gallery: React.FC<
  GalleryLegacyProps | GalleryLayoutPropsWithSlots
> = props => {
  const {
    route: { routeId },
    query: runtimeQuery
  } = useRuntime()
  const { searchQuery } = useSearchPage()
  const [orderGallery, setOrderGallery] = useState<OrderGalleryItem[]>([])
  const query = pathOr("", ['query'], searchQuery?.variables) as string;
  const hasExistingOrder = runtimeQuery?.order && runtimeQuery.order !== ''

  if ('layouts' in props && props.layouts.length > 0) {
    const {
      layouts,
      lazyItemsRemaining,
      products,
      showingFacets,
      summary,
      preferredSKU,
      ...slots
    } = props as GalleryLayoutPropsWithSlots

    // Función para reordenar productos basado en el scoring
    const reorderProductsByScoring = (products: Product[], orderData: OrderGalleryItem[]): Product[] => {
      if (!orderData.length || !products.length) return products

      // Crear un mapa de scoring por productId
      const scoringMap = new Map<string, number>()
      orderData.forEach(item => {
        scoringMap.set(item.productId, item.scoring)
      })

      // Separar productos con scoring y sin scoring
      const productsWithScoring: Array<{ product: Product; scoring: number }> = []
      const productsWithoutScoring: Product[] = []

      products.forEach(product => {
        const scoring = scoringMap.get(product.productId)
        if (scoring !== undefined) {
          productsWithScoring.push({ product, scoring })
        } else {
          productsWithoutScoring.push(product)
        }
      })

      // Ordenar productos con scoring (menor scoring = mayor prioridad)
      productsWithScoring.sort((a, b) => a.scoring - b.scoring)

      // Combinar: productos ordenados por scoring + productos sin scoring al final
      return [
        ...productsWithScoring.map(item => item.product),
        ...productsWithoutScoring
      ]
    }

    // Memoizar productos reordenados - solo si no hay orden existente
    const reorderedProducts = useMemo(() => {
      // Si ya existe un orden en runtimeQuery, usar productos originales
      if (hasExistingOrder) return products

      // Si no hay orden existente, aplicar nuestro ordenamiento personalizado
      return reorderProductsByScoring(products, orderGallery)
    }, [products, orderGallery, hasExistingOrder])

    useEffect(() => {
      if (!props?.orderByCSV) return
      const loadOrderGallery = async () => {
        try {
          const {data} = await axios.get(`/api/dataentities/OG/search?category=${query}&_fields=category,orderGallery`)
          if(data?.length && data?.[0]?.orderGallery?.length){
            setOrderGallery(data[0].orderGallery)
          } else{
            console.warn('No se encuentra ordenamiento personalizado para:', query)
            setOrderGallery([])
          }
        } catch (error) {
          console.error('Error al cargar ordenamiento personalizado:', error)
          setOrderGallery([])
        }
      }
      loadOrderGallery()
    }, [query, props?.orderByCSV])

    return (
      <Fragment>
        {!routeId.includes('store.search') && (
          <ProductListStructuredData products={reorderedProducts} />
        )}
        <GalleryLayout
          layouts={layouts}
          lazyItemsRemaining={lazyItemsRemaining}
          products={reorderedProducts}
          showingFacets={showingFacets}
          summary={summary}
          slots={slots}
          preferredSKU={preferredSKU}
        />
      </Fragment>
    )
  }

  return <GalleryLegacy {...(props as GalleryLegacyProps)} />
}

export interface Product {
  /** Product's id. */
  productId: string
  /** Product's cache id. */
  cacheId: string
  /** Product's name. */
  productName: string
  /** Product's description. */
  description: string
  /** Product's categories. */
  categories: unknown[]
  /** Product's link. */
  link?: string
  /** Product's link text. */
  linkText: string
  /** Product's brand. */
  brand?: string
  /** Product's SKU items. */
  items: ProductItem[]
}

interface ProductItemReference {
  Value: string
}

interface ProductItemImage {
  /** Images's imageUrl. */
  imageUrl: string
  /** Images's imageTag. */
  imageTag: string
}

interface ProductItemSeller {
  /** Sellers's commertialOffer. */
  commertialOffer: {
    /** CommertialOffer's price. */
    Price: number
    /** CommertialOffer's list price. */
    ListPrice: number
  }
}

interface ProductItem {
  /** SKU's id. */
  itemId: string
  /** SKU's name. */
  name: string
  /** SKU's referenceId. */
  referenceId?: ProductItemReference[]
  /** SKU's images. */
  images: ProductItemImage[]
  /** SKU's sellers. */
  sellers: ProductItemSeller[]
}

export default Gallery
