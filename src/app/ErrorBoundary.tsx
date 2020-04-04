import * as React from 'react'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  error: unknown
  errorInfo: unknown
  hasError: boolean
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return {hasError: true}
  }

  public state: ErrorBoundaryState = {
    error: null,
    errorInfo: null,
    hasError: false,
  }

  componentDidCatch = (error: unknown, errorInfo: unknown): void => {
    this.setState({error, errorInfo})
  }

  public render(): React.ReactNode {
    const {children} = this.props
    const {hasError, error, errorInfo} = this.state
    if (!hasError) return children
    return (
      <div>
        <h1>Oops</h1>
        <span>Something went wrong.</span>
        <div>{error && JSON.stringify(error)}</div>
        <div>{errorInfo && JSON.stringify(errorInfo, null, 2)}</div>
      </div>
    )
  }
}
