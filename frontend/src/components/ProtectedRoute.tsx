import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

type ProtectedRouteProps = {
  children: React.ReactNode;
  requiredRole?: 'student' | 'teacher' | 'college';
};

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-black text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don't have permission to access this page</p>
          <a
            href={user?.role === 'teacher' ? '/teacher' : user?.role === 'college' ? '/src/pages/admin/clg-admin/clg-admin.html' : '/dashboard'}
            className="inline-block px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
