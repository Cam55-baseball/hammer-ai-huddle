import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private isDynamicImportError = (): boolean => {
    const errorMessage = this.state.error?.message || '';
    return (
      errorMessage.includes('Failed to fetch dynamically imported module') ||
      errorMessage.includes('Loading chunk') ||
      errorMessage.includes('Loading CSS chunk')
    );
  };

  private handleRetry = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const isDynamicImport = this.isDynamicImportError();

      return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
          <Card className="p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">{isDynamicImport ? '🔄' : '⚠️'}</div>
            <h1 className="text-2xl font-bold mb-2">
              {isDynamicImport ? 'Connection Issue' : 'Oops! Something went wrong'}
            </h1>
            <p className="text-muted-foreground mb-6">
              {isDynamicImport
                ? 'The page failed to load. This is usually temporary. Click retry to reload.'
                : "We encountered an unexpected error. Don't worry, your data is safe."}
            </p>
            {this.state.error && !isDynamicImport && (
              <div className="bg-muted p-4 rounded-lg mb-6 text-left">
                <p className="text-sm font-mono text-muted-foreground break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex flex-col gap-3">
              {isDynamicImport && (
                <Button onClick={this.handleRetry} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              )}
              <Button 
                onClick={this.handleReset} 
                variant={isDynamicImport ? "outline" : "default"}
                className="w-full"
              >
                Return to Home
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
