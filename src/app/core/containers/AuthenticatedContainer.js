import React, { useEffect, useState, useContext } from 'react'
import { makeStyles } from '@material-ui/styles'
import clsx from 'clsx'
import Intercom from 'core/components/integrations/Intercom'
import Navbar, { drawerWidth } from 'core/components/Navbar'
import Toolbar from 'core/components/Toolbar'
import useToggler from 'core/hooks/useToggler'
import { emptyObj, isNilOrEmpty, ensureArray } from 'utils/fp'
import { Switch, Redirect, Route } from 'react-router'
import moize from 'moize'
import { toPairs, apply } from 'ramda'
import { pathJoin } from 'utils/misc'
import DeveloperToolsEmbed from 'developer/components/DeveloperToolsEmbed'
import pluginManager from 'core/utils/pluginManager'
import { logoutUrl, dashboardUrl, helpUrl, ironicWizardUrl, clarityDashboardUrl } from 'app/constants'
import LogoutPage from 'core/public/LogoutPage'
import HelpPage from 'app/plugins/kubernetes/components/common/HelpPage'
import { AppContext } from 'core/providers/AppProvider'
import useReactRouter from 'use-react-router'
import ApiClient from 'api-client/ApiClient'

const { keystone } = ApiClient.getInstance()

const useStyles = makeStyles(theme => ({
  appFrame: {
    zIndex: 1,
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    width: '100%',
  },
  content: {
    marginTop: 55, // header height is hardcoded to 55px. account for that here.
    overflowX: 'auto',
    flexGrow: 1,
    // backgroundColor: props => (
    //   props.path === '/ui/kubernetes/dashboard'
    //     ? theme.palette.background.dashboard
    //     : theme.palette.background.default
    // )
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(3),
    paddingTop: theme.spacing(2),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  contentShift: {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  'contentShift-left': {
    marginLeft: 0,
  },
  'contentShift-right': {
    marginRight: 0,
  },
  drawerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: theme.spacing(0, 1),
    minHeight: theme.spacing(6),
  },
  contentMain: {
    paddingLeft: theme.spacing(2),
  }
}))

const renderPluginRoutes = role => (id, plugin) => {
  const defaultRoute = plugin.getDefaultRoute()
  const genericRoutes = [
    {
      link: { path: pathJoin(plugin.basePath, '') },
      // TODO: Implement 404 page
      render: () => <Redirect to={defaultRoute || '/ui/404'} />,
    },
  ]
  const filteredRoutes = plugin.getRoutes()
    .filter(({ requiredRoles }) =>
      isNilOrEmpty(requiredRoles) || ensureArray(requiredRoles).includes(role))

  return [...filteredRoutes, ...genericRoutes].map(route => {
    const { component: Component, render, link } = route
    return <Route
      key={link.path}
      path={link.path}
      exact={link.exact || false}
      render={render}
      component={Component} />
  })
}

const getSections = moize((plugins, role) =>
  toPairs(plugins)
    .map(([id, plugin]) => ({
      id,
      name: plugin.name,
      links: plugin.getNavItems()
        .filter(({ requiredRoles }) =>
          isNilOrEmpty(requiredRoles) || ensureArray(requiredRoles).includes(role)),
    })))

const renderPlugins = moize((plugins, role) =>
  toPairs(plugins).map(apply(renderPluginRoutes(role))).flat(),
)

const redirectToAppropriateStack = (ironicEnabled, kubernetesEnabled, history) => {
  // If it is neither ironic nor kubernetes, bump user to old UI
  // TODO: For production, I need to always bump user to old UI in both ironic
  // and standard openstack cases, but I don't want to do that yet for development.
  // In fact maybe just never do that for development build since old ui is not running.
  if (!ironicEnabled && !kubernetesEnabled) {
    window.location = clarityDashboardUrl
  } else if (ironicEnabled && history.location.pathname.includes('kubernetes')) {
    history.push(ironicWizardUrl)
  } else if (!ironicEnabled && history.location.pathname.includes('ironic')) {
    history.push(dashboardUrl)
  }
}

const loadRegionFeatures = async (setRegionFeatures, history) => {
  try {
    const features = await keystone.getFeatures()

    setRegionFeatures({
      kubernetes: features.experimental.containervisor,
      ironic: features.experimental.ironic,
      openstack: features.experimental.openstackEnabled,
      intercom: features.experimental.intercom,
    })

    redirectToAppropriateStack(features.experimental.ironic, features.experimental.containervisor, history)
  } catch (err) {
    console.error(err)
  }
}

const AuthenticatedContainer = () => {
  const [drawerOpen, toggleDrawer] = useToggler(true)
  const [regionFeatures, setRegionFeatures] = useState(emptyObj)
  const { userDetails: { role }, currentRegion } = useContext(AppContext)
  const { history } = useReactRouter()
  const classes = useStyles({ path: history.location.pathname })

  useEffect(() => {
    // Pass the `setRegionFeatures` function to update the features as we can't use `await` inside of a `useEffect`
    loadRegionFeatures(setRegionFeatures, history)
  }, [currentRegion])

  const withStackSlider = regionFeatures.openstack && regionFeatures.kubernetes
  // stack is the name of the plugin (ex. openstack, kubernetes, developer, theme)
  const stack = history.location.pathname.includes('openstack') ? 'openstack' : 'kubernetes'

  const plugins = pluginManager.getPlugins()
  const sections = getSections(plugins, role)
  const devEnabled = window.localStorage.enableDevPlugin === 'true'

  return (
    <>
      <div className={classes.appFrame}>
        <Toolbar />
        <Navbar
          withStackSlider={withStackSlider}
          drawerWidth={drawerWidth}
          sections={sections}
          open={drawerOpen}
          stack={stack}
          handleDrawerToggle={toggleDrawer} />
        <main className={clsx(classes.content, classes['content-left'], {
          [classes.contentShift]: drawerOpen,
          [classes['contentShift-left']]: drawerOpen,
        })}>
          <div className={classes.contentMain}>
            <Switch>
              {renderPlugins(plugins, role)}
              <Route path={helpUrl} component={HelpPage} />
              <Route path={logoutUrl} component={LogoutPage} />
              <Redirect to={dashboardUrl} />
            </Switch>
            {devEnabled && <DeveloperToolsEmbed />}
          </div>
        </main>
      </div>
      {regionFeatures.intercom && <Intercom />}
    </>
  )
}

export default AuthenticatedContainer
