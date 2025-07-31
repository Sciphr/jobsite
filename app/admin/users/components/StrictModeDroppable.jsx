"use client";

import { useEffect, useState } from "react";
import { Droppable } from "@hello-pangea/dnd";

// StrictMode-compatible Droppable wrapper
export default function StrictModeDroppable({ children, ...props }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Use a timeout instead of requestAnimationFrame for better compatibility
    const timer = setTimeout(() => setEnabled(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!enabled) {
    return (
      <div className="p-2 min-h-[200px] bg-gray-50 rounded">
        <div className="flex items-center justify-center h-full text-gray-400">
          Loading...
        </div>
      </div>
    );
  }

  return <Droppable {...props}>{children}</Droppable>;
}