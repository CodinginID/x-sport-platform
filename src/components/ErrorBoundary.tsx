import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <AlertTriangle className="mx-auto h-12 w-12 text-zen-brand" />
          <h1 className="text-xl font-semibold text-zen-brand">Terjadi Kesalahan</h1>
          <p className="text-sm text-gray-600">{this.state.error?.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 rounded-xl bg-zen-brand text-white text-sm hover:opacity-90"
          >
            Muat Ulang
          </button>
        </div>
      </div>
    );
  }
}
