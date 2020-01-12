import * as React from 'react'
import {Route, Switch} from 'react-router-dom'

import Homepage from './Homepage'

export default function AppRouter(): JSX.Element {
  return (
    <Switch>
      <Route path="/" component={Homepage} exact />
    </Switch>
  )
}
