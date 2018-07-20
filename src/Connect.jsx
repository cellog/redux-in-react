import React, { Component, PureComponent } from 'react'
import Context from './Context'
import shallowEqual from 'shallow-equal/objects'

export class ReduxInternal extends PureComponent {
  render() {
    const { ____component: Child, ...props } = this.props
    return (
      <Child {...props} />
    )
  }
}

export default function connect(mapStateToProps, mapDispatchToProps) {
  return WrappedComponent => {
    return class Connect extends Component {
      memoized = false
      memoizer = (() => {
        let lastProps, lastState, mergedProps, never = true
        return (props, state, dispatch) => {
          if (!never && lastState === state && shallowEqual(props, lastProps)) {
            return mergedProps
          }
          never = false
          const mSTP = mapStateToProps(state, props)
          const mDTP = mapDispatchToProps(dispatch, props)
          lastProps = props
          lastState = state
          mergedProps = { ...mSTP, ...mDTP }
          return mergedProps
        }
      })()


      render() {
        return (
          <Context.Consumer>
            {value => {
              const props = this.memoizer(this.props, value.state, value.dispatch)
              return (
                <ReduxInternal ____component={WrappedComponent} {...props} />
              )
            }}
          </Context.Consumer>
        )
      }
    }
  }
}