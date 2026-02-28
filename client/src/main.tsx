import { createRoot } from "react-dom/client";
import { Component, type ErrorInfo, type ReactNode } from "react";
import App from "./App";
import "./index.css";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error.message, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "2rem", textAlign: "center", fontFamily: "system-ui" }}>
          <h2>Something went wrong</h2>
          <p style={{ color: "#666", margin: "1rem 0" }}>{this.state.error?.message}</p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{ padding: "0.5rem 1rem", cursor: "pointer", borderRadius: "6px", border: "1px solid #ccc" }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

window.onerror = (message, source, lineno, colno, error) => {
  if (error instanceof Error) {
    console.warn("[window.onerror]", error.message, error.stack);
  } else {
    console.warn("[window.onerror] non-Error:", typeof error, message, source, lineno, colno);
  }
  return true;
};

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  if (reason instanceof Error) {
    console.warn("[unhandled-rejection]", reason.message, reason.stack);
  } else {
    console.warn("[unhandled-rejection] non-Error:", typeof reason, JSON.stringify(reason));
  }
  event.preventDefault();
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
