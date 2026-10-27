import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: (reset: () => void, error: Error) => ReactNode;
  label?: string;
}

interface State {
  error: Error | null;
  dismissed?: boolean;
}

export function isChunkError(error: Error | null | undefined): boolean {
  if (!error) return false;
  return (
    error.name === 'ChunkLoadError' ||
    /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Loading chunk \d+ failed|Loading CSS chunk/i.test(
      error.message ?? '',
    )
  );
}

/**
 * Route- or subtree-scoped error boundary. A newer-build (chunk) failure
 * reloads automatically once per tab; after that it shows a small,
 * dismissible, non-blocking note instead of a blocking panel.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, dismissed: false };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? ` ${this.props.label}` : ""}]`, error, info);
    if (isChunkError(error)) {
      try {
        if (!sessionStorage.getItem('__eb_auto_reload_once')) {
          sessionStorage.setItem('__eb_auto_reload_once', '1');
          this.hardReload();
        }
      } catch { /* ignore */ }
    }
  }

  reset = () => this.setState({ error: null, dismissed: false });
  dismiss = () => this.setState({ dismissed: true });

  hardReload = () => {
    try {
      sessionStorage.removeItem('__chunk_reload_once');
    } catch { /* ignore */ }
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('_cb', Date.now().toString(36));
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
  };

  render() {
    const { error, dismissed } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.reset, error);

    if (isChunkError(error)) {
      if (dismissed) return null;
      return (
        <div role="status" className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs">
          <span className="flex-1 text-muted-foreground">A newer version is ready.</span>
          <Button size="sm" variant="outline" className="h-7" onClick={this.hardReload}>
            Reload
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Dismiss" onClick={this.dismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    return (
      <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-sm space-y-3">
        <div className="flex items-center gap-2 text-destructive font-medium">
          <AlertTriangle className="h-4 w-4" />
          <span>Something went wrong here.</span>
        </div>
        <p className="text-muted-foreground text-xs">
          {`The rest of the app is fine — just this section couldn't render.${error.message ? ` (${error.message})` : ''}`}
        </p>
        <Button size="sm" variant="outline" onClick={this.reset}>
          Try again
        </Button>
      </div>
    );
  }
}

export default ErrorBoundary;
