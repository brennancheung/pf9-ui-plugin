import React from 'react'
import { connect } from 'react-redux'

import FlavorsList from './FlavorsList'

const mapStateToProps = state => {
  const { flavors } = state.openstack
  return {
    flavors: flavors.flavors,
  }
}

@connect(mapStateToProps)
class FlavorsListContainer extends React.Component {
  handleAdd = () => {
    // TODO
    console.log('TODO: handle adding a new flavor')
  }

  render () {
    const { flavors } = this.props

    return (
      <FlavorsList flavors={flavors} onAdd={this.handleAdd} />
    )
  }
}

export default FlavorsListContainer