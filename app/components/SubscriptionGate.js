'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SubscriptionGate({ children, requiredTier = 'enterprise' }) {
  const [tierCheck, setTierCheck] = useState({ loading: true, hasAccess: false });
  const router = useRouter();

  useEffect(() => {
    async function checkSubscriptionTier() {
      try {
        const response = await fetch('/api/subscription/check');
        const data = await response.json();

        if (response.ok) {
          const hasAccess = data.tier === requiredTier ||
                           (requiredTier === 'basic' && ['basic', 'enterprise'].includes(data.tier));

          setTierCheck({ loading: false, hasAccess });

          if (!hasAccess) {
            // Redirect to admin with upgrade prompt
            router.push(`/admin?upgrade=${requiredTier}`);
          }
        } else {
          console.error('Failed to check subscription tier:', data.error);
          setTierCheck({ loading: false, hasAccess: false });
          router.push(`/admin?upgrade=${requiredTier}`);
        }
      } catch (error) {
        console.error('Error checking subscription tier:', error);
        setTierCheck({ loading: false, hasAccess: false });
        router.push(`/admin?upgrade=${requiredTier}`);
      }
    }

    checkSubscriptionTier();
  }, [requiredTier, router]);

  if (tierCheck.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking subscription...</p>
        </div>
      </div>
    );
  }

  if (!tierCheck.hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Enterprise Feature
          </h1>
          <p className="text-gray-600">
            This feature requires an Enterprise subscription.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}