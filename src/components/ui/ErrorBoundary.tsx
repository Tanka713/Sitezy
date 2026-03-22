"use client";

import React from "react";
import { createAppError, logAppError, UI_BOUNDARY_001 } from "@/lib/errors";

interface Props {
  children: React.ReactNode;
  /** Custom fallback UI — receives the error and a reset function */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  /** Optional label for logging context (e.g. "EditorCanvas", "LeftSidebar") */
  context?: string;
  /** If true, show a minimal inline error chip instead of full panel */
  inline?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — catches render-time React errors and shows a safe fallback.
 *
 * Usage:
 *   <ErrorBoundary context="EditorCanvas">
 *     <PreviewCanvas />
 *   </ErrorBoundary>
 *
 * With custom fallback:
 *   <ErrorBoundary fallback={(err, reset) => <MyCustomFallback onReset={reset} />}>
 *     ...
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const appErr = createAppError({
      code: UI_BOUNDARY_001,
      devMessage: `[${this.props.context ?? "unknown"}] Render error: ${error.message}`,
      severity: "error",
      metadata: {
        context: this.props.context ?? "unknown",
        componentStack: info.componentStack ?? undefined,
      },
      cause: error,
    });
    logAppError(appErr);
  }

  reset(): void {
    this.setState({ hasError: false, error: null });
  }

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children;

    const { fallback, inline, context } = this.props;
    const { error } = this.state;

    if (fallback && error) return fallback(error, this.reset);

    if (inline) {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "2px 8px",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 4,
            color: "#f87171",
            fontSize: 11,
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          ⚠ {context ?? "Component"} error — refresh to retry
        </span>
      );
    }

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
          background: "rgba(239,68,68,0.05)",
          border: "1px solid rgba(239,68,68,0.15)",
          borderRadius: 12,
          textAlign: "center",
          gap: 12,
          minHeight: 120,
        }}
      >
        <div style={{ fontSize: 28 }}>⚠️</div>

        <div>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 600,
              color: "#f87171",
              marginBottom: 4,
            }}
          >
            Something went wrong
            {context ? ` in ${context}` : ""}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              color: "rgba(248,113,113,0.6)",
            }}
          >
            Ref: UI_BOUNDARY_001
          </p>
        </div>

        <button
          onClick={this.reset}
          style={{
            marginTop: 4,
            padding: "6px 16px",
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 6,
            color: "#f87171",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </div>
    );
  }
}

// ─── Functional convenience wrapper ──────────────────────────────────────────

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  context: string
): React.ComponentType<P> {
  function WrappedComponent(props: P) {
    return (
      <ErrorBoundary context={context}>
        <Component {...props} />
      </ErrorBoundary>
    );
  }
  WrappedComponent.displayName = `withErrorBoundary(${context})`;
  return WrappedComponent;
}
