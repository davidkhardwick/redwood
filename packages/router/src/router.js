// The guts of the router implementation.

import {
  Location,
  parseSearch,
  replaceParams,
  matchPath,
  ParamsContext,
  navigate,
  mapNamedRoutes,
  SplashPage,
  PageLoader,
} from './internal'

// Definitions of the core param types.
const coreParamTypes = {
  Int: {
    constraint: /\d+/,
    transform: Number,
  },
}

const Route = () => {
  return null
}

const Router = (props) => (
  <Location>
    {(locationContext) => <RouterImpl {...locationContext} {...props} />}
  </Location>
)

const normalizePage = (specOrPage) => {
  if (specOrPage.loader) {
    return specOrPage
  } else {
    return {
      name: specOrPage.name,
      loader: () =>
        new Promise((resolve) =>
          resolve({
            default: specOrPage,
          })
        ),
    }
  }
}

const DEFAULT_PAGE_LOADING_DELAY = 1000 // milliseconds

const RouterImpl = ({
  pathname,
  search,
  paramTypes,
  pageLoadingDelay = DEFAULT_PAGE_LOADING_DELAY,
  children,
}) => {
  const routes = React.Children.toArray(children)
  mapNamedRoutes(routes)

  let NotFoundPage
  const allParamTypes = { ...coreParamTypes, ...paramTypes }

  for (let route of routes) {
    const { path, page: Page, redirect, notfound } = route.props

    if (notfound) {
      NotFoundPage = Page
      continue
    }

    const { match, params: pathParams } = matchPath(
      path,
      pathname,
      allParamTypes
    )

    if (match) {
      const searchParams = parseSearch(search)
      const allParams = { ...pathParams, ...searchParams }
      if (redirect) {
        const newPath = replaceParams(redirect, pathParams)
        navigate(newPath)
        return (
          <RouterImpl pathname={newPath} search={search}>
            {children}
          </RouterImpl>
        )
      } else {
        return (
          <ParamsContext.Provider value={allParams}>
            <PageLoader
              spec={normalizePage(Page)}
              delay={pageLoadingDelay}
              params={allParams}
            />
          </ParamsContext.Provider>
        )
      }
    }
  }

  // If the router is being used in a Redwood app and only the notfound page is
  // specified, show the Redwood splash page.
  if (routes.length === 1 && NotFoundPage) {
    const isRedwood = typeof __REDWOOD__ !== 'undefined'
    return <SplashPage isRedwood={isRedwood} />
  }

  return (
    <ParamsContext.Provider value={{}}>
      <PageLoader spec={normalizePage(NotFoundPage)} />
    </ParamsContext.Provider>
  )
}

export { Router, Route }
