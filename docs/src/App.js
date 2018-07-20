import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import { Provider, Connect } from 'redux-in-react'
import { applyMiddleware, compose } from 'redux';
import createSagaMiddleware from 'redux-saga';

const sagaMiddleware = createSagaMiddleware()
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose

function Stuff({ stuff, click }) {
  return (
    <button onClick={click}>{stuff}</button>
  )
}

const DoStuff = Connect(state => ({ stuff: state.stuff }), dispatch => ({ click: () => dispatch({ type: 'wow', payload: 'foo' })}))(Stuff)

class App extends Component {
  render() {
    return (
      <Provider reducer={(state = { stuff: 'hi' }, action) => {console.log('reducer', state, action); return state }}
      enhancer={compose(applyMiddleware(sagaMiddleware))}>
        <div className="App">
          <header className="App-header">
            <img src={logo} className="App-logo" alt="logo" />
            <h1 className="App-title">Welcome to React</h1>
          </header>
          <p className="App-intro">
            To get started, edit <code>src/App.js</code> and save to reload.
            <DoStuff />
          </p>
        </div>
      </Provider>
    );
  }
}

export default App;
