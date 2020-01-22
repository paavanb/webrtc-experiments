import * as React from 'react'
import {Route, Switch} from 'react-router-dom'

import Homepage from './Homepage'
import Server from './WebTorrents/Server'
import Client from './WebTorrents/Client'

export default function AppRouter(): JSX.Element {
  return (
    <Switch>
      <Route path="/server" component={Server} />
      <Route path="/" component={Homepage} exact />
    </Switch>
  )
}
