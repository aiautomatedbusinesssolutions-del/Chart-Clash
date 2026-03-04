"use client";

import { Component } from "react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-dvh flex flex-col items-center justify-center p-4">
          <Card className="max-w-sm w-full text-center space-y-4 p-6">
            <h1 className="text-xl font-bold text-slate-100">
              Something went wrong
            </h1>
            <p className="text-sm text-slate-400">
              An unexpected error occurred. Try refreshing the page.
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                this.setState({ hasError: false });
                window.location.href = "/";
              }}
              className="w-full"
            >
              Back to Home
            </Button>
          </Card>
        </main>
      );
    }

    return this.props.children;
  }
}
