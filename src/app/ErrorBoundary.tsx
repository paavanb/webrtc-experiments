import * as React from 'react'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return {hasError: true}
  }

  public state: ErrorBoundaryState = {
    hasError: false,
  }

  public render(): React.ReactNode {
    const {children} = this.props
    const {hasError} = this.state
    if (!hasError) return children
    return (
      <div>
        <h1>Oops</h1>
        <span>Something went wrong.</span>
      </div>
    )
  }
}
