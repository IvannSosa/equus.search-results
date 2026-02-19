import React from 'react'
import { useCssHandles, applyModifiers } from 'vtex.css-handles'
import { useIntl, defineMessages } from 'react-intl'

import { useFilterToggle } from './components/FilterToggleContext'

const CSS_HANDLES = [
  'filterToggleButton',
  'filterToggleButtonIcon',
  'filterToggleButtonText',
] as const

const messages = defineMessages({
  showFilters: {
    id: 'store/search-result.filter-toggle.show',
  },
  hideFilters: {
    id: 'store/search-result.filter-toggle.hide',
  },
})

interface FilterToggleButtonProps {
  blockClass?: string
}

const FilterToggleButton: React.FC<FilterToggleButtonProps> = () => {
  const handles = useCssHandles(CSS_HANDLES)
  const intl = useIntl()
  const { filtersVisible, toggleFiltersVisibility } = useFilterToggle()

  const buttonText = filtersVisible
    ? intl.formatMessage(messages.hideFilters)
    : intl.formatMessage(messages.showFilters)

  const buttonClasses = filtersVisible
    ? applyModifiers(handles.filterToggleButton, 'active')
    : handles.filterToggleButton

  return (
    <button
      className={`${buttonClasses} flex items-center`}
      onClick={toggleFiltersVisibility}
      aria-expanded={filtersVisible}
      aria-label={buttonText}
      type="button"
    >
      <span className={handles.filterToggleButtonIcon}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2 4H14M4 8H12M6 12H10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className={handles.filterToggleButtonText}>{buttonText}</span>
    </button>
  )
}

;(FilterToggleButton as any).schema = {
  title: 'admin/editor.search-result.filter-toggle.title',
}

export default FilterToggleButton
