// eslint-disable-next-line default-param-last
export function getFilterTitle(title = '', intl) {
  const resolved = intl.messages[title] ? intl.formatMessage({ id: title }) : title

  // Remove VTEX catalog sort-order prefixes like [1], [3], [7] from facet names
  return resolved.replace(/^\[\d+\]\s*/, '')
}

export const HEADER_SCROLL_OFFSET = 90
