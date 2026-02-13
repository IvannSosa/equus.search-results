import { createContext, useContext } from 'react'

interface FilterToggleState {
  filtersVisible: boolean
  toggleFiltersVisibility: () => void
}

const FilterToggleContext = createContext<FilterToggleState>({
  filtersVisible: false,
  toggleFiltersVisibility: () => {},
})

export const useFilterToggle = () => useContext(FilterToggleContext)

export default FilterToggleContext
