import { Component } from "react";
import TheNode from "./components/TheNode_Newsletter";

class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          background: "#0A0A1A", minHeight: "100vh", display: "flex",
          alignItems: "center", justifyContent: "center", fontFamily: "'Share Tech Mono', monospace",
        }}>
          <div style={{
            background: "#1A0010", border: "1px solid #FF4466", padding: "40px",
            maxWidth: 500, textAlign: "center",
          }}>
            <div style={{ color: "#FF4466", fontSize: 18, marginBottom: 12 }}>Something went wrong</div>
            <div style={{ color: "#8888BB", fontSize: 12, marginBottom: 20 }}>{this.state.error.message}</div>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
              style={{
                background: "transparent", border: "2px solid #00E5FF", color: "#00E5FF",
                padding: "10px 28px", fontSize: 12, cursor: "pointer",
                fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.1em",
              }}
            >
              RELOAD
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <TheNode />
    </ErrorBoundary>
  );
}
