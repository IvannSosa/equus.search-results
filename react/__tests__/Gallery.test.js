/* eslint-disable jest/no-mocks-import */
/* eslint-env jest */
import React, { Fragment } from 'react'
import { render } from '@vtex/test-tools/react'
import { useDevice } from 'vtex.device-detector'
import { products, summary } from 'GalleryMocks'
import axios from 'axios'

import Gallery from '../Gallery'
import { ProductList as ProductListStructuredData } from '../__mocks__/vtex.structured-data'
import { useRuntime } from '../__mocks__/vtex.render-runtime'
import { SearchPageContext } from '../__mocks__/vtex.search-page-context'

// Mock axios
jest.mock('axios')
const mockedAxios = axios

const { useSearchPageState } = SearchPageContext

const mockUseRuntime = useRuntime
const mockUseSearchPageState = useSearchPageState

beforeEach(() => {
  jest.clearAllMocks()

  mockUseRuntime.mockImplementation(() => ({
    route: { routeId: 'routeId' },
    getSettings: () => ({}),
  }))

  mockUseSearchPageState.mockImplementation(() => ({}))

  useDevice.mockImplementation(() => ({
    isMobile: false,
  }))
})

describe('<Gallery />', () => {
  const renderComponent = customProps => {
    const props = {
      products,
      summary,
      ...customProps,
    }


    console.log('props', products)
    return render(
      <Fragment>
        <ProductListStructuredData products={products} />
        <Gallery {...props} />
      </Fragment>
    )
  }

  it('should match snapshot', () => {
    const { asFragment } = renderComponent()

    expect(asFragment()).toMatchSnapshot()
  })

  it('should reorder products based on scoring from API when category changes', async () => {
    // Mock de la respuesta de la API
    const mockOrderData = [
      {
        category: "mujer/verano",
        orderGallery: [
          { productId: "5520", scoring: 1 },
          { productId: "5523", scoring: 3 },
          { productId: "5522", scoring: 4 },
          { productId: "5582", scoring: 2 }
        ]
      }
    ]

    mockedAxios.get.mockResolvedValueOnce({ data: mockOrderData })

    // Mock del contexto de búsqueda con query
    mockUseSearchPageState.mockImplementation(() => ({
      searchQuery: {
        variables: {
          query: ['mujer/verano']
        }
      }
    }))

    const { asFragment } = renderComponent()

    // Esperar a que se resuelva la promesa de axios
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(asFragment()).toMatchSnapshot()
    expect(mockedAxios.get).toHaveBeenCalledWith('/api/dataentities/OG/search?category=mujer/verano&_fields=category,orderGallery')
  })

  it('should not call API again when products change but category remains the same', async () => {
    // Mock de la respuesta de la API
    const mockOrderData = [
      {
        category: "mujer/verano",
        orderGallery: [
          { productId: "5520", scoring: 1 },
          { productId: "5523", scoring: 3 }
        ]
      }
    ]

    mockedAxios.get.mockResolvedValueOnce({ data: mockOrderData })

    // Mock del contexto de búsqueda con query
    mockUseSearchPageState.mockImplementation(() => ({
      searchQuery: {
        variables: {
          query: ['mujer/verano']
        }
      }
    }))

    const { asFragment, rerender } = renderComponent()

    // Esperar a que se resuelva la primera promesa de axios
    await new Promise(resolve => setTimeout(resolve, 0))

    // Verificar que se llamó la API una vez
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)

    // Re-renderizar con los mismos productos (simulando cambio de productos pero misma categoría)
    rerender(
      <Fragment>
        <ProductListStructuredData products={products} />
        <Gallery {...{ products, summary }} />
      </Fragment>
    )

    // Esperar un poco más
    await new Promise(resolve => setTimeout(resolve, 0))

    // Verificar que la API NO se llamó de nuevo
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)
  })

  it('should omit custom ordering when runtimeQuery has existing order', async () => {
    // Mock del contexto de búsqueda con query
    mockUseSearchPageState.mockImplementation(() => ({
      searchQuery: {
        variables: {
          query: ['mujer/verano']
        }
      }
    }))

    // Mock de useRuntime con orden existente
    mockUseRuntime.mockImplementation(() => ({
      route: { routeId: 'routeId' },
      query: { order: 'OrderByPriceASC' } // Orden existente
    }))

    const { asFragment } = renderComponent()

    // Esperar un poco
    await new Promise(resolve => setTimeout(resolve, 0))

    // Verificar que la API NO se llamó porque ya hay un orden existente
    expect(mockedAxios.get).not.toHaveBeenCalled()
    expect(asFragment()).toMatchSnapshot()
  })

  it('should use custom ordering when runtimeQuery has no order', async () => {
    // Mock de la respuesta de la API
    const mockOrderData = [
      {
        category: "mujer/verano",
        orderGallery: [
          { productId: "5520", scoring: 1 },
          { productId: "5523", scoring: 3 }
        ]
      }
    ]

    mockedAxios.get.mockResolvedValueOnce({ data: mockOrderData })

    // Mock del contexto de búsqueda con query
    mockUseSearchPageState.mockImplementation(() => ({
      searchQuery: {
        variables: {
          query: ['mujer/verano']
        }
      }
    }))

    // Mock de useRuntime SIN orden existente
    mockUseRuntime.mockImplementation(() => ({
      route: { routeId: 'routeId' },
      query: {} // Sin orden existente
    }))

    const { asFragment } = renderComponent()

    // Esperar a que se resuelva la promesa de axios
    await new Promise(resolve => setTimeout(resolve, 0))

    // Verificar que la API SÍ se llamó porque no hay orden existente
    expect(mockedAxios.get).toHaveBeenCalledWith('/api/dataentities/OG/search?category=mujer/verano&_fields=category,orderGallery')
    expect(asFragment()).toMatchSnapshot()
  })

  it('should handle API error gracefully', async () => {
    // Mock de error en la API
    mockedAxios.get.mockRejectedValueOnce(new Error('API Error'))

    // Mock del contexto de búsqueda con query
    mockUseSearchPageState.mockImplementation(() => ({
      searchQuery: {
        variables: {
          query: ['mujer/verano']
        }
      }
    }))

    const { asFragment } = renderComponent()

    // Esperar a que se resuelva la promesa de axios
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(asFragment()).toMatchSnapshot()
    expect(mockedAxios.get).toHaveBeenCalledWith('/api/dataentities/OG/search?category=mujer/verano&_fields=category,orderGallery')
  })
})
