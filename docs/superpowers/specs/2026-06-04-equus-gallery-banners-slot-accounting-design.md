# Equus Gallery Banners — Slot Accounting & Pagination Shift

**Fecha:** 2026-06-04
**Cliente:** Equus (equusio)
**Componente:** `equusio.search-result` (v3.139.19)
**Asana:** [1215424994462292 — Las imágenes especiales reemplazan productos en la grilla](https://app.asana.com/1/66032875349265/project/1202543984602257/task/1215424994462292)
**Referencia:** Arredo ya resolvió el mismo bug en `arredo.search-result` — ver `arredo/arredo.search-result/docs/superpowers/specs/2026-04-15-arredo-gallery-banners-slot-accounting-design.md`
**Tipo:** Bug fix

---

## 1. Contexto y problema

En las PLP de categoría regulares de Equus (`/categorias/remeras`, `/categorias/jeans`) se pueden configurar banners promocionales ("banner en sábana") que se insertan dentro de la grilla de productos vía el bloque `search-result-banners` (provider `GalleryBanners`, handle DOM `equusio_search-result-3-x-bannerItem`).

**Bug actual:** en `equus.search-result/react/components/GalleryLayoutRow.tsx:113-121`, cuando un producto cae en la `globalPosition` de un banner, el componente hace `return <banner>` **en lugar** de renderizar el producto. Es decir, el banner **reemplaza** al producto en esa posición y ese producto se descarta del render. Con 3 banners activos en `/categorias/remeras`, se muestran 36 de 39 productos (39 − 3).

Además, el componente **no descuenta** los slots de banner de la paginación: no hay nada que compense el conteo, así que en categorías de más de `maxItemsPerPage` (40) productos la grilla también se desordena y el total de páginas queda desfasado — el mismo problema que Arredo sufrió antes de su fix.

### Aclaración sobre el diagnóstico del ticket

El refinamiento técnico del ticket de Asana apunta a la landing custom `/sabana-especial` (componente `SabanaGallery.tsx`, colección 402, prop `GridSummary: product-summary.shelf#image-only`) como causa raíz. **Ese diagnóstico está desactualizado:** fue redactado asumiendo que el componente no existía en el código. El bug reportado está en las **PLP de categoría regulares**, que NO usan `SabanaGallery` — usan el flujo estándar `Gallery → GalleryLayout → GalleryLayoutRow` de `equusio.search-result`. La landing `/sabana-especial` queda **fuera de scope**.

## 2. Objetivo

Cada página de la PLP debe contener **exactamente `maxItemsPerPage` slots** ocupados entre productos y banners, **sin perder ningún producto**. Los productos desplazados por los banners aparecen en la página siguiente (vía `pagination: show-more`, configurada en el theme). El banner se **inserta** como celda adicional, nunca reemplaza un producto.

### Criterios de aceptación (del ticket)

1. Con sábana activa en `/categorias/remeras` se muestran los 39 productos que reporta la URL, sin importar cuántas imágenes haya.
2. Con sábana activa en `/categorias/jeans` la cantidad mostrada = total reportado por la URL.
3. Las imágenes se intercalan visualmente entre productos sin ocupar slots del **conteo de productos**.
4. Con sábana desactivada (sin banners), comportamiento idéntico al actual — sin regresión.
5. Aplica a desktop y mobile.

## 3. Regla

Para una página `N` dada:

```
productos_visibles(N) + Σ widthPosition(banners_de_pagina_N) = maxItemsPerPage
```

Donde `banners_de_pagina_N` = banners cuyo `position` cae en el rango global `[from(N)+1, from(N)+maxItemsPerPage]`, considerando `repeatBanner`, `matchId` y el device actual.

La paginación del search query se recalcula para que:

```
from(N) = Σ productos_visibles(k)  para k en [1..N-1]
to(N)   = from(N) + productos_visibles(N) - 1
```

## 4. Arquitectura

Se porta la solución de Arredo. El corazón es un **helper puro** sin dependencias de React, testeado de forma exhaustiva antes de tocar el fetch. Los puntos de integración se adaptan a la versión "lean" del fork de Equus (que NO tiene `FilterToggleContext`, animaciones fade/stagger ni `selectMatchingSku` — esos cambios de Arredo NO se portan).

### 4.1 Helper puro: `react/utils/bannerSlots.ts` (NUEVO — copia 1:1 de Arredo)

Único punto de verdad del cálculo. API pública:

- `normalizePath(raw)` — normaliza un path (lowercase, sin trailing slash, sin query).
- `matchesCurrentContext(matchId, ctx)` — decide si un banner aplica al contexto actual (path / categoryId / collectionId / productClusterIds / categoryPath).
- `filterApplicableBanners(banners, ctx, currentLayoutName)` — filtra por ruta + layout.
- `expandBanners(banners, isMobile, itemsPerRow, maxAbsolutePosition)` — expande `repeatBanner` en instancias `{ position, widthSlots }`, clampea `widthSlots` a `itemsPerRow`.
- `getBannerSlotsForPage({...})` → `{ bannerSlots, effectivePageSize, from, to }` — cálculo por página con shift acumulado (itera de página 1 hasta `page`).
- `getTotalBannerSlotsAcrossAllPages({...})` → total de slots de banner a lo largo de todas las páginas hasta cubrir `recordsFiltered` (para `SearchFooter`).

Tipos: `BannerConfig`, `RouteContext`, `ExpandedBanner`, `PageOffsets`. El archivo de Arredo (`arredo/arredo.search-result/react/utils/bannerSlots.ts`) se copia verbatim — es independiente de cliente.

### 4.2 `GalleryLayout.tsx` — slicing de productos visibles

Anchor actual: `equus.search-result/react/GalleryLayout.tsx:114-128` (memo `galleryRows` que slicea `products` en filas de `itemsPerRow`).

Cambios:
1. Importar `useBanners`, `useDevice`, `getBannerSlotsForPage`, `RouteContext`.
2. Dentro del componente, obtener `banners`, `isMobile`, y `{ page, params, maxItemsPerPage }` de `useSearchPage()` + `route` de `useRuntime()`.
3. Construir `RouteContext` (memo) y calcular `pageOffsets = getBannerSlotsForPage(...)` con `currentLayoutOption.name`.
4. `const visibleProducts = products.slice(0, pageOffsets.effectivePageSize)`.
5. El memo `galleryRows` se arma sobre `visibleProducts` en vez de `products`.

Nota: Equus ya importa `useRuntime` y `SearchPageContext`. NO tiene `isFetchingMore` ni `filtersVisible` (a diferencia de Arredo) — la integración es más simple; solo se agregan las dependencias nuevas.

### 4.3 `GalleryLayoutRow.tsx` — insertar en vez de reemplazar (FIX VISUAL CENTRAL)

Anchor actual: `equus.search-result/react/components/GalleryLayoutRow.tsx:103-148`.

Cambio: el `products.map(...)` que hace `return <banner>` (descartando el producto) se reescribe a un patrón de acumulación (`items: React.ReactNode[]`) que **primero inserta el banner** si hay uno para `globalPosition` y **siempre renderiza el producto a continuación** — como en `arredo.search-result/react/components/GalleryLayoutRow.tsx:162-245`. Se omiten las piezas de animación de Arredo (`gridPhase`, `baseIndex`, `staggerStyle`).

Opcionalmente (DRY): reutilizar `filterApplicableBanners` / `normalizePath` del helper para el matcheo por contexto, en lugar de la lógica inline actual. La lógica de matcheo de Equus hoy es más simple (`filterBannersByPage` en `GalleryBanners.tsx` por path); se mantiene compatible.

### 4.4 `SearchQuery.js` — offsets iniciales

Anchors: `SearchQuery.js:327-328` (`const from = (page - 1) * maxItemsPerPage; const to = from + itemsLimit - 1`) y `:437` (`from: from + INITIAL_ITEMS_LIMIT`).

Cambios:
- Consumir `useBanners()`, `useDevice()`, `route` de `useRuntime()`.
- Reemplazar el cálculo de `from`/`to` por `getBannerSlotsForPage(...).from` / `.to` (respetando `shouldLimitItems`/`itemsLimit` para la lazy query).
- El `fetchMore` de lazy items usa `from + pageOffsets.effectivePageSize - 1`.

### 4.5 `useFetchMore.js` — show-more (forward/backward)

Anchors: `useFetchMore.js:162-167` (`initialState`), `:188-191` (`handleFetchMoreNext`), `:229-236` (`handleFetchMorePrevious`).

Cambios: derivar `offsetsFor(pageNum) = getBannerSlotsForPage(...)` y usar `from`/`to` del helper en initialState, next y previous. Equus ya tiene el guard `previousPage < 1 || from <= 0` en `:230` — se mantiene.

### 4.6 `SearchFooter.js` — total de páginas

Anchor: `SearchFooter.js:64-65` (`const lastPage = Math.ceil(recordsFiltered / maxItemsPerPage)`). Es class component (`withRuntimeContext`).

Cambio: wrapper hook-friendly que calcula `getTotalBannerSlotsAcrossAllPages(...)` y lo pasa como prop `totalBannerSlots`; la clase computa `lastPage = Math.ceil((recordsFiltered + totalBannerSlots) / maxItemsPerPage)`.

## 5. Casos borde

1. **`repeatBanner: true`** — se expande antes de contar slots por página.
2. **Mobile vs desktop** — `positionMobile` / `widthPositionMobile` / `repeatBannerMobile` cuando `isMobile`. Mobile clampea a `itemsPerRow` (≤2).
3. **`widthPosition > itemsPerRow`** — clampeado dentro del helper.
4. **Filtros que cambian `recordsFiltered`** — la fórmula no depende del total.
5. **`matchId` por categoría/ruta** — respetado por el matcher.
6. **Show-more forward/backward** — `to`/`from` recalculados con `effectivePageSize`.
7. **Caso del bug (39 productos < 40 maxItemsPerPage, 1 página)** — `effectivePageSize` no recorta (no hay página siguiente); el banner se inserta como celda extra y los 39 productos se renderizan completos. Es el escenario primario del ticket.
8. **Banner con `position > recordsFiltered`** — se descarta al expandir.
9. **SSR/CSR por `useDevice()`** — puede arrancar desktop; verificar que el recálculo client-side no cause flash de layout.

## 6. Lo que NO se toca

- La landing `/sabana-especial` ni `SabanaGallery.tsx` (fuera de scope; el bug no está ahí).
- Animaciones / `selectMatchingSku` / `FilterToggleContext` de Arredo (Equus no los tiene).
- `manifest.json`, theme blocks, configuración de banners en Site Editor.
- El componente POW/Prestigio (otro repo).

## 7. Plan de testing

### Automatizado

`react/__tests__/bannerSlots.test.ts` — tests unitarios puros del helper (se portan de Arredo): `normalizePath`, `matchesCurrentContext`, `filterApplicableBanners`, `expandBanners`, `getBannerSlotsForPage` (matriz de páginas/shift), `getTotalBannerSlotsAcrossAllPages`, clamp y `repeatBanner`.

### Manual (QA staging)

Rutas: `/categorias/remeras` (39 productos), `/categorias/jeans`.

1. Desktop, sábana activa con N banners → se muestran 39/39 productos + banners intercalados.
2. Desktop, sin banners → grilla idéntica al baseline (sin regresión).
3. Mobile, sábana activa → 39/39, banners clampeados a 2 columnas.
4. `widthPosition` 1/2/3/4 → ancho correcto y sin pérdida de productos.
5. `repeatBanner` activo → banners repetidos sin descontar productos.
6. Categoría con >40 productos → página 1 mantiene 40 slots (productos + banners), los desplazados aparecen al hacer show-more, sin duplicados ni faltantes.
7. Show-more hacia adelante y atrás → conteo acumulado correcto.
8. `SearchFooter` → `lastPage` coherente con el total ajustado.

## 8. Riesgos

- **Regresión de paginación** — `from`/`to` tocan el fetch. Mitigación: helper puro testeado antes de integrar.
- **Inconsistencia SSR/CSR por `useDevice()`** — aceptar reflow controlado si aparece.
- **Tests existentes del search-result** — correr la suite completa tras cada integración.

## 9. Fuera de scope

- Refactor general de `equusio.search-result`.
- La landing `/sabana-especial` / `SabanaGallery`.
- Soporte multi-cliente (fix solo para Equus).
- Cambios visuales en el diseño del banner.
