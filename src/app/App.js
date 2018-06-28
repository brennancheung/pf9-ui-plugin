import React from 'react'
import PropTypes from 'prop-types'
import {
  BrowserRouter as Router,
  Redirect,
  Route,
  Switch,
} from 'react-router-dom'
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core'
import Navbar from 'core/common/Navbar'
import './app.css'
import { setupFromConfig } from './util/registry'
import config from '../../config'

setupFromConfig(config)
window.process = process

class App extends React.Component {
  render () {
    const theme = createMuiTheme({
      palette: {
        type: this.props.theme,
        primary: {
          light: '#aee0ff',
          main: '#4aa3df',
          dark: '#1e699c',
          contrastText: '#fff',
        }
      }
    })

    const { pluginManager } = this.context
    const options = pluginManager.getOptions()
    const { showFooter } = options

    const renderFooter = () => (
      <div id="_main-footer">
        TODO: Footer
      </div>
    )

    return (
      <Router>
        <MuiThemeProvider theme={theme}>
          <div id="_main-container">
            <Navbar links={pluginManager.getNavItems()} >
              {pluginManager.getComponents().map((PluginComponent, idx) => <PluginComponent key={idx} />)}
              <Switch>
                {pluginManager.getRoutes().map(route => {
                  const { component, link } = route
                  const Component = component
                  return <Route key={route.name} path={link.path} exact={link.exact || false} component={Component} />
                })}
                <Redirect to={pluginManager.getDefaultRoute()} />
              </Switch>
              {showFooter && renderFooter()}
            </Navbar>
          </div>
        </MuiThemeProvider>
      </Router>
    )
  }
}

App.contextTypes = {
  pluginManager: PropTypes.object
}

export default App
