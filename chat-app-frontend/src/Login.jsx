import React, { useState,useEffect } from "react"; 
import axios from 'axios';
import {useNavigate} from 'react-router-dom';
import './App.css'
const Login=()=>{
  useEffect(()=>{
    //for persistent log in of the user
    //retreive credentials from localStorage
    const loggedInUser = localStorage.getItem("user");
    if (loggedInUser) {
      try {
        // Parse the string back into an object
        const response = JSON.parse(loggedInUser);
        setMessage('Login successful!');
        setStatus(true);
        navigate('/home');
      } catch (error) {
        console.error('Failed to parse user data:', error);
        localStorage.removeItem('user'); // Remove invalid data if parsing fails
      }
    }
  },[]);

  const [Uname,setName]=useState('');
  const [Uemail,setEmail]=useState('');
  const [Upassword,setPassword]=useState('');
  const [loginStatus,setLoginStatus]=useState(true);
  const [status,setStatus]=useState(false);
  const [message,setMessage]=useState('');
  const navigate=useNavigate();
  
  //log in function
  const handleLogin = async (e) => {
      e.preventDefault();
      try {
        const response = await axios.post('http://localhost:3000/api/login', { name: Uname,password: Upassword });
        if (response.data.success) {
          localStorage.setItem('user', JSON.stringify(response.data));
          console.log('Login successful:', response.data);
          setMessage('Login successful!');
          setStatus(true);
          navigate('/home');
        } 
      } catch (err) {
        console.error('Login failed:', err);
        setMessage('Login failed. Please try again.');
        setStatus(false);
      }
    };
    
    //registration func
    const handleReg = async (e) => {
      e.preventDefault();
      try {
        const response = await axios.post('http://localhost:3000/api/register', {
          name: Uname,
          email: Uemail,
          password: Upassword,
        });
        console.log('Registration response:', response.data);
        setMessage(response.data.status || 'User registered successfully');
        setLoginStatus(true);
        setStatus(true);
      } catch (err) {
        console.error('User registration failed:', err);
        setMessage('User registration failed. Please try again.');
        setStatus(false); 
      }
    };
          
  return (
      <div className="login-container">
          {loginStatus ? 
              (
                  <div className="login-form">
                  <h1>Login</h1>
                  <form>
                      <input type="text" placeholder="Name" className="input-field" value={Uname} onChange={(e)=>setName(e.target.value)}/>
                      <input type="password" placeholder="Password" className="input-field" value={Upassword} onChange={(e)=>setPassword(e.target.value)}/>
                      <button type="submit" className="register-button" onClick={()=>setLoginStatus(false)}>No account! click here to register</button>
                      <button type="submit" className="login-button" onClick={handleLogin}>Login</button>
                  </form>
                  </div>
              ):(
                  <div className="register-form">
                  <h1>Register</h1>
                  <form>
                      <input type="text" placeholder="Name" className="input-field" value={Uname} onChange={(e)=>setName(e.target.value)}/>
                      <input type="password" placeholder="Password" className="input-field" value={Upassword} onChange={(e)=>setPassword(e.target.value)}/>
                      <input type="email" placeholder="Email" className="input-field" value={Uemail} onChange={(e)=>setEmail(e.target.value)} />
                      <button type="submit" className="login-button" onClick={()=>setLoginStatus(true)}>Already have an account! click here to login</button>
                      <button type="submit" className="register-button" onClick={handleReg}>Register</button>
                  </form>
                  </div>
              )
          }
          <p style={{color:status?'green':'red'}}>{message}</p>
      </div>
  );
};
export default Login;    