import React, { useState, useCallback, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import { useIntl } from 'react-intl'
import classNames from 'classnames'
// eslint-disable-next-line no-restricted-imports
import { find, propEq } from 'ramda'
import { formatIOMessage } from 'vtex.native-types'
import { IconCaret } from 'vtex.store-icons'
import { useDevice } from 'vtex.device-detector'
import { useCssHandles, applyModifiers } from 'vtex.css-handles'
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
  'orderByModalScrim',
  'orderByModalContainer',
  'orderByModalHeader',
  'orderByModalTitle',
  'orderByModalClose',
  'orderByModalContent',
  'orderByModalRadioItem',
  'orderByModalRadioCircle',
  'orderByModalRadioLabel',
  'orderByModalFooter',
  'orderByModalApplyButton',
]

const OPEN_BODY_CLASS = 'overflow-hidden'

const SelectionListOrderBy = ({
  message = 'store/ordenation.sort-by',
  orderBy,
  options,
  showOrderTitle,
}) => {
  const intl = useIntl()
  const { setQuery } = useRuntime()
  const [showDropdown, setShowDropdown] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedValue, setSelectedValue] = useState(orderBy)
  const handles = useCssHandles(CSS_HANDLES)

  const orderByRef = useRef(null)
  const modalRef = useRef(null)

  const { isMobile } = useDevice()

  useEffect(() => {
    setSelectedValue(orderBy)
  }, [orderBy])

  // Body scroll lock for modal
  useEffect(() => {
    if (modalOpen) {
      document.body.classList.add(OPEN_BODY_CLASS)
    } else {
      document.body.classList.remove(OPEN_BODY_CLASS)
    }

    return () => document.body.classList.remove(OPEN_BODY_CLASS)
  }, [modalOpen])

  // Escape key closes modal
  useEffect(() => {
    if (!modalOpen) return undefined

    const handleEscape = e => {
      if (e.key === 'Escape') {
        closeModal()
      }
    }

    document.addEventListener('keydown', handleEscape)

    return () => document.removeEventListener('keydown', handleEscape)
  }, [modalOpen])

  // Focus trap inside modal
  useEffect(() => {
    if (!modalVisible || !modalRef.current) return undefined

    const modal = modalRef.current
    const focusable = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    if (focusable.length) focusable[0].focus()

    const handleTab = e => {
      if (e.key !== 'Tab' || !focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    modal.addEventListener('keydown', handleTab)

    return () => modal.removeEventListener('keydown', handleTab)
  }, [modalVisible])

  const openModal = useCallback(() => {
    setSelectedValue(orderBy)
    setModalOpen(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setModalVisible(true))
    })
  }, [orderBy])

  const closeModal = useCallback(() => {
    setModalVisible(false)
    setTimeout(() => {
      setModalOpen(false)
      setSelectedValue(orderBy)
    }, 300)
  }, [orderBy])

  const handleApplyOrder = useCallback(() => {
    const value = selectedValue

    setModalVisible(false)
    setTimeout(() => {
      setModalOpen(false)
      if (value !== orderBy) {
        setQuery({ order: value, page: undefined })
      }
    }, 300)
  }, [selectedValue, orderBy, setQuery])

  // Desktop: toggle dropdown. Mobile: open modal.
  const handleDropdownBtClick = useCallback(() => {
    if (isMobile) {
      openModal()
    } else {
      setShowDropdown(prev => !prev)
    }
  }, [isMobile, openModal])

  const handleOutsideClick = useCallback(() => setShowDropdown(false), [])

  useOutsideClick(orderByRef, handleOutsideClick, showDropdown)

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

  const sortByMessage = formatIOMessage({ id: message, intl })

  // Strip trailing colon for modal header title
  const modalTitle =
    typeof sortByMessage === 'string'
      ? sortByMessage.replace(/:?\s*$/, '')
      : sortByMessage

  const getOptionTitle = useCallback(
    option => {
      const selectedOption = find(propEq('value', option), options)

      return selectedOption ? selectedOption.label : ''
    },
    [options]
  )

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

  const renderMobileModal = () => {
    if (typeof document === 'undefined' || !modalOpen) return null

    return ReactDOM.createPortal(
      <React.Fragment>
        {/* Scrim overlay */}
        <div
          className={classNames(
            styles.orderByModalScrim,
            handles.orderByModalScrim
          )}
          style={{
            opacity: modalVisible ? 1 : 0,
          }}
          onClick={closeModal}
          role="presentation"
        />

        {/* Modal container */}
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-label={modalTitle}
          className={classNames(
            styles.orderByModalContainer,
            handles.orderByModalContainer
          )}
          style={{
            transform: modalVisible ? 'translateY(0)' : 'translateY(100%)',
          }}
        >
          {/* Header */}
          <div
            className={classNames(
              styles.orderByModalHeader,
              handles.orderByModalHeader
            )}
          >
            <span
              className={classNames(
                styles.orderByModalTitle,
                handles.orderByModalTitle
              )}
            >
              {modalTitle}
            </span>
            <button
              className={classNames(
                styles.orderByModalClose,
                handles.orderByModalClose
              )}
              onClick={closeModal}
              aria-label="Cerrar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M12 4L4 12M4 4L12 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {/* Radio options */}
          <div
            className={classNames(
              styles.orderByModalContent,
              handles.orderByModalContent
            )}
            role="radiogroup"
            aria-label={modalTitle}
          >
            {options.map(option => {
              const isSelected = selectedValue === option.value

              return (
                <button
                  key={option.value}
                  role="radio"
                  aria-checked={isSelected}
                  className={classNames(
                    styles.orderByModalRadioItem,
                    applyModifiers(
                      handles.orderByModalRadioItem,
                      isSelected ? 'selected' : ''
                    )
                  )}
                  onClick={() => setSelectedValue(option.value)}
                >
                  <span
                    className={classNames(
                      styles.orderByModalRadioCircle,
                      applyModifiers(
                        handles.orderByModalRadioCircle,
                        isSelected ? 'selected' : ''
                      )
                    )}
                  />
                  <span
                    className={classNames(
                      styles.orderByModalRadioLabel,
                      handles.orderByModalRadioLabel
                    )}
                  >
                    {option.label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div
            className={classNames(
              styles.orderByModalFooter,
              handles.orderByModalFooter
            )}
          >
            <button
              className={classNames(
                styles.orderByModalApplyButton,
                handles.orderByModalApplyButton
              )}
              onClick={handleApplyOrder}
              aria-label="Aplicar orden seleccionada"
            >
              Aplicar orden
            </button>
          </div>
        </div>
      </React.Fragment>,
      document.body
    )
  }

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

      {/* Desktop dropdown */}
      <div className={contentClass}>{renderOptions(orderBy)}</div>

      {/* Mobile modal */}
      {isMobile && renderMobileModal()}
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
}

export default SelectionListOrderBy
