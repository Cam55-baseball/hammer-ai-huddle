import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: (reset: () => void, error: Error) => ReactNode;
  label?: string;
}

interface State {
  error: Error | null;
}

/**
 * Route- or subtree-scoped error boundary. Converts render-time throws
 * (e.g. a malformed day's calendar data) into a recoverable inline panel
 * instead of unmounting the whole route.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Lineage-visible: surface the real stack to the console so we can
    // pinpoint the thrower without a guess-and-check loop.
    console.error(`[ErrorBoundary${this.props.label ? ` ${this.props.label}` : ""}]`, error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.reset, error);

    return (
      <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-sm space-y-3">
        <div className="flex items-center gap-2 text-destructive font-medium">
          <AlertTriangle className="h-4 w-4" />
          <span>Something went wrong here.</span>
        </div>
        <p className="text-muted-foreground text-xs">
          The rest of the app is fine — just this section couldn't render.
          {error.message ? ` (${error.message})` : ""}
        </p>
        <Button size="sm" variant="outline" onClick={this.reset}>
          Try again
        </Button>
      </div>
    );
  }
}

export default ErrorBoundary;
