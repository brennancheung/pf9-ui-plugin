import { pathOr } from 'ramda'
import { loadClusters } from 'k8s/components/infrastructure/actions'
import contextLoader from 'core/helpers/contextLoader'

// Returns a contextLoaded function contextualized by selected cluster (given by clusterId param)
const clusterContextLoader = (contextPath, loaderFn, options = {}) => {
  const {
    clusterIdKey = 'clusterId',
    filterMasterNodes,
    ...otherOptions
  } = options
  return contextLoader(contextPath, loaderFn, {
    ...otherOptions,
    indexBy: clusterIdKey,
    preload: {
      clusters: async args => {
        const clusters = await loadClusters(args)
        return filterMasterNodes ? clusters.filter(cluster => cluster.hasMasterNode) : clusters
      },
    },
    parseParams: ({ preloaded: { clusters }, params }) => {
      // Use first cluster by default if no cluster has been selected
      const clusterId = params[clusterIdKey] || params['clusterId'] || pathOr('__all__', [0, 'uuid'], clusters)
      return { ...params, [clusterIdKey]: clusterId }
    },
  })
}

export default clusterContextLoader