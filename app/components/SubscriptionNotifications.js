'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, X, Zap } from 'lucide-react';

export default function SubscriptionNotifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let eventSource;
    let reconnectTimer;

    const connect = () => {
      console.log('Attempting to connect to subscription notifications...');
      eventSource = new EventSource('/api/websocket');

      eventSource.onopen = () => {
        console.log('SSE connection opened successfully');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'tier_updated') {
            console.log('Received tier update notification:', data);

            const notification = {
              id: Date.now(),
              type: 'success',
              title: 'Subscription Updated',
              message: data.message,
              tier: data.tier,
              timestamp: data.timestamp
            };

            setNotifications(prev => [...prev, notification]);

            // Auto-remove notification after 5 seconds
            setTimeout(() => {
              setNotifications(prev => prev.filter(n => n.id !== notification.id));
            }, 5000);
          } else if (data.type === 'connected') {
            console.log('Connected to subscription notifications:', data.clientId);
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        console.log('Connection state:', eventSource.readyState);

        // Attempt to reconnect after 3 seconds if connection fails
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log('Connection closed, attempting to reconnect in 3 seconds...');
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm w-full"
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {notification.type === 'success' ? (
                  <div className={`p-2 rounded-full ${
                    notification.tier === 'enterprise'
                      ? 'bg-purple-100 dark:bg-purple-900'
                      : 'bg-blue-100 dark:bg-blue-900'
                  }`}>
                    <Zap className={`h-5 w-5 ${
                      notification.tier === 'enterprise'
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`} />
                  </div>
                ) : (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {notification.title}
                  </h4>
                  <button
                    onClick={() => removeNotification(notification.id)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {notification.message}
                </p>

                {notification.tier && (
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      notification.tier === 'enterprise'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      {notification.tier.charAt(0).toUpperCase() + notification.tier.slice(1)} Plan
                    </span>
                  </div>
                )}

                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>

            {/* Progress bar for auto-dismiss */}
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 5, ease: 'linear' }}
              className={`h-1 mt-3 rounded-full ${
                notification.tier === 'enterprise'
                  ? 'bg-purple-200 dark:bg-purple-700'
                  : 'bg-blue-200 dark:bg-blue-700'
              }`}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}