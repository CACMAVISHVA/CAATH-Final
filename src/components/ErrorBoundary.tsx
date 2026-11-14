import React, { Component, ReactNode } from 'react';
import { AlertTriangle, LifeBuoy, Loader2, RefreshCw } from 'lucide-react';
import { Logo } from './Logo';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReportError?: (error: Error, componentStack?: string) => Promise<void>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack?: string;
  reportState: 'idle' | 'sending' | 'sent' | 'failed';
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, reportState: 'idle' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, reportState: 'idle' };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('CAATH OS Error:', error, errorInfo);
    this.setState({ componentStack: errorInfo.componentStack || undefined });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, componentStack: undefined, reportState: 'idle' });
  };

  handleReport = async () => {
    if (!this.props.onReportError || !this.state.error || this.state.reportState === 'sending') return;
    this.setState({ reportState: 'sending' });
    try {
      await this.props.onReportError(this.state.error, this.state.componentStack);
      this.setState({ reportState: 'sent' });
    } catch {
      this.setState({ reportState: 'failed' });
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-matte-black flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-matte-black-light border border-slate-800 p-8 rounded-none shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Component Error</h2>
                <p className="text-xs text-slate-500">CAATH OS encountered an issue</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-6">
              {this.state.error?.message || 'An unexpected error occurred. The application will attempt to recover.'}
            </p>
            <button
              onClick={this.handleReset}
              className="w-full py-3 bg-gold text-matte-black font-bold hover:bg-gold-light flex items-center justify-center gap-2 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
            {this.props.onReportError && (
              <>
                <button
                  type="button"
                  onClick={this.handleReport}
                  disabled={this.state.reportState === 'sending' || this.state.reportState === 'sent'}
                  className="mt-3 flex w-full items-center justify-center gap-2 border border-gold/40 py-2 text-sm font-semibold text-gold transition-colors hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {this.state.reportState === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <LifeBuoy className="h-4 w-4" />}
                  {this.state.reportState === 'sent' ? 'Support ticket created' : 'Report to support'}
                </button>
                {this.state.reportState === 'failed' && <p className="mt-2 text-center text-xs text-red-400">Unable to create a support ticket. Please try again after reloading.</p>}
              </>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full mt-3 py-2 text-sm text-slate-400 hover:text-gold transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export class ModuleErrorBoundary extends Component<{ moduleName: string; children: ReactNode }> {
  render() {
    return (
      <ErrorBoundary>
        {this.props.children}
      </ErrorBoundary>
    );
  }
}
