import React, { createContext, useContext } from 'react'

interface BannerProps {
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
    children: React.ReactNode
}

const BannersContext = createContext<BannerProps[] | undefined>(undefined)

export const useBanners = () => {
  const context = useContext(BannersContext)
  return context || []
}

const GalleryBanners = ({
    banners,
    children,
}: BannersContextProps) => {
  return (
    <BannersContext.Provider value={banners}>
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
  },
}

export default GalleryBanners;
