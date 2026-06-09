# Equus Gallery Banners — Intercalar sin reemplazar productos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que los gallery banners de `equusio.search-result` se inserten como celdas adicionales sin descartar el producto que hoy reemplazan, de modo que las PLP de categoría muestren todos los productos (39/39 en `/categorias/remeras`).

**Architecture:** Se extrae la lógica de intercalado de `GalleryLayoutRow.tsx` a un helper puro `react/utils/interleaveBanners.ts` (testeable sin mockear React) que, por cada producto, inserta los banners cuya `globalPosition` coincide **antes** del producto y **siempre** emite el producto. `GalleryLayoutRow` consume el helper en lugar del `products.map` que hoy hace `return <banner>` (descartando el producto). No se toca paginación, slicing ni conteo de páginas.

**Tech Stack:** TypeScript, React 16, `@vtex/test-tools` (Jest), `vtex.search-page-context`, `vtex.device-detector`, `vtex.css-handles`.

**Spec:** `docs/superpowers/specs/2026-06-04-equus-gallery-banners-slot-accounting-design.md`

**Working directory:** `/Users/Shared/VTEX_NUEVOS/equus/equus.search-result`

---

## Pre-flight

- [ ] Confirmar working dir: `pwd` debe terminar en `equus.search-result`.
- [ ] Confirmar branch: `git branch --show-current` → `fix/gallery-banners-slot-accounting`.
- [ ] Instalar deps si hace falta: `yarn --cwd react install`.
- [ ] Baseline de tests verde: `yarn --cwd react test`.

---

## File Structure

Files to create:

- `react/utils/interleaveBanners.ts` — helper puro: arma la lista ordenada de celdas (banners + productos) de una fila, sin descartar productos.
- `react/__tests__/interleaveBanners.test.ts` — tests unitarios puros del helper.

Files to modify:

- `react/components/GalleryLayoutRow.tsx:103-148` — reemplazar el `products.map` (que devuelve banner **o** producto) por el consumo de `buildRowItems(...)`.

---

## Task 1: Crear helper `interleaveBanners.ts` con tipos + stub

**Files:**
- Create: `react/utils/interleaveBanners.ts`

- [ ] **Step 1: Escribir el archivo con tipos y stub**

Create `react/utils/interleaveBanners.ts`:

```ts
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
  throw new Error('not implemented')
}
```

- [ ] **Step 2: Verificar que compila**

Run: `yarn --cwd react tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
cd /Users/Shared/VTEX_NUEVOS/equus/equus.search-result
git add react/utils/interleaveBanners.ts
git commit -m "feat(banners): stub interleaveBanners helper API"
```

---

## Task 2: Implementar `buildRowItems` (TDD)

**Files:**
- Modify: `react/utils/interleaveBanners.ts`
- Create: `react/__tests__/interleaveBanners.test.ts`

- [ ] **Step 1: Escribir los tests**

Create `react/__tests__/interleaveBanners.test.ts`:

```ts
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
})
```

- [ ] **Step 2: Correr tests y verificar que fallan**

Run: `yarn --cwd react test interleaveBanners`
Expected: FAIL ("not implemented").

- [ ] **Step 3: Implementar `buildRowItems`**

En `react/utils/interleaveBanners.ts`, reemplazar el cuerpo del stub:

```ts
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
```

- [ ] **Step 4: Correr tests y verificar que pasan**

