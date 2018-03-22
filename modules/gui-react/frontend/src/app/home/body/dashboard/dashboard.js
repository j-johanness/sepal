import React from 'react'

export default class Dashboard extends React.Component {
    componentWillMount() {
        console.log('Dashboard: componentWillMount')
    }

    componentWillUnmount() {
        console.log('Dashboard: componentWillUnmount')
    }

    render() {
        return (
            <div style={{background: 'green'}}>
                <h1>Dashboard</h1>
                <input id='dash' autoFocus={true}/>
            </div>
        )
    }
}