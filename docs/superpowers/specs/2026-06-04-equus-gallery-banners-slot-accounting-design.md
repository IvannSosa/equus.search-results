# Equus Gallery Banners — Intercalar sin reemplazar productos

**Fecha:** 2026-06-04
**Cliente:** Equus (equusio)
**Componente:** `equusio.search-result` (v3.139.19)
**Asana:** [1215424994462292 — Las imágenes especiales reemplazan productos en la grilla](https://app.asana.com/1/66032875349265/project/1202543984602257/task/1215424994462292)
**Referencia (contingencia):** Arredo resolvió un caso relacionado con slot-accounting en `arredo.search-result` — ver `arredo/arredo.search-result/docs/superpowers/specs/2026-04-15-arredo-gallery-banners-slot-accounting-design.md`
**Tipo:** Bug fix

---

## 1. Contexto y problema

En las PLP de categoría regulares de Equus (`/categorias/remeras`, `/categorias/jeans`) se configuran banners promocionales ("banner en sábana") que se insertan dentro de la grilla de productos vía el bloque `search-result-banners` (provider `GalleryBanners`, handle DOM `equusio_search-result-3-x-bannerItem`).

**Bug actual:** en `equus.search-result/react/components/GalleryLayoutRow.tsx:113-121`, cuando un producto cae en la `globalPosition` de un banner, el componente hace `return <banner>` **en lugar** de renderizar el producto. Es decir, el banner **reemplaza** al producto en esa posición y ese producto se descarta del render. Con 3 banners activos en `/categorias/remeras`, se muestran 36 de 39 productos (39 − 3).

### Aclaración sobre el diagnóstico del ticket

El refinamiento técnico del ticket de Asana apunta a la landing custom `/sabana-especial` (componente `SabanaGallery.tsx`, colección 402) como causa raíz. **Ese diagnóstico está desactualizado:** las PLP de categoría regulares NO usan `SabanaGallery` — usan el flujo estándar `Gallery → GalleryLayout → GalleryLayoutRow` de `equusio.search-result`. La landing `/sabana-especial` queda **fuera de scope**.

## 2. Objetivo

Que los banners se **intercalen como celdas adicionales sin desplazar ni descartar productos**: todos los productos que devuelve el search se renderizan, y cada banner se inserta **antes** del producto en su `position`. El conteo de productos visibles no se ve afectado por la cantidad de banners.

Este es exactamente el comportamiento que pide el ticket. La grilla es un contenedor flex-wrap continuo (`#gallery-layout-container`, clases `flex flex-row flex-wrap`), así que insertar una celda extra fluye naturalmente sin romper el layout.

### Criterios de aceptación (del ticket)

1. Con sábana activa en `/categorias/remeras` se muestran los 39 productos que reporta la URL, sin importar cuántas imágenes haya.
2. Con sábana activa en `/categorias/jeans` la cantidad mostrada = total reportado por la URL.
3. Las imágenes se intercalan visualmente entre productos sin ocupar slots del **conteo de productos**.
4. Con sábana desactivada (sin banners), comportamiento idéntico al actual — sin regresión.
5. Aplica a desktop y mobile.

## 3. Enfoque elegido: aditivo (insertar, nunca reemplazar)

Se corrige el render de `GalleryLayoutRow` para que el banner se **inserte** como celda adicional y el producto **siempre** se renderice. No se toca la paginación, el slicing de productos, ni el conteo de páginas: como ningún producto se descarta, no hace falta compensar slots.

Diferencia clave con el bug: hoy `products.map(...)` devuelve banner **o** producto (descarta el producto). El fix acumula `[banner?, producto]` por cada posición — el producto nunca se pierde. Es el mismo principio que aplicó Arredo en su `GalleryLayoutRow` ("Always render the product, banners insert, never replace"), pero **sin** su capa de slot-accounting (que Equus no necesita para cumplir el ticket).

### Contingencia (NO se implementa por defecto)

La solución completa de slot-accounting de Arredo (helper `bannerSlots.ts` + shift de paginación en `GalleryLayout` / `SearchQuery` / `useFetchMore` / `SearchFooter`) **solo se aplica si** la validación manual en categorías de más de `maxItemsPerPage` (40) productos muestra que el aditivo rompe visualmente la grilla o desincroniza el conteo de páginas. Mientras el aditivo cumpla los criterios de aceptación, queda como está. El provider `search-result-banners` envuelve toda la página de búsqueda vía `around` (theme `interfaces.json`: `store.search.custom#category` y variantes), por lo que esa contingencia es viable sin cambios de wiring si llegara a hacer falta.

## 4. Arquitectura del cambio

### 4.1 Helper puro: `react/utils/interleaveBanners.ts` (NUEVO)

Para que la lógica de intercalado sea testeable sin mockear los hooks de React, se extrae a una función pura:

```ts
export interface ResolvedBanner {
  banner: { image: string; imageMobile?: string; url: string; alt: string }
  position: number
  widthPercent: number
}

export type RowItem =
  | { kind: 'banner'; banner: ResolvedBanner['banner']; widthPercent: number; key: string }
  | { kind: 'product'; product: Product; position: number }

/**
 * Construye la lista ordenada de celdas de una fila. Por cada producto, si hay
 * un banner cuya globalPosition coincide, se inserta ANTES del producto. Los
 * productos nunca se descartan: output.filter(i => i.kind === 'product').length
 * === products.length.
 */
export function buildRowItems(args: {
  products: Product[]
  banners: ResolvedBanner[]   // ya resueltos (position absoluta + widthPercent)
  rowIndex: number
  itemsPerRow: number
  page: number
  maxItems: number
}): RowItem[]
```

La fórmula de `globalPosition` se preserva idéntica a la actual: `(page - 1) * maxItems + (rowIndex * itemsPerRow + index + 1)`.

### 4.2 `GalleryLayoutRow.tsx` — consumir el helper

Anchor: `equus.search-result/react/components/GalleryLayoutRow.tsx:103-148`.

- Se mantiene el cómputo de `finalBanners` (reduce con `repeatBanner` y `widthPosition` → %), `style`, `useRenderOnView`, etc.
- El `products.map(...)` que hace `return <banner>` (descartando el producto) se reemplaza por: `buildRowItems(...)` → `.map()` que renderiza cada `RowItem` (banner como `styles.bannerItem`, producto como `GalleryItem`). El producto siempre se renderiza.

No se tocan: `GalleryLayout.tsx`, `SearchQuery.js`, `useFetchMore.js`, `SearchFooter.js`, `GalleryBanners.tsx`, `manifest.json`, theme, ni Site Editor.

## 5. Casos borde

1. **Sin banners** — `buildRowItems` devuelve solo productos; render idéntico al baseline (sin regresión).
2. **`repeatBanner: true`** — la expansión vive en `finalBanners` (sin cambios); el helper solo intercala por `position`.
3. **Mobile vs desktop** — `finalBanners` ya selecciona `positionMobile`/`widthPositionMobile`; el helper es agnóstico.
4. **Dos banners para la misma posición** — se insertan ambos antes del producto (orden estable).
5. **Banner en `position` mayor a la cantidad de productos** — no matchea ningún producto; no se renderiza (igual que hoy).
6. **Multi-página (show-more)** — los productos siguen sin descartarse; el comportamiento de posicionamiento por `globalPosition` se preserva. Validar visualmente (ver §6 contingencia).

## 6. Plan de testing

### Automatizado

`react/__tests__/interleaveBanners.test.ts` — tests puros de `buildRowItems`:
- Sin banners → solo productos, mismo orden.
- Banner en posición media → `[..., banner, producto, ...]`, banner antes del producto.
- **Regresión clave:** con N banners, la cantidad de items `kind === 'product'` en el output es igual a `products.length` (ningún producto se pierde).
- Banner en posición fuera de rango → no aparece.
- Cálculo de `globalPosition` correcto en página > 1 y `rowIndex` > 0.

### Manual (QA staging)

Rutas: `/categorias/remeras` (39 productos), `/categorias/jeans`.

1. Desktop, sábana activa con N banners → se muestran 39/39 productos + banners intercalados.
2. Desktop, sin banners → grilla idéntica al baseline (sin regresión).
3. Mobile, sábana activa → 39/39, banners con su ancho mobile.
4. `widthPosition` 1/2/3/4 → ancho correcto, sin pérdida de productos.
5. **Contingencia:** categoría con >40 productos + banners → si la grilla se ve rota o el conteo de páginas se desincroniza, escalar a la solución de slot-accounting de Arredo (§3 contingencia). Si se ve bien, no se hace nada más.

## 7. Riesgos

- **Multi-página a escala** — el aditivo puede dejar filas con celdas extra en categorías grandes. Mitigación: validación manual + contingencia documentada (port de Arredo).
- **Tests existentes del search-result** — correr la suite completa tras el cambio.

## 8. Fuera de scope

- La landing `/sabana-especial` / `SabanaGallery`.
- Slot-accounting / shift de paginación (solo si la contingencia lo exige).
- Refactor general de `equusio.search-result`.
- Soporte multi-cliente.
