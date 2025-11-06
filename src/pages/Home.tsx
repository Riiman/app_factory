import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button.tsx';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-gray-900">Welcome to VentureX</h1>
        <p className="mt-4 text-lg text-gray-600">Your AI-powered co-founder for startup success.</p>
        <div className="mt-8 space-x-4">
          <Button asChild>
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/signup">Sign Up</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
