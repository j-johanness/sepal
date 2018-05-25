import asyncActionBuilder from 'async-action-builder'
import guid from 'guid'
import React from 'react'
import {connect as connectToRedux} from 'react-redux'
import {Subject} from 'rxjs'

let storeInstance = null
const storeInitListeners = []

export function initStore(store) {
    storeInstance = store
    storeInitListeners.forEach((listener) => listener(store))
}

export function subscribe(path, listener) {
    const subscribe = () => storeInstance.subscribe(() => listener(select(path)))
    if (storeInstance)
        subscribe()
    else
        storeInitListeners.push(subscribe)
}

export function state() {
    return storeInstance.getState() || {}
}

export function dispatch(action) {
    storeInstance.dispatch(action)
}

export function select(path) {
    if (typeof path === 'string')
        path = path.split('.')
    return path.reduce((state, part) => {
        return state != null && state[part] != null ? state[part] : undefined
    }, state())
}

export function connect(mapStateToProps) {
    mapStateToProps = mapStateToProps ? mapStateToProps : () => ({})
    return (WrappedComponent) => {
        let disabled = false
        const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component'
        WrappedComponent = connectToRedux(includeDispatchingProp(mapStateToProps))(WrappedComponent)
        WrappedComponent.prototype.shouldComponentUpdate = (nextProps, nextState) => {
            return !disabled
        }

        class ConnectedComponent extends React.Component {
            constructor(props) {
                super(props)
                this.id = `${displayName}:${guid()}`
                this.componentWillUnmount$ = new Subject()
                this.asyncActionBuilder = this.asyncActionBuilder.bind(this)
            }

            componentWillUnmount() {
                this.componentWillUnmount$.next()
                this.componentWillUnmount$.complete()
            }

            asyncActionBuilder(type, action$) {
                return asyncActionBuilder(type, action$, this)
            }

            render() {
                return (
                    <Disabled.Consumer>
                        {_disabled => {
                            disabled = _disabled
                            return React.createElement(WrappedComponent, {
                                ...this.props,
                                asyncActionBuilder: this.asyncActionBuilder,
                                componentId: this.id
                            })
                        }}
                    </Disabled.Consumer>
                )
            }
        }

        ConnectedComponent.displayName = `Store(${WrappedComponent.displayName})`
        return ConnectedComponent
    }
}

function includeDispatchingProp(mapStateToProps) {
    return (state, ownProps) => {
        const actions = state.actions || {}
        const componentActions = actions[ownProps.componentId] || {}
        const action = (type) => {
            const undispatched = !componentActions[type]
            const dispatching = componentActions[type] === 'DISPATCHING'
            const completed = componentActions[type] === 'COMPLETED'
            const failed = componentActions[type] === 'FAILED'
            const dispatched = completed || failed
            return {undispatched, dispatching, completed, failed, dispatched}
        }
        return {
            ...mapStateToProps(state, ownProps),
            action
        }
    }
}

export function dispatchable(action) {
    return {
        ...action,
        dispatch: () => dispatch(action)
    }
}

export const Disabled = React.createContext(false)
