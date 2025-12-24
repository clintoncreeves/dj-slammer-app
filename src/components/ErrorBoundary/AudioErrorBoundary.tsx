import { Component, ErrorInfo, ReactNode } from 'react';
import './AudioErrorBoundary.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class AudioErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details to console for debugging
    console.error('Audio Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Component Stack:', errorInfo.componentStack);

    // Update state with error info
    this.setState({
      errorInfo,
    });
  }

  handleReset = (): void => {
    // Reset the error boundary state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="audio-error-boundary">
          <div className="audio-error-boundary__container">
            <div className="audio-error-boundary__content">
              {/* Error Icon */}
              <div className="audio-error-boundary__icon">
                <svg
                  width="80"
                  height="80"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M12 8V12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle cx="12" cy="16" r="1" fill="currentColor" />
                </svg>
              </div>

              {/* Error Message */}
              <h1 className="audio-error-boundary__title">Oops! Audio Trouble!</h1>
              <p className="audio-error-boundary__message">
                Something went wrong with the music player. Don't worry, we can fix it!
              </p>

              {/* Technical Details (collapsed by default, for debugging) */}
              {this.state.error && (
                <details className="audio-error-boundary__details">
                  <summary className="audio-error-boundary__details-summary">
                    Technical Info (for grown-ups)
                  </summary>
                  <pre className="audio-error-boundary__error-text">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              {/* Action Buttons */}
              <div className="audio-error-boundary__actions">
                <button
                  className="audio-error-boundary__button audio-error-boundary__button--primary"
                  onClick={this.handleReset}
                >
                  <span className="audio-error-boundary__button-icon">🔄</span>
                  Try Again
                </button>
                <button
                  className="audio-error-boundary__button audio-error-boundary__button--secondary"
                  onClick={() => window.location.reload()}
                >
                  <span className="audio-error-boundary__button-icon">🏠</span>
                  Restart App
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
