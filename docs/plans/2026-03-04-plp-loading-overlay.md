# PLP Loading Overlay — Arredo Logo Animation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show an animated Arredo logo overlay on the product gallery when search filters are applied/removed.

**Architecture:** Modify `GalleryLayout.tsx` to read the `searchQuery.loading` state from `SearchPageContext` and render a positioned overlay with the Arredo 4-circles SVG logo using a staggered pulse CSS animation. Disable the existing full-page `LoadingOverlay` spinner to avoid duplicate loading indicators.

**Tech Stack:** React 16.x, TypeScript, CSS Modules (`searchResult.css`), VTEX search-page-context

---

### Task 1: Add CSS for the gallery loading overlay

**Files:**
- Modify: `react/searchResult.css` (append at end)

**Step 1: Add overlay + animation CSS**

Append to the end of `react/searchResult.css`:

```css
/* ---- Gallery Loading Overlay (Arredo Logo) ---- */
.galleryLoadingOverlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.85);
  z-index: 10;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 8rem;
  pointer-events: all;
  opacity: 0;
  animation: galleryOverlayFadeIn 0.3s ease-in-out forwards;
}

@keyframes galleryOverlayFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.galleryLoadingLogo {
  width: 2.3125rem;
  height: 2.3125rem;
}

.galleryLoadingLogo circle {
  transform-origin: center;
  animation: arredoPulse 1.2s ease-in-out infinite;
}

.galleryLoadingLogo circle:nth-child(1) {
  animation-delay: 0s;
}

.galleryLoadingLogo circle:nth-child(2) {
  animation-delay: 0.15s;
}

.galleryLoadingLogo circle:nth-child(3) {
  animation-delay: 0.3s;
}

.galleryLoadingLogo circle:nth-child(4) {
  animation-delay: 0.45s;
}

@keyframes arredoPulse {
  0%, 100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}
```

**Step 2: Verify no syntax errors**

The CSS file is a CSS Modules file — no SASS compilation needed. VTEX builds it with webpack.

---

### Task 2: Add overlay to GalleryLayout.tsx

**Files:**
- Modify: `react/GalleryLayout.tsx`

**Step 1: Update CSS_HANDLES and imports**

At line 10, the file already imports `SearchPageContext`. Extract `useSearchPage` alongside the existing destructured hooks:

```tsx
// Line 29 — change from:
const { useSearchPageState, useSearchPageStateDispatch } = SearchPageContext

// To:
const { useSearchPage, useSearchPageState, useSearchPageStateDispatch } = SearchPageContext
```

Update the CSS_HANDLES array to include the new handles:

```tsx
// Line 26 — change from:
const CSS_HANDLES = ['gallery'] as const

// To:
const CSS_HANDLES = ['gallery', 'galleryLoadingOverlay', 'galleryLoadingLogo'] as const
```

**Step 2: Add loading state detection inside the component**

After the existing `const { filtersVisible } = useFilterToggle()` (line 70), add:

```tsx
const { searchQuery } = useSearchPage()
const { isFetchingMore } = useSearchPageState()
const isFilterLoading = searchQuery?.loading && !isFetchingMore
```

Note: `isFetchingMore` is already in `useSearchPageState()` — we just need to destructure it. Update the existing line 68:

```tsx
// Line 68 — change from:
const { selectedGalleryLayout } = useSearchPageState()

// To:
const { selectedGalleryLayout, isFetchingMore } = useSearchPageState()
```

**Step 3: Wrap the gallery container with relative positioning + overlay**

Change the return block (lines 166-199) from:

```tsx
return (
  <ProductListProvider listName={listName as string}>
    <div id="gallery-layout-container" className={galleryClasses}>
      {galleryRows.map((rowProducts, index) => (
        ...
      ))}
      {typeof lazyItemsRemaining === 'number' && lazyItemsRemaining > 0 && (
        ...
      )}
    </div>
    <ProductListEventCaller />
  </ProductListProvider>
)
```

To:

```tsx
return (
  <ProductListProvider listName={listName as string}>
    <div style={{ position: 'relative' }}>
      {isFilterLoading && (
        <div className={handles.galleryLoadingOverlay}>
          <svg
            className={handles.galleryLoadingLogo}
            xmlns="http://www.w3.org/2000/svg"
            width="37"
            height="37"
            viewBox="0 0 37 37"
            fill="none"
          >
            <circle cx="7.53704" cy="7.53704" r="7.53704" fill="#6A6A6A" />
            <circle cx="29.4628" cy="7.53704" r="7.53704" fill="#6A6A6A" />
            <circle cx="7.53704" cy="29.4631" r="7.53704" fill="#6A6A6A" />
            <circle cx="29.4628" cy="29.4631" r="7.53704" fill="#6A6A6A" />
          </svg>
        </div>
      )}
      <div id="gallery-layout-container" className={galleryClasses}>
        {galleryRows.map((rowProducts, index) => (
          <GalleryLayoutRow
            key={`${currentLayoutOption.name}-${index}`}
            products={rowProducts}
            lazyRender={
              !!isLazyRenderEnabled && index >= LAZY_RENDER_THRESHOLD
            }
            summary={summary}
            displayMode="normal"
            itemsPerRow={itemsPerRow}
            currentLayoutName={currentLayoutOption.name}
            rowIndex={index}
            listName={listName}
            preferredSKU={preferredSKU}
            GalleryItemComponent={slots[currentLayoutOption.component]}
          />
        ))}
        {typeof lazyItemsRemaining === 'number' &&
          lazyItemsRemaining > 0 && (
            <div
              style={{
                width: '100%',
                height: 300 * Math.ceil(lazyItemsRemaining / itemsPerRow),
              }}
              className="flex justify-center pt10"
            >
              <Spinner />
            </div>
          )}
      </div>
    </div>
    <ProductListEventCaller />
  </ProductListProvider>
)
```

---

### Task 3: Disable the existing full-page LoadingOverlay

**Files:**
- Modify: `react/SearchResultFlexible.js` (line ~238)

The existing `LoadingOverlay` wraps all content including filters and shows a generic VTEX Spinner. Since we now have a gallery-scoped overlay, disable it.

**Step 1: Change loading prop to always false**

```js
// Line 238 — change from:
<LoadingOverlay loading={showLoading}>

// To:
<LoadingOverlay loading={false}>
```

This keeps the component in the tree (no refactor needed) but prevents it from rendering the full-page overlay.

---

### Task 4: Clean up debug console.logs

**Files:**
- Modify: `react/GalleryLayout.tsx`

**Step 1: Remove debug logs**

Remove the `console.log` at lines 72-78 and line 139:

```tsx
// DELETE lines 72-78:
console.log('products', {  layouts, ...})

// DELETE line 139:
console.log({layouts})
```

---

### Task 5: Build and verify

**Step 1: Build the component**

```bash
cd vtex/componentes-pow/frontend/arredo.search-result
vtex link
```

**Step 2: Test in browser**

1. Navigate to any PLP (e.g. `/sabanas`)
2. Click a filter checkbox (e.g. a color or size)
3. Verify: white overlay appears over the gallery with the Arredo 4-circles logo pulsing
4. Verify: filters sidebar remains interactive (not covered)
5. Verify: overlay disappears smoothly when products load
6. Remove a filter — verify overlay appears again
7. Test on mobile (bottom-sheet filter → Aplicar)

**Step 3: Commit**

```bash
git add react/GalleryLayout.tsx react/searchResult.css react/SearchResultFlexible.js
git commit -m "feat: add Arredo logo loading overlay on PLP gallery filter changes"
```
