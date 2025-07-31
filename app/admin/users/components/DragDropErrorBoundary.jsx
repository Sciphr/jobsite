"use client";

import React from "react";
import { AlertCircle } from "lucide-react";

class DragDropErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('Drag and drop error caught:', error, errorInfo);
    
    // Check if it's the specific @hello-pangea/dnd error
    if (error.message && error.message.includes('provided.innerRef has not been provided with a HTMLElement')) {
      console.log('Switching to fallback mode due to drag-and-drop compatibility issue');
      this.props.onError?.();
    }
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">
                Drag & Drop Not Available
              </h4>
              <p className="text-sm text-yellow-700 mt-1">
                The drag-and-drop interface encountered a compatibility issue. Switching to simple interactive mode.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DragDropErrorBoundary;