import React from 'react'
import PropTypes from 'prop-types'
import Grid from './Grid'
import { compose } from 'ramda'
import { withAppContext } from 'core/AppContext'
import parseMouseEvent from '../parseMouseEvent'
import PieMenu, { Slice } from 'react-pie-menu'

export const CanvasContext = React.createContext({})
const Provider = CanvasContext.Provider
const Consumer = CanvasContext.Consumer

class SVGCanvas extends React.Component {
  canvasRef = React.createRef()
  state = {
    dragging: false,
    canvasOffsetX: 0,
    canvasOffsetY: 0,
    scale: 1.0,
    zoom: 1.25,
    setCanvasContext: (...args) => {
      // If the `setState` async callback is not passed in default to
      // return a Promise.
      return new Promise((resolve, reject) => {
        if (args.length > 1) {
          // The Promise will never resolve when a callback is passed
          // but that's ok, because we are using the callback not an await.
          return this.setState(...args)
        }
        setImmediate(() => { window.context = this.state })
        this.setState(...args, resolve)
      })
    },
  }

  getNumbers = e => {
    const { width, height } = this.props
    const { canvasOffsetX, canvasOffsetY, scale, zoom } = this.state

    // The absolute x, y pixel offset from the top left of the canvas area
    const rect = this.canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Bottom right of the canvas in the canvas's own units (mm)
    const canvasRight = width / scale + canvasOffsetX
    const canvasBottom = height / scale + canvasOffsetY

    // Dimensions of the canvas in canvas units (not pixels)
    const canvasRangeX = canvasRight - canvasOffsetX
    const canvasRangeY = canvasBottom - canvasOffsetY

    // the normalized offset (0.0 to 1.0) of how far in the cursor is in the canvas area
    const normOffsetX= x / width
    const normOffsetY = y / height

    // The cartesian coordinates of where the cursor is on the canvas (accounting for zoom and pan)
    const canvasX = canvasOffsetX + normOffsetX * canvasRangeX
    const canvasY = canvasOffsetY + normOffsetY * canvasRangeY

    const vars = { width, height, x, y, canvasRight, canvasBottom, canvasX, canvasY, canvasOffsetX, canvasOffsetY, scale, zoom, normOffsetX, normOffsetY }
    return vars
  }

  handleWheel = e => {
    const { canvasX, canvasY, scale, zoom, normOffsetX, normOffsetY, width, height } = this.getNumbers(e)
    if (e.deltaY === 0) { return } // We're only concerned with vertical scroll wheel events
    const zoomIn = e.deltaY > 0
    const newScale = zoomIn ? scale * zoom : scale / zoom
    const newRangeX = width / newScale
    const newRangeY = height / newScale
    const canvasOffsetX = canvasX - newRangeX * normOffsetX
    const canvasOffsetY = canvasY - newRangeY * normOffsetY
    this.setState({ scale: newScale, canvasOffsetX, canvasOffsetY })
  }

  handleMouseMove = e => {
    const { canvasOffsetX, canvasOffsetY, canvasX, canvasY } = this.getNumbers(e)
    if (this.state.dragging) {
      const dx = canvasX - this.startX
      const dy = canvasY - this.startY
      this.setState({
        canvasOffsetX: canvasOffsetX - dx,
        canvasOffsetY: canvasOffsetY - dy
      })
    }
  }

  handleMouseDown = e => {
    const { selectedTool } = this.props
    const { buttons } = parseMouseEvent(e)
    if (buttons.middle) {
      this.startPan(e)
    }
    if (buttons.left) {
      if (selectedTool === 'move') {
        this.startPan(e)
      }
    }
  }

  handleMouseUp = e => {
    const { buttons } = parseMouseEvent(e)
    if (!buttons.middle) {
      this.setState({ dragging: false })
    }
  }

  handleContextMenu = e => {
    const { canvasX, canvasY } = this.getNumbers(e)
    this.setState({
      contextCenter: { x: canvasX, y: canvasY },
      showContext: true,
    })
    console.log('handleContextMenu', canvasX, canvasY)
    e.preventDefault()
    e.stopPropagation()
  }

  maybeRenderContextMenu = () => {
    const { contextCenter, showContext, scale } = this.state
    if (!showContext) { return null }

    const { x, y } = contextCenter

    const close = () => this.setState({ showContext: false })

    const addNode = props => {
      this.props.onAddNode(props)
      close()
    }

    const radius = 140

    return (
      <foreignObject x={x*scale-radius} y={y*scale - radius} transform={`scale(${1/scale})`}>
        <PieMenu radius={`${radius}px`} centerRadius="30px" centerX={0} centerY={0}>
          <Slice onSelect={() => addNode({ type: 'activity', x, y })}>Activity</Slice>
          <Slice onSelect={close}>End node</Slice>
          <Slice onSelect={close}>Descision node</Slice>
          <Slice onSelect={close}>Cancel</Slice>
        </PieMenu>
      </foreignObject>
    )
  }

  startPan = (e) => {
    // Start panning operation
    const { canvasX, canvasY } = this.getNumbers(e)
    this.startX = canvasX
    this.startY = canvasY
    this.setState({ dragging: true })
  }

  render () {
    const { children, cursor, width, height } = this.props
    const { canvasOffsetX, canvasOffsetY, scale } = this.state
    const vbWidth = width / scale
    const vbHeight = height / scale

    return (
      <React.Fragment>
        <svg
          ref={this.canvasRef}
          width={width}
          height={height}
          style={{ border: '1px solid #000', cursor }}
          onMouseDown={this.handleMouseDown}
          onMouseUp={this.handleMouseUp}
          onWheel={this.handleWheel}
          onMouseMove={this.handleMouseMove}
          onContextMenu={this.handleContextMenu}
          viewBox={[canvasOffsetX, canvasOffsetY, vbWidth, vbHeight].join(' ')}
        >
          <Grid minorTick={10} majorTick={50} width={width} height={height} />
          <Provider value={this.state}>
            {children}
          </Provider>
          {this.maybeRenderContextMenu()}
        </svg>
      </React.Fragment>
    )
  }
}

export const withCanvasContext = Component => props =>
  <Consumer>
    {
      ({ setCanvasContext, ...rest }) =>
        <Component
          {...props}
          setCanvasContext={setCanvasContext}
          canvasContext={rest}
        />
    }
  </Consumer>

SVGCanvas.propTypes = {
  children: PropTypes.node.isRequired,
  width: PropTypes.number,
  height: PropTypes.number,
  onAddNode: PropTypes.func.isRequired,
}

SVGCanvas.defaultProps = {
  width: 600,
  height: 600,
}

export default compose(
  withAppContext,
)(SVGCanvas)