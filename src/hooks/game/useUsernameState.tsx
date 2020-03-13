import createPersistedState from 'use-persisted-state'

const {NODE_ENV} = process.env

const useUsernameState = createPersistedState(
  'username',
  NODE_ENV === 'production' ? localStorage : sessionStorage
)

export default useUsernameState
