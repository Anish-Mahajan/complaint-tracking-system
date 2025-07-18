import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import ComplaintTracker from './components/ComplaintTracker';
import AdminDashboard from './components/AdminDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import './App.css';

// Protected route component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { currentUser, isAdmin } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/signin" />;
  }
  
  if (adminOnly && !isAdmin()) {
    return <Navigate to="/" />;
  }
  
  return children;
};

const AppContent = () => {
  const { currentUser, logout, isAdmin } = useAuth();
  
  return (
    <div className="App">
      <nav>
        <div className="nav-links">
          <Link to="/">Home</Link>
          {currentUser && isAdmin() && (
            <Link to="/admin">Admin Dashboard</Link>
          )}
        </div>
        <div className="auth-links">
          {!currentUser ? (
            <>
              <Link to="/signin">Sign In</Link>
              <Link to="/signup">Sign Up</Link>
            </>
          ) : (
            <div className="user-menu">
              <span className="user-email">
                {currentUser.email}
                {isAdmin() && <span className="admin-badge">Admin</span>}
              </span>
              <button onClick={logout} className="logout-button">
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<ComplaintTracker />} />
        <Route 
          path="/signin" 
          element={currentUser ? <Navigate to="/" /> : <SignIn />} 
        />
        <Route 
          path="/signup" 
          element={currentUser ? <Navigate to="/" /> : <SignUp />} 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute adminOnly={true}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
