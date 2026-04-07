"use client";
import { Component, type ReactNode } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  label?: string;
}

interface State {
  error: Error | null;
}

export class EditorErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error(`[EditorErrorBoundary:${this.props.label ?? "editor"}]`, error, info.componentStack);
  }

  override render() {
    if (this.state.error) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-[22px] border border-red-500/20 bg-red-500/[0.04] p-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[var(--text-secondary)]">
              {this.props.label ?? "Panel"} crashed
            </p>
            <p className="mt-1 text-[11px] text-[var(--fg-muted)]">
              {this.state.error.message}
            </p>
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="flex items-center gap-2 rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-3)] px-3 py-2 text-[11px] text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-4)] hover:text-[var(--text-primary)]"
          >
            <RefreshCw size={11} />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
