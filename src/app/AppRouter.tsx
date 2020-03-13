import * as React from 'react'
import {Route, Switch} from 'react-router-dom'

import Homepage from './Homepage'
import Game from './Game'

export default function AppRouter(): JSX.Element {
  return (
    <Switch>
      {/* (g)ame */}
      <Route path="/g" component={Game} />
      <Route path="/" component={Homepage} exact />
    </Switch>
  )
}
