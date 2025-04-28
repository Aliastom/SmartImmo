import React from 'react';
import ImpotsTabsPremium from './components/ImpotsTabsPremium';

export default function ImpotsPremiumPage() {
  return (
    <div className="flex justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-100">
      <div className="w-full max-w-screen-2xl p-0 md:p-8">
        <ImpotsTabsPremium />
      </div>
    </div>
  );
}
