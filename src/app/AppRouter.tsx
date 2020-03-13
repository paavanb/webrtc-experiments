import * as React from 'react'
import {Route, Switch} from 'react-router-dom'

import Homepage from './Homepage'
import Server from './WebTorrents/Server'

export default function AppRouter(): JSX.Element {
  return (
    <Switch>
      {/* (g)ame */}
      <Route path="/g" component={Server} />
      <Route path="/" component={Homepage} exact />
    </Switch>
  )
}
