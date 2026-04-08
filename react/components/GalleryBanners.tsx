import React, { createContext, useContext, useMemo } from 'react'
import { useRuntime } from 'vtex.render-runtime'

interface BannerProps {
    matchId?: string
    layoutId?: string
    image: string
    url: string
    alt: string
    position?: number
    positionMobile?: number
    widthPosition?: string
    widthPositionMobile?: string
    repeatBanner?: boolean
    repeatBannerMobile?: boolean
}

interface BannersContextProps {
    banners: BannerProps[]
    bannerVistaSecundaria?: BannerProps[]
    layoutNamesForSecondaryView?: string
    children: React.ReactNode
}

interface BannersContextValue {
    banners: BannerProps[]
    bannerVistaSecundaria: BannerProps[]
    layoutNamesForSecondaryView: string
}

const BannersContext = createContext<BannersContextValue | undefined>(undefined)

export const useBanners = () => {
  const context = useContext(BannersContext)
  return context || { banners: [], bannerVistaSecundaria: [], layoutNamesForSecondaryView: '' }
}

const matchesCurrentPage = (matchId: string, pathname: string): boolean => {
  const normalizedMatch = matchId.replace(/^\/|\/$/g, '').toLowerCase()
  const normalizedPath = pathname.replace(/^\/|\/$/g, '').toLowerCase()

  // Exact path match: /sabana-especial
  if (normalizedPath === normalizedMatch) return true

  // Partial match: path contains the matchId segment
  if (normalizedPath.includes(normalizedMatch)) return true

  return false
}

const filterBannersByPage = (bannerList: BannerProps[], pathname: string): BannerProps[] => {
  return bannerList.filter((banner) => {
    // No matchId = show everywhere
    if (!banner.matchId || banner.matchId.trim() === '') return true
    return matchesCurrentPage(banner.matchId, pathname)
  })
}

const GalleryBanners = ({
    banners,
    bannerVistaSecundaria,
    layoutNamesForSecondaryView,
    children,
}: BannersContextProps) => {
  const runtime = useRuntime() as any
  const pathname: string = runtime?.route?.path || runtime?.route?.canonicalPath || runtime?.page || ''

  const filteredBanners = useMemo(
    () => filterBannersByPage(banners || [], pathname),
    [banners, pathname]
  )

  const filteredSecundaria = useMemo(
    () => filterBannersByPage(bannerVistaSecundaria || [], pathname),
    [bannerVistaSecundaria, pathname]
  )

  return (
    <BannersContext.Provider value={{
      banners: filteredBanners,
      bannerVistaSecundaria: filteredSecundaria,
      layoutNamesForSecondaryView: layoutNamesForSecondaryView || ''
    }}>
      {children}
    </BannersContext.Provider>
  )
}

GalleryBanners.schema = {
    title: "Gallery Banners",
    type: "object",
    properties: {
        banners: {
          type: "array",
          items: {
            type: "object",
            properties: {
              "matchId": {
                title: 'Categoría / Colección / Path',
                type: 'string',
                description: 'ID de categoría, colección, path (/sabanas), o ruta de facets (dormitorio/sabanas). Vacío = se muestra en todas las PLPs.',
              },
              "layoutId": {
                title: 'Layout de galería',
                type: 'string',
                description: 'Nombre del layout donde mostrar este banner (ej: grid, list). Vacío = se muestra en todos los layouts.',
              },
              "image": {
                title: 'Banner a mostrar',
                type: 'string',
                widget: {
                  'ui:widget': 'image-uploader',
                },
              },
              "imageMobile": {
                title: 'Banner a mostrar (Mobile)',
                type: 'string',
                widget: {
                  'ui:widget': 'image-uploader',
                },
              },
              "url": {
                title: 'URL de redirección',
                type: 'string',
              },
              "alt": {
                title: 'Texto alternativo del banner',
                type: 'string',
              },
              position: {
                title: 'Posición del banner',
                type: 'number',
                description: 'Posición del banner en la fila',
              },
              positionMobile: {
                title: 'Posición del banner (Mobile)',
                type: 'number',
                description: 'Posición del banner en mobile (opcional)',
              },
              widthPosition: {
                title: 'Tamaño que ocupa el banner',
                type: 'string',
                enum: ["1", "2", "3", "4"],
                enumNames: ["1", "2", "3", "4"],
                default: "1",
                description: 'Tamaño que ocupa el banner en la fila',
              },
              widthPositionMobile: {
                title: 'Tamaño que ocupa el banner (Mobile)',
                type: 'string',
                enum: ["1", "2"],
                enumNames: ["1", "2"],
                default: "1",
                description: 'Tamaño que ocupa el banner en mobile (máximo 2 columnas)',
              },
              repeatBanner:{
                title: 'Repetir el banner',
                type: 'boolean',
                default: false,
              }
            },
          },
        },
        bannerVistaSecundaria: {
          type: "array",
          title: 'Banners para vista Secundaria',
          items: {
            type: "object",
            properties: {
              image: {
                title: 'Banner a mostrar',
                type: 'string',
                description: 'Banner a mostrar para vista Secundaria',
                widget: {
                  'ui:widget': 'image-uploader',
                },
              },
              imageMobile: {
                title: 'Banner a mostrar (Mobile)',
                description: 'Banner a mostrar para vista Secundaria (mobile)',
                type: 'string',
                widget: {
                  'ui:widget': 'image-uploader',
                },
              },
              url: {
                title: 'URL de redirección',
                type: 'string',
              },
              alt: {
                title: 'Texto alternativo del banner',
                type: 'string',
              },
              position: {
                title: 'Posición del banner',
                description: 'Posición del banner para vista Secundaria',
                type: 'number'
              },
              positionMobile: {
                title: 'Posición del banner (Mobile)',
                description: 'Posición del banner para vista Secundaria',
                type: 'number',
              },
              widthPosition: {
                title: 'Tamaño que ocupa el banner',
                type: 'string',
                enum: ["1", "2", "3", "4", "5"],
                enumNames: ["1", "2", "3", "4", "5"],
                default: "1",
                description: 'Tamaño que ocupa el banner en la fila para vista secundaria',
              },
              widthPositionMobile: {
                title: 'Tamaño que ocupa el banner (Mobile)',
                type: 'string',
                enum: ["1", "2", "3"],
                enumNames: ["1", "2", "3"],
                default: "1",
                description: 'Tamaño que ocupa el banner en mobile para vista secundaria (máximo 3 columnas)',
              },
              repeatBanner: {
                title: 'Repetir el banner',
                type: 'boolean',
                default: false,
              }
            },
          },
        },
    },
}

export default GalleryBanners;
