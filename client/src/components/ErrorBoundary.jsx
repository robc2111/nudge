// src/components/ErrorBoundary.jsx
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] UI error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 text-center">
          <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
          <p className="text-gray-600">Please refresh the page.</p>
        </div>
      );
    }
    return this.props.children;
  }
}