import PropTypes from 'prop-types'
import React, { Fragment, useRef, useEffect } from 'react'
import { FormattedMessage } from 'react-intl'
import { ExtensionPoint } from 'vtex.render-runtime'
import { useCssHandles } from 'vtex.css-handles'
import { useSearchPage } from 'vtex.search-page-context/SearchPageContext'
import { range } from 'ramda'

const CSS_HANDLES = [
  'searchNotFound',
  'searchNotFoundOops',
  'searchNotFoundInfo',
  'searchNotFoundWhatDoIDo',
  'searchNotFoundWhatToDoDots',
  'searchNotFoundWhatToDoDotsContainer',
  'searchNotFoundTerm',
  'searchNotFoundTextListLine',
]

/**
 * Oculta el sidebar de filtros (stretchChildrenWidth sin flex-grow-1)
 * dentro del row plp-content-desktop para que el not-found ocupe
 * el 100% del ancho disponible.
 */
function hideFilterSidebar(element) {
  let node = element

  while (node && node !== document.body) {
    if (
      node.className &&
      node.className.includes('flexRowContent') &&
      node.className.includes('plp-content-desktop')
    ) {
      const firstChild = node.firstElementChild

      if (
        firstChild &&
        firstChild.className.includes('stretchChildrenWidth') &&
        !firstChild.className.includes('flex-grow-1')
      ) {
        firstChild.style.display = 'none'
      }

      break
    }

    node = node.parentElement
  }
}

/**
 * Not found page component, rendered when the search doesn't return any
 * products from the API.
 *
 * Si se definen children en el store-theme (composition: "children"),
 * se renderizan en lugar del UI "oops!" por defecto.
 */
const NotFoundSearch = ({ children }) => {
  const handles = useCssHandles(CSS_HANDLES)
  const containerRef = useRef(null)

  const { params } = useSearchPage()

  const term = params?.term ? decodeURI(params?.term) : ''

  const hasChildren = React.Children.count(children) > 0

  // Cuando se muestran los children (diseño 404), ocultar el sidebar
  // de filtros para que el contenido ocupe el 100% del ancho.
  useEffect(() => {
    if (hasChildren && containerRef.current) {
      hideFilterSidebar(containerRef.current)
    }
  }, [hasChildren])

  // Si hay children definidos desde el store-theme, renderizarlos
  if (hasChildren) {
    return (
      <div ref={containerRef} className={`${handles.searchNotFound}`}>
        {children}
      </div>
    )
  }

  // Fallback: UI "oops!" original
  return (
    <Fragment>
      <div
        className={`${handles.searchNotFound} flex flex-column-s flex-row-ns justify-center-ns items-center h-auto-s h5-ns`}
      >
        <div
          className={`${handles.searchNotFoundOops} flex justify-end-ns justify-center-s ttu f1 ph4 pv4-s pv0-ns c-muted-3 ph9 b`}
        >
          oops!
        </div>
        <div className={`${handles.searchNotFoundInfo} flex flex-column ph9`}>
          {term ? (
            <FormattedMessage
              id="store/search.empty-products"
              values={{
                term: (
                  <span
                    className={`${handles.searchNotFoundTerm} c-action-primary`}
                  >
                    {term}
                  </span>
                ),
              }}
            >
              {(...textList) => (
                <span
                  className={`${handles.searchNotFoundTextListLine} c-muted-1 b`}
                >
                  {textList.map((text, index) => (
                    <Fragment key={index}>{text}</Fragment>
                  ))}
                </span>
              )}
            </FormattedMessage>
          ) : (
            <FormattedMessage id="store/search.no-products" />
          )}
          <FormattedMessage id="store/search.what-do-i-do">
            {text => (
              <p className={`${handles.searchNotFoundWhatDoIDo} c-muted-2`}>
                {text}
              </p>
            )}
          </FormattedMessage>
          <ul
            className={`${handles.searchNotFoundWhatToDoDotsContainer} c-muted-2`}
          >
            {range(1, 5).map(id => (
              <FormattedMessage id={`store/search.what-to-do.${id}`} key={id}>
                {text => (
                  <li
                    className={`${handles.searchNotFoundWhatToDoDots}`}
                    key={text}
                  >
                    {text}
                  </li>
                )}
              </FormattedMessage>
            ))}
          </ul>
        </div>
      </div>
      <ExtensionPoint id="shelf" />
    </Fragment>
  )
}

NotFoundSearch.propTypes = {
  /** Search term */
  term: PropTypes.string,
}

export default NotFoundSearch
