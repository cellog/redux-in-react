import $$observable from 'symbol-observable'
import React, { Component } from 'react'
import Context from './Context'

let id = 0

const idMaker = () => {
  return ++id
}


export default class Provider extends Component {
  constructor(props) {
    super(props)
    this.state = {}
    const reducer = props.reducer
    this.mounted = false
    this.createStore = this.createStore.bind(this)
    const store = this.createStore(reducer, props.preloadedState, props.enhancer)
    console.log('initial state', this.state)
    this.myid = store.id
    console.log('after createStore', this.myid)
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

    if (typeof enhancer !== 'undefined') {
      if (typeof enhancer !== 'function') {
        throw new Error('Expected the enhancer to be a function.')
      }

      console.log('calling enhancer')
      const store = enhancer(this.createStore)(reducer, preloadedState)
      console.log('creating state (enhancer)')
      const myid = store.id
      this.state = {
        ...this.state,
        ['store' + myid]: store,
        ['value' + myid]: {
          ...this.state['value' + myid],
          dispatch: store.dispatch,
        }
      }
      return store
    }

    const myid = idMaker()
    console.log('calling regular', myid, reducer(undefined, { type: '*' }))
    const store = this.getInitStore(myid)
    const dispatch = store.dispatch

    console.log('creating state')
    this.state = {
      ...this.state,
      ['reducer' + myid]: reducer,
      ['store' + myid]: store,
      ['listeners' + myid]: [],
      ['value' + myid]: {
        dispatch: store.dispatch,
        getStore: () => this.state['store' + myid],
        state: preloadedState,
      }
    }

    if (typeof reducer !== 'function') {
      throw new Error('Expected the reducer to be a function.')
    }

    console.log('before', store.getState(), this.state)
    dispatch({ type: '@@INIT' })
    console.log('after', store.getState(), this.state)

    return store
  }

  getInitStore(id) {
    const mySubscribe = listener => {
      if (!this.mounted) {
        console.log('synchronous subscribe', listener)
        this.state[`listeners${id}`] = [...this.state[`listeners${id}`], listener ]
        return
      }
      console.log('async subscribe', listener)
      this.setState(state => ({ [`listeners${id}`]: [...state[`listeners${id}`], listener ]}))
      return () =>
        this.setState(state => {
          console.log('unsubscribe', listener)
          if (state[`listeners${id}`].indexOf(listener) !== -1) {
            const listeners = state[`listeners${id}`].splice(state[`listeners${id}`].indexOf(listener), 1)
            return { [`listeners${id}`]: listeners }
          }})
    }
    const observable = () => ({
      subscribe(observer) {
        const observe = () => {
          if (observer.next) observer.next(this.state[`value${id}`].state)
        }
        observe()
        const unsubscribe = mySubscribe(observe)
        return { unsubscribe }
      },

      [$$observable]() {
        return this
      }
    })
    const dispatch = action => {
      if (!this.mounted) {
        console.log('synchronous dispatch', action, this.state[`value${id}`].state)
        this.state[`value${id}`].state = this.state[`reducer${id}`](this.state[`value${id}`].state, action)
        console.log('setting:', this.state[`value${id}`].state)
        this.state[`listeners${id}`].forEach(listener => listener())
        return
      }
      console.log('async dispatch', action)
      this.setState(oldState => {
        const state = oldState[`reducer${id}`](oldState[`value${id}`].state, action)
        console.log('setting:', state)
        return { [`value${id}`]: { ...oldState[`value${id}`], state } }
      }, () => {
        console.log('updating listeners', this.state)
        this.state[`listeners${id}`].forEach(listener => listener())
      })
    }
    return {
      getState: () => {
        console.log('getState', this.state[`value${id}`].state)
        return this.state[`value${id}`].state
      },
      dispatch,
      replaceReducer: reducer => {
        if (!this.mounted) {
          console.log('synchronous replaceReducer')
          this.state[`reducer${id}`] = reducer
          dispatch({ type: '@@REPLACE' })
        } else {
          console.log('async replaceReducer')
          this.setState({ [`reducer${id}`]: reducer }, () => dispatch({ type: '@@REPLACE' }))
        }
      },
      subscribe: mySubscribe,
      [$$observable]: observable,
      id
    }
  }

  render() {
    return (
      <Context.Provider value={this.state[`value${this.myid}`]}>
        {this.props.children}
      </Context.Provider>
    )
  }
}