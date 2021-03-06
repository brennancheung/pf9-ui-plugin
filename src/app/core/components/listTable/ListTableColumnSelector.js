import React from 'react'
import PropTypes from 'prop-types'
import { Popover, Tooltip } from '@material-ui/core'
import { withStyles } from '@material-ui/styles'
import grey from '@material-ui/core/colors/grey'
import { compose } from 'ramda'
import ListTableColumnPopover from 'core/components/listTable/ListTableColumnPopover'
import clsx from 'clsx'

const styles = theme => ({
  root: {
    color: 'inherit',
    outline: 'none',
    padding: theme.spacing(2),
  },
  button: {
    cursor: 'pointer',
    fontWeight: 300,
  },
  clearIcon: {
    '&:hover': {
      color: grey[800],
    },
    '&:active': {
      color: grey[200],
    },
  },
})

class ListTableColumnSelector extends React.PureComponent {
  inputRef = React.createRef()

  state = {
    open: false,
    anchorEl: null,
  }

  handleClick = event => {
    this.setState({
      open: true,
      anchorEl: event.currentTarget,
    })
  }

  handleClose = () => {
    this.setState({
      open: false,
      anchorEl: null,
    })
  }

  render () {
    const { classes, columns, visibleColumns, onColumnToggle } = this.props
    const { open, anchorEl } = this.state

    return <React.Fragment>
      <Tooltip title="Select Columns">
        <i className={clsx(classes.button, 'fas fa-fw fa-lg fa-cog')}
          aria-owns={open ? 'simple-popper' : undefined}
          aria-label="Select Columns"
          aria-haspopup="true"
          onClick={this.handleClick}
        />
      </Tooltip>
      <Popover
        open={open}
        onClose={this.handleClose}
        anchorEl={anchorEl}
        ref={this.inputRef}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}>
        <ListTableColumnPopover
          columns={columns}
          visibleColumns={visibleColumns}
          onColumnToggle={onColumnToggle} />
      </Popover>
    </React.Fragment>
  }
}

ListTableColumnSelector.propTypes = {
  columns: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string,
    display: PropTypes.bool,
    excluded: PropTypes.bool,
  })).isRequired,
  visibleColumns: PropTypes.array,
  onColumnToggle: PropTypes.func,
}

export default compose(withStyles(styles))(ListTableColumnSelector)
