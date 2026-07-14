import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ 
  children, 
  requireRole = null,
  redirectTo = '/login',
  fallbackRedirect = '/'
}) => {
  const { isAuthenticated, loading, user } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Check if user is authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} />;
  }

  // Check for required role (e.g., 'admin')
  if (requireRole) {
    const hasRequiredRole = user?.role === requireRole;
    
    if (!hasRequiredRole) {
      // If user doesn't have required role, redirect to fallback
      return <Navigate to={fallbackRedirect} />;
    }
  }

  // ✅ Allow access
  return children;
};

export default PrivateRoute;