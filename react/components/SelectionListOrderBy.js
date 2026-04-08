import React, { useState, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'
import { useIntl } from 'react-intl'
import classNames from 'classnames'
// eslint-disable-next-line no-restricted-imports
import { find, propEq } from 'ramda'
import { formatIOMessage } from 'vtex.native-types'
import { IconCaret } from 'vtex.store-icons'
import { useDevice } from 'vtex.device-detector'
import { useCssHandles, applyModifiers } from 'vtex.css-handles'
import { Checkbox } from 'vtex.styleguide'
import { Collapse } from 'react-collapse'
import { useRuntime } from 'vtex.render-runtime'

import SelectionListItem from './SelectionListItem'
import useOutsideClick from '../hooks/useOutsideClick'
import styles from '../searchResult.css'

const CSS_HANDLES = [
  'orderByButton',
  'orderByOptionsContainer',
  'orderByDropdown',
  'orderByText',
  'filterPopupTitle',
  'filterPopupArrowIcon',
  'orderByCollapseContainer',
  'orderByCollapseHeader',
  'orderByCollapseTitle',
  'orderByCollapseIcon',
  'orderByCollapseContent',
  'orderByCollapseItem',
  'orderByCollapseCheckbox',
]

const SelectionListOrderBy = ({
  message = 'store/ordenation.sort-by',
  orderBy,
  options,
  showOrderTitle,
  collapse = false,
  collapseTitle = 'store/ordenation.sort-by',
  initiallyCollapsed = false,
}) => {
  const intl = useIntl()
  const [showDropdown, setShowDropdown] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(initiallyCollapsed)
  const handles = useCssHandles(CSS_HANDLES)
  const { setQuery } = useRuntime()

  const orderByRef = useRef(null)

  const handleDropdownBtClick = useCallback(
    () => setShowDropdown(!showDropdown),
    [showDropdown]
  )

  const handleOutsideClick = useCallback(() => setShowDropdown(false), [])

  useOutsideClick(orderByRef, handleOutsideClick, showDropdown)

  const { isMobile } = useDevice()

  const handleCollapseToggle = useCallback(() => {
    setIsCollapsed(prevState => !prevState)
  }, [])

  const handleCollapseOptionClick = useCallback(
    optionValue => {
      setQuery({ order: optionValue, page: undefined })
    },
    [setQuery]
  )

  const renderOptions = orderByOption => {
    return options.map(option => {
      return (
        <SelectionListItem
          key={option.value}
          onItemClick={handleOutsideClick}
          option={option}
          selected={option.value === orderByOption}
        />
      )
    })
  }

  const renderCollapseOptions = orderByOption => {
    return options.map((option, index) => {
      const isSelected = option.value === orderByOption

      return (
        <div
          key={option.value}
          className={classNames(
            handles.orderByCollapseItem,
            applyModifiers(handles.orderByCollapseItem, isSelected ? 'selected' : ''),
            'pr4 pt3 items-center flex bb b--muted-5'
          )}
          style={{
            opacity: isCollapsed ? 0 : 1,
            transform: isCollapsed ? 'translateY(-10px)' : 'translateY(0)',
            transition: `opacity 0.3s ease ${index * 0.05}s, transform 0.3s ease ${index * 0.05}s`,
          }}
        >
          <Checkbox
            className={classNames(handles.orderByCollapseCheckbox, 'mb0')}
            checked={isSelected}
            id={`orderBy-${option.value}`}
            label={option.label}
            name={`orderBy-${option.value}`}
            onChange={() => handleCollapseOptionClick(option.value)}
            value={option.value}
          />
        </div>
      )
    })
  }

  const sortByMessage = formatIOMessage({ id: message, intl })
  const collapseTitleMessage = formatIOMessage({ id: collapseTitle, intl })

  const getOptionTitle = useCallback(
    option => {
      const selectedOption = find(propEq('value', option), options)

      return selectedOption ? selectedOption.label : ''
    },
    [options]
  )

  // Collapse view
  if (collapse) {
    return (
      <div className={classNames(handles.orderByCollapseContainer, 'w-100')}>
        <div
          role="button"
          tabIndex={0}
          className={classNames(
            handles.orderByCollapseHeader,
            't-body pr5 pv3 pointer bb b--muted-5 outline-0 flex items-center justify-between'
          )}
          onClick={handleCollapseToggle}
          onKeyDown={e => {
            if (e.key === ' ' || e.key === 'Enter') {
              handleCollapseToggle()
            }
          }}
        >
          <span
            className={classNames(
              handles.orderByCollapseTitle,
              'pv4 c-on-base t-heading-5'
            )}
          >
            {collapseTitleMessage}
          </span>
          <span
            className={classNames(handles.orderByCollapseIcon, 'fr')}
            style={{
              display: 'inline-flex',
              transition: 'transform 0.3s ease',
              transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="6" viewBox="0 0 11 6" fill="none">
              <path d="M0.5 0.5L5.5 5.5L10.5 0.5" stroke="#1E1E1E" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
        <Collapse isOpened={!isCollapsed}>
          <div className={classNames(handles.orderByCollapseContent, 'pl5')}>
            {renderCollapseOptions(orderBy)}
          </div>
        </Collapse>
      </div>
    )
  }

  // Default dropdown view
  const btClass = classNames(
    handles.orderByButton,
    'ph3 pv5 mv0 pointer flex items-center justify-end bg-base c-on-base t-action--small bt br bl bb-0 br2 br--top bw1 w-100 outline-0',
    {
      'b--muted-4': showDropdown && isMobile,
      'b--transparent pl1': !showDropdown,
    }
  )

  const contentClass = classNames(
    styles.orderByOptionsContainer,
    'z-3 absolute bg-base shadow-5 w-100 f5 b--muted-4 br2 ba bw1 br--bottom top-0 right-0-ns',
    {
      db: showDropdown,
      dn: !showDropdown,
    }
  )

  const dropdownSort = classNames(
    handles.orderByDropdown,
    'relative pt1 justify-end w-100 w-auto-ns ml-auto'
  )

  return (
    <div className={dropdownSort} ref={orderByRef}>
      <button onClick={handleDropdownBtClick} className={btClass}>
        <span
          className={classNames(
            handles.filterPopupTitle,
            'c-on-base t-action--small ml-auto-ns'
          )}
        >
          <span
            className={classNames(handles.orderByText, 'c-muted-2', {
              'dn dib-ns': !orderBy.length,
            })}
          >
            {sortByMessage}
          </span>{' '}
          {showOrderTitle ? getOptionTitle(orderBy) : null}
        </span>
        <span className={`${handles.filterPopupArrowIcon} ph5 pt1`}>
          <IconCaret orientation={showDropdown ? 'up' : 'down'} size={10} />
        </span>
      </button>

      <div className={contentClass}>{renderOptions(orderBy)}</div>
    </div>
  )
}

SelectionListOrderBy.propTypes = {
  /** Current Ordernation  */
  orderBy: PropTypes.string,
  /** Sort Options */
  options: PropTypes.arrayOf(
    PropTypes.shape({
      /** Label to Option */
      label: PropTypes.string,
      /** Value to value */
      value: PropTypes.string,
    })
  ),
  /** Message to be displayed */
  message: PropTypes.string,
  /** Show or hide order title */
  showOrderTitle: PropTypes.bool,
  /** Whether to display as a collapsible list with checkboxes */
  collapse: PropTypes.bool,
  /** Title to display when collapse is true */
  collapseTitle: PropTypes.string,
  /** Whether the collapse starts collapsed */
  initiallyCollapsed: PropTypes.bool,
}

export default SelectionListOrderBy
