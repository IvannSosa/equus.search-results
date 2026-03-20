# SearchSuggestions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "search suggestions + results title" bar above the PLP toolbar that shows related search terms and the current search term, visible only on text search pages.

**Architecture:** New React component `SearchSuggestions` inside `arredo.search-result` that uses `useSearchPage()` for the search term, `useQuery(QuerySearchSuggestions)` for related terms, and CSS Modules for styling. Registered as a VTEX block and placed in the theme before the toolbar.

**Tech Stack:** React 16.x, TypeScript, Apollo `useQuery`, `vtex.store-resources/QuerySearchSuggestions`, CSS Modules, VTEX IO Store Framework

---

### Task 1: Create the SearchSuggestions component

**Files:**
- Create: `react/SearchSuggestions.tsx`
- Create: `react/searchSuggestions.css`

- [ ] **Step 1: Create CSS Module file**

```css
/* react/searchSuggestions.css */

.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0 0 0.5rem;
}

.suggestionsRow {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.suggestionsLabel {
  font-size: 0.75rem;
  line-height: 1.0625rem;
  color: #6a6a6a;
  margin: 0;
  white-space: nowrap;
}

.suggestionLink {
  font-size: 0.75rem;
  line-height: 1.0625rem;
  color: #6a6a6a;
  text-decoration: underline;
  cursor: pointer;
  transition: color 0.2s ease-in-out;
}

.suggestionLink:hover {
  color: #3e3e3e;
}

.resultTitle {
  font-size: 1rem;
  line-height: normal;
  color: #6a6a6a;
  margin: 0;
}

.resultTerm {
  font-weight: 600;
  color: #3e3e3e;
}
```

- [ ] **Step 2: Create the SearchSuggestions component**

```tsx
// react/SearchSuggestions.tsx
import React from 'react'
import { useQuery } from 'react-apollo'
import { Link } from 'vtex.render-runtime'
import { useSearchPage } from 'vtex.search-page-context/SearchPageContext'
import searchSuggestionsQuery from 'vtex.store-resources/QuerySearchSuggestions'

import styles from './searchSuggestions.css'

interface SearchSuggestionsProps {
  /** Custom page for suggestion links (default: store.search) */
  customPage?: string
}

interface SuggestionData {
  searchSuggestions: {
    searches: Array<{
      term: string
      count: number
    }>
  }
}

const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  customPage,
}) => {
  const { searchQuery } = useSearchPage()
  const fullText = searchQuery?.variables?.fullText

  // Only render on text search pages
  if (!fullText) {
    return null
  }

  const { data, loading } = useQuery<SuggestionData>(searchSuggestionsQuery, {
    variables: { fullText },
  })

  const suggestions = data?.searchSuggestions?.searches ?? []

  return (
    <div className={styles.container}>
      {!loading && suggestions.length > 0 && (
        <div className={styles.suggestionsRow}>
          <p className={styles.suggestionsLabel}>
            Sugerencias relacionadas a la palabra
          </p>
          {suggestions.map(suggestion => (
            <Link
              key={suggestion.term}
              className={styles.suggestionLink}
              page={customPage || 'store.search'}
              query="map=ft"
              params={{ term: suggestion.term }}
            >
              {suggestion.term}
            </Link>
          ))}
        </div>
      )}
      <p className={styles.resultTitle}>
        {'Resultados de búsqueda: '}
        <span className={styles.resultTerm}>{fullText}</span>
      </p>
    </div>
  )
}

export default SearchSuggestions
```

- [ ] **Step 3: Commit**

```bash
git add react/SearchSuggestions.tsx react/searchSuggestions.css
git commit -m "feat: add SearchSuggestions component with suggestions + results title"
```

---

### Task 2: Register the block in interfaces.json

**Files:**
- Modify: `store/interfaces.json`

- [ ] **Step 1: Add search-suggestions interface**

Add this entry after the existing `"search-title.v2"` block (around line 179):

```json
"search-suggestions": {
  "component": "SearchSuggestions"
},
```

- [ ] **Step 2: Add search-suggestions to allowed blocks in search-result-layout.desktop**

In the `"search-result-layout.desktop"` allowed array (line 92-112), add `"search-suggestions"`:

```json
"search-result-layout.desktop": {
  "allowed": [
    "breadcrumb.search",
    "filter-navigator.v3",
    "filter-toggle-button",
    "total-products.v2",
    "order-by.v2",
    "search-title.v2",
    "search-suggestions",
    ...
  ],
  ...
}
```

Do the same for `"search-result-layout.mobile"` (line 117-141).

- [ ] **Step 3: Commit**

```bash
git add store/interfaces.json
git commit -m "feat: register search-suggestions block in interfaces"
```

---

### Task 3: Add the block to the theme

**Files:**
- Modify: `C:/Users/Ruben/Desktop/POW/vtex/tiendas/arredo/arredo.store-theme-ar-qa/theme/store/blocks/plp/plp-desktop.jsonc`

- [ ] **Step 1: Add search-suggestions before the toolbar in desktop layout**

```jsonc
"search-result-layout.desktop.product-comparison#plp-redesign": {
  "children": [
    "arr-plp-hero-context.content#plp",
    "subcategory-carousel-context.content#plp",
    "search-suggestions",
    "flex-layout.row#plp-toolbar-sticky",
    "flex-layout.row#plp-fetch-previous",
    "flex-layout.row#plp-content-desktop",
    "flex-layout.row#plp-pagination",
    "arredo-seo-text-context.content#plp",
    "back-to-top-button"
  ],
  "props": { ... }
}
```

- [ ] **Step 2: Add to mobile layout too**

Find `search-result-layout.mobile.product-comparison#plp-redesign` and add `"search-suggestions"` before the toolbar row.

- [ ] **Step 3: Commit theme changes**

```bash
cd C:/Users/Ruben/Desktop/POW/vtex/tiendas/arredo/arredo.store-theme-ar-qa/theme
git add store/blocks/plp/plp-desktop.jsonc
git commit -m "feat: add search-suggestions block to PLP layout"
```

---

### Task 4: Link and verify

- [ ] **Step 1: vtex link arredo.search-result**

Link the component to verify it compiles and renders.

- [ ] **Step 2: Navigate to a search page**

Go to `https://{workspace}--arredoqa.myvtex.com/busca/almohadones` and verify:
- Suggestions row appears with related terms
- "Resultados de búsqueda: **almohadones**" shows below
- Clicking a suggestion navigates to that search
- On category pages (e.g., `/ropa-de-cama`), the component does NOT render

- [ ] **Step 3: Verify mobile**

Check the same on mobile viewport.

- [ ] **Step 4: CSS polish if needed**

Compare against Figma (`3713:93671`) and adjust spacing/typography.
