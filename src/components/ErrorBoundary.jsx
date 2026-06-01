import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error("Dashboard Component Crash:", error, errorInfo)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '16px', background: '#fef2f2', border: '1px solid #fca5a5', 
          borderRadius: '8px', color: '#991b1b', marginTop: '16px' 
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>Component Error</h3>
          <p style={{ margin: 0, fontSize: '13px' }}>Failed to render this section due to missing or malformed data.</p>
        </div>
      )
    }
    return this.props.children
  }
}