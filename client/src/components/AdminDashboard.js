// src/components/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { isAdmin, currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('complaints');
  const [newAdminEmail, setNewAdminEmail] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = { 'x-auth-token': token };

        // Fetch complaints
        const complaintRes = await axios.get('http://localhost:5000/complaints', { headers });
        setComplaints(complaintRes.data);

        // Fetch users if admin
        if (isAdmin()) {
          const userRes = await axios.get('http://localhost:5000/admin/users', { headers });
          setUsers(userRes.data);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again later.');
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin]);

  // Redirect non-admin users
  if (!isAdmin()) {
    return <Navigate to="/" />;
  }

  const handleDeleteComplaint = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/admin/complaints/${id}`, {
        headers: { 'x-auth-token': token }
      });

      setComplaints(complaints.filter((complaint) => complaint._id !== id));
    } catch (err) {
      console.error('Error deleting complaint:', err);
      setError('Failed to delete complaint. Please try again.');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `http://localhost:5000/complaints/${id}/status`,
        { status },
        { headers: { 'x-auth-token': token } }
      );

      setComplaints(
        complaints.map((complaint) =>
          complaint._id === id ? response.data : complaint
        )
      );
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status. Please try again.');
    }
  };

  const handleUpdateUserRole = async (id, role) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `http://localhost:5000/admin/users/${id}/role`,
        { role },
        { headers: { 'x-auth-token': token } }
      );

      setUsers(
        users.map((user) => (user._id === id ? response.data : user))
      );
    } catch (err) {
      console.error('Error updating user role:', err);
      setError('Failed to update user role. Please try again.');
    }
  };

  const handlePromoteAdmin = async (e) => {
    e.preventDefault();
    const email = newAdminEmail.trim();

    if (!email) {
      setError('Please enter an email address');
      return;
    }

    try {
      const user = users.find((u) => u.email === email);
      if (!user) {
        setError('User not found');
        return;
      }

      await handleUpdateUserRole(user._id, 'admin');
      setNewAdminEmail('');
      setError('');
    } catch (err) {
      console.error('Error promoting user:', err);
      setError('Failed to promote user to admin. Please try again.');
    }
  };

  if (loading) return <div className="loading">Loading admin dashboard...</div>;

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="admin-dashboard">
      <h2>Admin Dashboard</h2>
      {error && <div className="error-message">{error}</div>}

      <div className="admin-tabs">
        <button
          className={`tab-button ${activeTab === 'complaints' ? 'active' : ''}`}
          onClick={() => setActiveTab('complaints')}
        >
          Complaints Management
        </button>
        <button
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          User Management
        </button>
      </div>

      {activeTab === 'complaints' && (
        <div className="complaints-management">
          <h3>All Complaints ({complaints.length})</h3>
          <div className="complaints-list admin-view">
            {complaints.length === 0 ? (
              <p>No complaints found.</p>
            ) : (
              complaints.map((complaint) => (
                <div
                  key={complaint._id}
                  className={`complaint-card ${complaint.status.toLowerCase().replace(' ', '-')}`}
                >
                  <div className="complaint-header">
                    <span className={`status-badge ${complaint.status.toLowerCase().replace(' ', '-')}`}>
                      {complaint.status}
                    </span>
                    <span className="complaint-date">{formatDate(complaint.createdAt)}</span>
                  </div>
                  <h3 className="complaint-description">{complaint.description}</h3>
                  <p className="complaint-location">📍 {complaint.location}</p>
                  <p className="complaint-user">
                    <strong>Submitted by:</strong> {complaint.user?.email || 'Unknown user'}
                  </p>
                  
                  {complaint.image && (
                    <div className="complaint-image-container">
                      <img 
                        src={`http://localhost:5000/${complaint.image}`} 
                        alt="Complaint Evidence" 
                        className="complaint-image"
                        onClick={() => window.open(`http://localhost:5000/${complaint.image}`, '_blank')}
                      />
                    </div>
                  )}
                  
                  <div className="complaint-footer admin-actions">
                    <div className="upvotes">
                      👍 <span className="upvote-count">{complaint.upvotes}</span>
                    </div>
                    <div className="status-actions">
                      <button
                        onClick={() => handleUpdateStatus(complaint._id, 'Pending')}
                        className="status-button pending"
                        disabled={complaint.status === 'Pending'}
                      >
                        Pending
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(complaint._id, 'In Progress')}
                        className="status-button in-progress"
                        disabled={complaint.status === 'In Progress'}
                      >
                        In Progress
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(complaint._id, 'Resolved')}
                        className="status-button resolved"
                        disabled={complaint.status === 'Resolved'}
                      >
                        Resolved
                      </button>
                      <button
                        onClick={() => handleDeleteComplaint(complaint._id)}
                        className="delete-button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="users-management">
          <h3>User Management ({users.length})</h3>

          <div className="promote-admin-form">
            <h4>Promote User to Admin</h4>
            <form onSubmit={handlePromoteAdmin}>
              <div className="form-group">
                <input
                  type="email"
                  placeholder="User email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  required
                />
                <button type="submit">Promote to Admin</button>
              </div>
            </form>
          </div>

          <div className="users-list">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      {user._id !== currentUser?._id && (
                        <button
                          onClick={() =>
                            handleUpdateUserRole(
                              user._id,
                              user.role === 'admin' ? 'user' : 'admin'
                            )
                          }
                          className={user.role === 'admin' ? 'demote-button' : 'promote-button'}
                        >
                          {user.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
