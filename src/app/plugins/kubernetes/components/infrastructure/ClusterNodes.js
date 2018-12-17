import React from 'react'
import { withRouter } from 'react-router'
import { withAppContext } from 'core/AppContext'
import { compose } from 'ramda'
import { loadInfrastructure } from './actions'
import { withDataLoader } from 'core/DataLoader'
// This table essentially has the same functionality as the <NodesList>
// except that it is only the nodes from the a single cluster.
import { columns } from './NodesListPage'
import createListTableComponent from 'core/helpers/createListTableComponent'

const ListTable = createListTableComponent({
  title: 'Cluster Nodes',
  emptyText: 'No instances found.',
  name: 'ClusterNodes',
  uniqueIdentifier: 'uuid',
  columns,
})

const ClusterNodes = ({ context, data, match }) => {
  const cluster = data.find(x => x.uuid === match.params.id)
  const nodes = cluster.nodes.map(node => context.nodes.find(x => x.uuid === node.uuid))
  return <ListTable data={nodes} />
}

export default compose(
  withRouter,
  withAppContext,
  withDataLoader({ dataKey: 'clusters', loaderFn: loadInfrastructure }),
)(ClusterNodes)
