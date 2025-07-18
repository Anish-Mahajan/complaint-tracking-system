import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ComplaintTracker = () => {
  const [complaints, setComplaints] = useState([]);
  const [newComplaint, setNewComplaint] = useState({
    description: '',
    location: '',
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();

  // Fetch complaints with optional filters
  const fetchComplaints = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/complaints', {
        params: { search: searchTerm, status: statusFilter },
      });
      console.log('Fetched complaints:', response.data);
      setComplaints(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      setError('Failed to load complaints. Please try again later.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [searchTerm, statusFilter]);

  // Handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Image size must be less than 5MB');
        return;
      }
      
      if (!file.type.match(/image\/(jpeg|jpg|png|gif)/)) {
        setError('Only image files (jpg, jpeg, png, gif) are allowed');
        return;
      }
      
      setImage(file);
      
      // Create image preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      setError('');
    }
  };

  // Remove selected image
  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  // Submit new complaint
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      setError('Please sign in to submit a complaint');
      navigate('/signin');
      return;
    }
    
    if (!newComplaint.description || !newComplaint.location) {
      setError('Please fill in all required fields');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('description', newComplaint.description);
      formData.append('location', newComplaint.location);
      if (image) {
        formData.append('image', image);
      }
      
      const token = localStorage.getItem('token');
      
      await axios.post('http://localhost:5000/complaints', formData, {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setNewComplaint({ description: '', location: '' });
      setImage(null);
      setImagePreview(null);
      setSubmitSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
      
      fetchComplaints();
      setIsLoading(false);
    } catch (error) {
      console.error('Error submitting complaint:', error);
      if (error.response?.status === 401) {
        setError('Your session has expired. Please sign in again.');
        localStorage.removeItem('token');
        navigate('/signin');
      } else {
        setError('Failed to submit complaint. Please try again.');
      }
      setIsLoading(false);
    }
  };

  // Upvote a complaint
  const upvoteComplaint = async (id) => {
    if (!currentUser) {
      setError('Please sign in to upvote');
      navigate('/signin');
      return;
    }
    
    try {
      await axios.patch(`http://localhost:5000/complaints/${id}/upvote`, {}, {
        headers: {
          'x-auth-token': localStorage.getItem('token'),
        },
      });
      fetchComplaints();
    } catch (error) {
      console.error('Error upvoting complaint:', error);
      if (error.response?.status === 401) {
        setError('Your session has expired. Please sign in again.');
        localStorage.removeItem('token');
        navigate('/signin');
      } else {
        setError('Failed to upvote. Please try again.');
      }
    }
  };

  // Update status of a complaint
  const updateStatus = async (id, status) => {
    if (!currentUser) {
      setError('Please sign in to update status');
      navigate('/signin');
      return;
    }
    
    try {
      await axios.patch(`http://localhost:5000/complaints/${id}/status`, { status }, {
        headers: {
          'x-auth-token': localStorage.getItem('token'),
        },
      });
      fetchComplaints();
    } catch (error) {
      console.error('Error updating status:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        if (error.response?.status === 403) {
          setError('You do not have permission to perform this action');
        } else {
          setError('Your session has expired. Please sign in again.');
          localStorage.removeItem('token');
          navigate('/signin');
        }
      } else {
        setError('Failed to update status. Please try again.');
      }
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="complaint-tracker">
      <h2>Community Issue Reporter</h2>
      <p className="subtitle">Help improve your community by reporting and tracking local issues</p>
      
      {error && <div className="error-message">{error}</div>}
      {submitSuccess && <div className="success-message">Complaint submitted successfully!</div>}
      
      {/* Submission form */}
      <div className="complaint-form-container">
        <h3>Report a New Issue</h3>
        <form onSubmit={handleSubmit} className="complaint-form">
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              placeholder="Describe the issue..."
              value={newComplaint.description}
              onChange={(e) => setNewComplaint({ ...newComplaint, description: e.target.value })}
              required
              rows="3"
            />
          </div>
          <div className="form-group">
            <label htmlFor="location">Location</label>
            <input
              id="location"
              type="text"
              placeholder="Address or location name"
              value={newComplaint.location}
              onChange={(e) => setNewComplaint({ ...newComplaint, location: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="image">Image Evidence (Optional)</label>
            <input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="file-input"
            />
            <small>Max size: 5MB. Allowed formats: jpg, jpeg, png, gif</small>
            
            {imagePreview && (
              <div className="image-preview-container">
                <img src={imagePreview} alt="Preview" className="image-preview" />
                <button 
                  type="button" 
                  onClick={removeImage} 
                  className="remove-image-btn"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Submitting...' : 'Submit Report'}
          </button>
        </form>
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="status-filter">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Display complaints */}
      <div className="complaints-list">
        {isLoading ? (
          <p>Loading reports...</p>
        ) : complaints.length === 0 ? (
          <p>No issues reported yet. Be the first to submit one!</p>
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
              
              {/* Updated image display to use imageUrl from server */}
              {complaint.imageUrl && (
                <div className="complaint-image-container">
                  <img 
                    src={complaint.imageUrl} 
                    alt="Complaint Evidence" 
                    className="complaint-image"
                    onClick={() => window.open(complaint.imageUrl, '_blank')}
                  />
                  <div className="image-caption">Click to enlarge</div>
                </div>
              )}
              
              <div className="complaint-footer">
                <div className="upvotes">
                  <button onClick={() => upvoteComplaint(complaint._id)} className="upvote-button">
                    ⬆️ Upvote
                  </button>
                  <span className="upvote-count">{complaint.upvotes}</span>
                </div>
                <div className="status-actions">
                  {currentUser && (
                    <>
                      <button 
                        onClick={() => updateStatus(complaint._id, 'In Progress')}
                        className="status-button in-progress"
                        disabled={complaint.status === 'In Progress'}
                      >
                        Mark In Progress
                      </button>
                      {isAdmin() && (
                        <button 
                          onClick={() => updateStatus(complaint._id, 'Resolved')}
                          className="status-button resolved"
                          disabled={complaint.status === 'Resolved'}
                        >
                          Mark Resolved
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ComplaintTracker;
