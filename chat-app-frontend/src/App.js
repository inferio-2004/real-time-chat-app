import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import Login from './Login';
import Home from './Home';
import './App.css';

function App() {
  return (
    <Router>
      {/* Passing username and tag as props to AppRoutes */}
      <AppRoutes />
    </Router>
  );
}

function AppRoutes() {
  const navigate = useNavigate();

  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (loggedInUser) {
      try {
        const user = JSON.parse(loggedInUser);
        //setUsername(user.name);
        //setTag(user.tag);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('user'); // Remove invalid data if parsing fails
      }
    } else {
      navigate('/'); // Redirect to Login if no user is logged in
    }
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<Login/>} />
      <Route path="/home" element={<Home/>} />
    </Routes>
  );
}

export default App;
