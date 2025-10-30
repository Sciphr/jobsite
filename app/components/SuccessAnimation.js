"use client";

import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";

export default function SuccessAnimation({ show, message = "Success!", onComplete }) {
  const [confettiPieces, setConfettiPieces] = useState([]);

  useEffect(() => {
    if (show) {
      // Generate confetti pieces
      const pieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        color: [
          "#3b82f6", // blue
          "#10b981", // green
          "#f59e0b", // yellow
          "#ef4444", // red
          "#8b5cf6", // purple
          "#06b6d4", // cyan
        ][Math.floor(Math.random() * 6)],
      }));
      setConfettiPieces(pieces);

      // Clean up after animation
      const timer = setTimeout(() => {
        setConfettiPieces([]);
        if (onComplete) onComplete();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <>
      {/* Confetti */}
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={{
            left: `${piece.left}%`,
            animationDelay: `${piece.delay}s`,
            background: piece.color,
          }}
        />
      ))}

      {/* Success Modal Overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] flex items-center justify-center animate-fadeIn">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 transform scale-0 animate-[scale_0.4s_ease-out_forwards]">
          {/* Animated Checkmark Circle */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              {/* Pulsing background */}
              <div className="absolute inset-0 bg-green-500 rounded-full success-pulse"></div>

              {/* Checkmark */}
              <div className="relative bg-green-500 rounded-full p-6 checkmark-animated">
                <svg
                  className="w-16 h-16 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    className="checkmark-path"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Success Message */}
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
            {message}
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400">
            Your application has been submitted successfully!
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes scale {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
