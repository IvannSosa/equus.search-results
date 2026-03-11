import classNames from 'classnames'
import React, { useMemo } from 'react'
import { applyModifiers, useCssHandles } from 'vtex.css-handles'
import { usePixel } from 'vtex.pixel-manager'
import { useIntl } from 'react-intl'

import styles from '../searchResult.css'
import { pushFilterManipulationPixelEvent } from '../utils/filterManipulationPixelEvents'
import useShippingActions from '../hooks/useShippingActions'
import ShippingActionButton from './ShippingActionButton'

const CHECKBOX_HANDLES = ['filterCheckbox', 'filterCheckboxLabel']

const FacetCheckboxListItem = ({
  facet,
  showFacetQuantity,
  sampling,
  facetTitle,
  searchQuery,
  onFilterCheck,
}) => {
  const intl = useIntl()
  const handles = useCssHandles(CHECKBOX_HANDLES)

  const { push } = usePixel()

  const { actionLabel, actionType, openDrawer, shouldDisable } =
    useShippingActions(facet)

  const showActionButton = !!actionType

  const { name, value: slugifiedName } = facet

  const facetLabel = useMemo(() => {
    let labelElement = facet.name

    if (showFacetQuantity && !sampling) {
      labelElement = `${labelElement} (${facet.quantity})`
    }

    if (showActionButton) {
      labelElement = (
        <div className="flex flex-column">
          <span>{labelElement}</span>
          <ShippingActionButton
            label={intl.formatMessage({ id: actionLabel })}
            openDrawer={openDrawer}
          />
        </div>
      )
    }

    return labelElement
  }, [
    showFacetQuantity,
    sampling,
    facet.name,
    facet.quantity,
    showActionButton,
    actionLabel,
    openDrawer,
    intl,
  ])

  return (
    <div
      className={classNames(
        applyModifiers(styles.filterAccordionItemBox, slugifiedName),
        'pr4 items-center flex'
      )}
      style={{ hyphens: 'auto', wordBreak: 'break-word' }}
    >
      <label
        htmlFor={name}
        className={handles.filterCheckboxLabel}
      >
        <input
          type="checkbox"
          id={name}
          checked={facet.selected}
          onChange={() => {
            pushFilterManipulationPixelEvent({
              name: facetTitle,
              value: name,
              products: searchQuery?.products ?? [],
              push,
            })

            onFilterCheck({ ...facet, title: facetTitle })
          }}
          name={name}
          value={name}
          disabled={shouldDisable && !facet.selected}
          className="o-0 absolute"
          style={{ width: 0, height: 0 }}
        />
        <span
          className={classNames(
            handles.filterCheckbox,
            { [`${handles.filterCheckbox}--checked`]: facet.selected }
          )}
          aria-hidden="true"
        />
        <span>{facetLabel}</span>
      </label>
    </div>
  )
}

export default FacetCheckboxListItem
