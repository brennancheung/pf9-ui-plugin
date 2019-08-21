import { concat, identity, assoc, find, whereEq, when, isNil, reject, filter, always, append, uniqWith, eqProps, pipe, over, lensPath, pickAll, set, view } from 'ramda'
import { ensureFunction, ensureArray, emptyObj, emptyArr } from 'utils/fp'
import moize from 'moize'

export const defaultUniqueIdentifier = 'id'
export const paramsContextKey = 'cachedParams'
export const dataContextKey = 'cachedData'

let loaders = {}
export const getContextLoader = key => {
  if (!loaders.hasOwnProperty(key)) {
    throw new Error(`Context Loader with key ${key} not found`)
  }
  return loaders[key]
}

/**
 * Create a function that will use context to load and cache values
 * @param {string} key Key on which the resolved value will be cached
 * @param {function} dataFetchFn Function returning the data to be assigned to the context
 * @param {object} [options] Optional additional options
 * @param {string} [options.uniqueIdentifier="id"] Unique primary key of the entity
 * @param {string} [options.entityName=options.uniqueIdentifier] Name of the entity
 * @param {string|array} [options.indexBy] Keys to use to index the values
 * @param {function} [options.dataMapper] Function used to apply additional transformations to loaded data
 * @param {function|string} [options.successMessage] Custom message to display after the items have been successfully fetched
 * @param {function|string} [options.errorMessage] Custom message to display after an error has been thrown
 * @returns {function}
 */
const createContextLoader = (key, dataFetchFn, options = emptyObj) => {
  const {
    uniqueIdentifier = defaultUniqueIdentifier,
    entityName = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase(),
    indexBy,
    dataMapper = identity,
    successMessage = (params) => `Successfully retrieved ${entityName} items`,
    errorMessage = (catchedErr, params) => `Error when trying to retrieve ${entityName} items`,
  } = options
  const paramsLens = lensPath([paramsContextKey, key])
  const dataLens = lensPath([dataContextKey, key])
  const arrayIfNil = when(isNil, always(emptyArr))
  const contextLoaderFn = moize(async ({ getContext, setContext, params = emptyObj, refetch = false, additionalOptions = emptyObj }) => {
    const {
      onSuccess = (successMessage, params) => console.info(successMessage),
      onError = (errorMessage, catchedErr, params) => console.error(errorMessage, catchedErr),
    } = additionalOptions
    const indexByAll = indexBy ? ensureArray(indexBy) : emptyArr
    const loadFromContext = (key, params, refetch) => {
      const loaderFn = getContextLoader(key)
      return loaderFn({ getContext, setContext, params, refetch, additionalOptions })
    }
    const indexedParams = pickAll(indexByAll, params)
    if (!refetch) {
      const allCachedParams = getContext(view(paramsLens)) ||
        (setContext(set(paramsLens, emptyArr)) && emptyArr)

      if (find(whereEq(indexedParams), allCachedParams)) {
        // Return the cached data
        return getContext(pipe(
          view(dataLens),
          filter(whereEq(indexedParams)),
          items => dataMapper(items, params, loadFromContext),
        ))
      }
    }
    // if refetch = true or no cached params are found, fetch the items
    try {
      const fetchedItems = await dataFetchFn(params, loadFromContext)
      await setContext(pipe(
        // If we are reloading, we'll clean up the previous queried items first
        refetch ? over(dataLens, pipe(arrayIfNil, reject(whereEq(indexedParams)))) : identity,
        // Insert new items replacing possible duplicates (by uniqueIdentifier)
        over(dataLens, pipe(arrayIfNil, concat(fetchedItems), uniqWith(eqProps(uniqueIdentifier)))),
        // Update cachedParams so that we know this query has already been resolved
        over(paramsLens, append(indexedParams))
      ))
      if (onSuccess) {
        const parsedSuccessMesssage = ensureFunction(successMessage)(params)
        await onSuccess(parsedSuccessMesssage, params)
      }
      return dataMapper(fetchedItems, params, loadFromContext)
    } catch (err) {
      if (onError) {
        const parsedErrorMesssage = ensureFunction(errorMessage)(err, params)
        await onError(parsedErrorMesssage, err, params)
      }
      return emptyArr
    }
  }, {
    isPromise: true,
    isDeepEqual: true,
  })
  loaders = assoc(key, contextLoaderFn, loaders)
  return contextLoaderFn
}

export default createContextLoader
