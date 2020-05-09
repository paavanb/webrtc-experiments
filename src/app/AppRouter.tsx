import * as React from 'react'
import {Route, Switch} from 'react-router-dom'

import Homepage from './Homepage'
import CardsAgainstHumanity from './CardsAgainstHumanity'

export default function AppRouter(): JSX.Element {
  return (
    <Switch>
      {/* (g)ame */}
      <Route path="/g" component={CardsAgainstHumanity} />
      <Route path="/" component={Homepage} exact />
    </Switch>
  )
}
