import React from "react";

class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("App error:", error, info);
  }

  render() {
    if (this.state.hasError) return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "sans-serif" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ marginBottom: 8 }}>Something went wrong</h2>
        <p style={{ color: "#64748b", marginBottom: 24 }}>Please try refreshing the page.</p>
        <button
          onClick={() => this.setState({ hasError: false })}
          style={{ padding: "10px 24px", background: "#22c55e", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}
        >
          Try again
        </button>
      </div>
    );
    return this.props.children;
  }
}

export default ErrorBoundary;