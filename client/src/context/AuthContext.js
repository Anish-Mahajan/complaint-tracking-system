// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      // Fetch user data from server
      axios.get('http://localhost:5000/user', {
        headers: {
          'x-auth-token': token
        }
      })
      .then(response => {
        setCurrentUser(response.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching user data:', err);
        localStorage.removeItem('token');
        setCurrentUser(null);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axios.post('http://localhost:5000/signin', { email, password });
      localStorage.setItem('token', response.data.token);
      setCurrentUser(response.data.user);
      setError('');
      return true;
    } catch (err) {
      setError(err.response?.data.msg || 'Login failed');
      return false;
    }
  };

  const signup = async (email, password) => {
    try {
      const response = await axios.post('http://localhost:5000/signup', { email, password });
      localStorage.setItem('token', response.data.token);
      // Fetch user data after signup
      const userResponse = await axios.get('http://localhost:5000/user', {
        headers: {
          'x-auth-token': response.data.token
        }
      });
      setCurrentUser(userResponse.data);
      setError('');
      return true;
    } catch (err) {
      setError(err.response?.data.msg || 'Signup failed');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
  };

  const isAdmin = () => {
    return currentUser?.role === 'admin';
  };

  const value = {
    currentUser,
    isAdmin,
    login,
    signup,
    logout,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
