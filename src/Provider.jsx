import $$observable from 'symbol-observable'
import React, { Component } from 'react'
import Context from './Context'

export default class Provider extends Component {
  constructor(props) {
    super(props)
    const store = this.getInitStore()
    const reducer = props.reducer
    console.log('using reducer', reducer())
    this.mounted = false
    this.createStore = this.createStore.bind(this)
    this.state = {}
    this.state.store = this.createStore(reducer, props.preloadedState, props.enhancer)
    this.state.value = {
      ...this.state.value,
      getStore: () => this.state.store,
      state: this.state.state,
    }
    console.log('before', this.state.store.getState())
    this.state.value.dispatch({ type: '*' })
    console.log('after', this.state.store.getState())
  }

  componentDidMount() {
    this.mounted = true
  }

  componentWillUnmount() {
    this.mounted = false
  }

  createStore(reducer, preloadedState, enhancer) {
    if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
      enhancer = preloadedState
      preloadedState = undefined
    }

    this.state = {
      state: preloadedState,
      reducer,
      listeners: [],
      value: {
        state: preloadedState,
      }
    }
    this.state.store = this.getInitStore()
    this.state.value.dispatch = this.state.store.dispatch

    if (typeof enhancer !== 'undefined') {
      if (typeof enhancer !== 'function') {
        throw new Error('Expected the enhancer to be a function.')
      }

      return enhancer(this.createStore)(reducer, preloadedState)
    }

    if (typeof reducer !== 'function') {
      throw new Error('Expected the reducer to be a function.')
    }

    return this.state.store
  }

  getInitStore() {
    const mySubscribe = listener => {
      if (!this.mounted) {
        console.log('synchronous subscribe')
        this.state.listeners = [...this.state.listeners, listener ]
        return
      }
      console.log('async subscribe')
      this.setState(state => ({ listeners: [...state.listeners, listener ]}),
        state => () => {
          this.setState(state => {
            if (state.listeners.indexOf(listener) !== -1) {
              const listeners = state.listeners.splice(state.listeners.indexOf(listener), 1)
              return { listeners }
            }})
        })
    }
    const observable = () => ({
      subscribe(observer) {
        const observe = () => {
          if (observer.next) observer.next(this.state.state)
        }
        observe()
        const unsubscribe = mySubscribe(observe)
        return { unsubscribe }
      },

      [$$observable]() {
        return this
      }
    })
    return {
      getState: () => {
        console.log('getState', this.state.state)
        return this.state.state
      },
      dispatch: action => {
        if (!this.mounted) {
          console.log('synchronous dispatch', action)
          this.state.state = this.state.reducer(this.state.state, action)
          this.state.value.state = this.state.state
          this.state.listeners.forEach(listener => listener())
          return
        }
        console.log('async dispatch', action)
        this.setState(oldState => {
          const state = oldState.reducer(oldState.state, action)
          return { state, value: { ...oldState.value, state } }
        }, () => this.state.listeners.forEach(listener => listener()))
      },
      replaceReducer: reducer => {
        if (!this.mounted) {
          console.log('synchronous replaceReducer')
          this.state.reducer = reducer
        } else {
          console.log('async replaceReducer')
          this.setState({ reducer })
        }
      },
      subscribe: mySubscribe,
      [$$observable]: observable,
    }
  }

  render() {
    return (
      <Context.Provider value={this.state.value}>
        {this.props.children}
      </Context.Provider>
    )
  }
}