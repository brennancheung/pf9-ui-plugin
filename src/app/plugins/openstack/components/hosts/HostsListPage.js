import React from 'react'
import { compose } from 'app/utils/fp'
import DataLoader from 'core/DataLoader'
import requiresAuthentication from '../../util/requiresAuthentication'
import HostsListContainer from './HostsListContainer'
import createContextLoader from 'core/helpers/createContextLoader'

const loadHosts = createContextLoader('hosts', async ({ context }) => {
  // const hosts = await context.apiClient.resmgr.getHosts()
  return context.apiClient.nova.getHypervisors()
})

const HostsListPage = () =>
  <DataLoader loaders={{ hosts: loadHosts }}>
    {({ data }) => <HostsListContainer hosts={data.hosts} />}
  </DataLoader>

export default compose(
  requiresAuthentication,
)(HostsListPage)