Run: `yarn --cwd react test interleaveBanners`
Expected: PASS (6 it's).

- [ ] **Step 5: Commit**

```bash
git add react/utils/interleaveBanners.ts react/__tests__/interleaveBanners.test.ts
git commit -m "feat(banners): implement buildRowItems (insert, never replace)"
```

---

## Task 3: Consumir el helper en `GalleryLayoutRow.tsx`

**Files:**
- Modify: `react/components/GalleryLayoutRow.tsx`

- [ ] **Step 1: Agregar el import del helper**

Find in `react/components/GalleryLayoutRow.tsx` (línea 13):

```tsx
import styles from '../searchResult.css'
import { pathOr } from 'ramda'
```

Replace with:

```tsx
import styles from '../searchResult.css'
import { pathOr } from 'ramda'
import { buildRowItems } from '../utils/interleaveBanners'
```

- [ ] **Step 2: Reemplazar el render `products.map` por el consumo del helper**

Find the JSX return block (líneas 103-148):

```tsx
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
```

Replace with:

```tsx
  const rowItems = buildRowItems({
    products,
    banners: (finalBanners as any[]) || [],
    rowIndex,
    itemsPerRow: effectiveItemsPerRow,
    page,
    maxItems,
  })

  return (
    <>
      {rowItems.map(item => {
        if (item.kind === 'banner') {
          return (
            <div
              key={item.key}
              className={styles.bannerItem}
              style={{ width: `${item.widthPosition}%` }}
            >
              <a className={styles.bannerUrl} href={item.banner.url}>
                <img
                  className={styles.bannerImage}
                  src={isMobile ? item.banner.imageMobile : item.banner.image}
                  alt={item.banner.alt}
                />
              </a>
            </div>
          )
        }

        return (
          <div
            key={item.product.cacheId}
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
              item={item.product}
              summary={summary}
              displayMode={displayMode}
              position={item.position}
              listName={listName}
              preferredSKU={preferredSKU}
            />
          </div>
        )
      })}
    </>
  )
```

Notas:
- `finalBanners` ya tiene la forma `{ banner, position, widthPosition }` (con `widthPosition` en %), que coincide con `ResolvedBanner`.
- `maxItems`, `page`, `effectiveItemsPerRow`, `isMobile`, `style`, `handles`, `finalBanners` ya están definidos arriba en el componente (no se tocan).
- El `early return` de `useRenderOnView` (`if (!hasBeenViewed) return dummyElement`) en las líneas 99-101 se mantiene **antes** de este bloque.

- [ ] **Step 3: Verificar compilación TypeScript**

Run: `yarn --cwd react tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Correr la suite completa**

Run: `yarn --cwd react test`
Expected: PASS (tests existentes + `interleaveBanners`). Si algún snapshot de `Gallery.test.js` cambia por el nuevo orden de celdas con banners, revisar el diff: debe reflejar banners insertados (no productos faltantes). Actualizar snapshot solo si el cambio es el esperado (`yarn --cwd react test -u`).

- [ ] **Step 5: Commit**

```bash
git add react/components/GalleryLayoutRow.tsx
git commit -m "fix(banners): insert banners instead of replacing products in grid"
```

---

## Task 4: Validación manual en staging (QA)

**Files:** ninguno (solo validación).

- [ ] **Step 1: Link a workspace de QA**

```bash
cd /Users/Shared/VTEX_NUEVOS/equus/equus.search-result
vtex login equusio
vtex use qa
vtex link
```

Expected: link activo sin errores.

- [ ] **Step 2: `/categorias/remeras` con sábana activa (desktop)**

Abrir `/categorias/remeras`. Verificar:
- Se renderizan los **39 productos** que reporta la búsqueda (contar las cards de producto, excluyendo banners).
- Los banners aparecen intercalados entre productos, no en lugar de ellos.

- [ ] **Step 3: `/categorias/jeans` con sábana activa (desktop)**

Repetir: la cantidad de cards de producto = total reportado por la URL.

- [ ] **Step 4: Mobile**

Repetir pasos 2-3 en viewport mobile. Verificar 39/39 y el ancho mobile del banner.

- [ ] **Step 5: Sin regresión (sábana desactivada)**

En una categoría sin `search-result-banners` configurado, verificar que la grilla se ve idéntica al baseline.

- [ ] **Step 6: Contingencia — categoría grande (>40 productos)**

Abrir una categoría con más de 40 productos y banners activos. Verificar:
- No se pierden ni duplican productos al hacer show-more.
- La grilla no queda visualmente rota (filas huérfanas evidentes).

Si la grilla se rompe o el conteo se desincroniza → **escalar a la solución de slot-accounting de Arredo** (ver spec §3 "Contingencia" y `arredo/arredo.search-result/docs/superpowers/plans/2026-04-15-arredo-gallery-banners-slot-accounting.md`). Si se ve bien, no se hace nada más.

- [ ] **Step 7: Registrar resultados en Asana**

Comentar en [la tarea](https://app.asana.com/1/66032875349265/project/1202543984602257/task/1215424994462292) con el resumen (39/39 en remeras y jeans, desktop+mobile, sin regresión) + screenshots.

---

## Self-Review

Revisión del plan contra el spec:

- **Cobertura de criterios de aceptación:** (1)(2) 39/39 → Task 2 (regresión: no se pierden productos) + Task 4 steps 2-3. (3) banners sin ocupar slots de conteo → enfoque aditivo, Task 3. (4) sin regresión → Task 2 (caso sin banners) + Task 4 step 5. (5) desktop+mobile → Task 4 steps 2-4. ✔
- **Placeholders:** sin TBD/TODO; todo el código de helper, tests y refactor está completo. ✔
- **Consistencia de tipos:** `ResolvedBanner { banner, position, widthPosition }` coincide con la forma real de `finalBanners` en `GalleryLayoutRow`. `buildRowItems` firma idéntica entre Task 1, Task 2 y el consumo en Task 3. `RowItem.position`/`product`/`key` usados consistentemente. ✔
- **Scope:** un solo subsistema (intercalado de banners en `GalleryLayoutRow`), un plan. Contingencia de slot-accounting documentada pero fuera del plan por defecto. ✔
