import React, { useState,useEffect } from "react"; 
import axios from 'axios';
import {useNavigate} from 'react-router-dom';
import { generateECDHKeyPair, getMasterKey } from './client_socket.js';
import { Buffer } from 'buffer';
import CryptoJS from 'crypto-js';
import { nanoid } from 'nanoid';
import './App.css'
const Login=()=>{
  useEffect(()=>{
    //for persistent log in of the user
    //retreive credentials from localStorage
    const loggedInUser = localStorage.getItem("user");
    if (loggedInUser) {
      try {
        // Parse the string back into an object
        const userData = JSON.parse(loggedInUser);
        console.log('Checking if user still exists in database:', userData.tag);
        
        // Verify user still exists in database before auto-login
        const verifyUserExists = async () => {
          try {
            const response = await axios.post(`${process.env.REACT_APP_API_BASE}/api/search`, { 
              tag: userData.tag 
            });
            
            if (response.data.success) {
              console.log('User verified, proceeding to home');
              setMessage('Login successful!');
              setStatus(true);
              navigate('/home');
            } else {
              console.log('User no longer exists in database, clearing localStorage');
              localStorage.removeItem('user');
              sessionStorage.clear();
              setMessage('Please log in again');
            }
          } catch (error) {
            console.error('Failed to verify user existence:', error);
            // If API call fails, clear localStorage to be safe
            localStorage.removeItem('user');
            sessionStorage.clear();
            setMessage('Please log in again');
          }
        };
        
        verifyUserExists();
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
  const [showPassword,setShowPassword]=useState(false);
  const navigate=useNavigate();
  
  //log in function
  const handleLogin = async (e) => {
      e.preventDefault();
      try {
        const response = await axios.post(`${process.env.REACT_APP_API_BASE}/api/login`, { email: Uemail,password: Upassword });
        if (response.data.success) {
          console.log('Login successful, decrypting private key...');
          
          let privateKey = null;
          
          // If we have encrypted private key and salt from server, decrypt it
          if (response.data.encryptedPrivateKey && response.data.salt) {
            console.log('Decrypting private key with password and salt');
            
            // Recreate master key from password + salt
            const { masterKey } = getMasterKey(Upassword, Buffer.from(response.data.salt, 'hex'));
            
            // Decrypt private key
            const decryptedBytes = CryptoJS.AES.decrypt(response.data.encryptedPrivateKey, masterKey.toString('hex'));
            privateKey = decryptedBytes.toString(CryptoJS.enc.Utf8);
            
            console.log('Private key decrypted successfully:', !!privateKey);
          } else {
            console.warn('No encrypted private key found - user may need to re-register');
          }
          
          // Store complete user data including decrypted private key
          const userData = {
            ...response.data,
            privateKey: privateKey
          };
          localStorage.setItem('user', JSON.stringify(userData));
          
          // Store in sessionStorage for this session
          if (privateKey) {
            sessionStorage.setItem(`privateKey_${response.data.tag}`, privateKey);
            console.log('Private key stored for session');
          }
          
          console.log('Login successful');
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
        console.log('Starting registration with proper key encryption...');
        
        // Generate ECDH key pair
        const { publicKey, privateKey } = generateECDHKeyPair();
        console.log('Generated ECDH key pair');
        
        // Generate random salt using nanoid (64 characters)
        const saltHex = nanoid(64);
        console.log('Generated random salt with nanoid:', saltHex.length, 'characters');
        
        // Create master key from password + salt
        const { masterKey } = getMasterKey(Upassword, Buffer.from(saltHex, 'hex'));
        console.log('Generated master key');
        
        // Encrypt private key with master key
        const encryptedPrivateKey = CryptoJS.AES.encrypt(privateKey, masterKey.toString('hex')).toString();
        console.log('Encrypted private key');
        
        // Send registration data to server
        const response = await axios.post(`${process.env.REACT_APP_API_BASE}/api/register`, {
          name: Uname,
          email: Uemail,
          password: Upassword,
          publicKey: publicKey,
          encryptedPrivateKey: encryptedPrivateKey,
          salt: saltHex
        });
        
        console.log('Registration response:', response.data);
        
        if (response.data.success && response.data.tag) {
          // Store user data with decrypted private key for this session
          const userData = {
            ...response.data,
            privateKey: privateKey // Store decrypted key for immediate use
          };
          localStorage.setItem('user', JSON.stringify(userData));
          
          // Also store in sessionStorage for immediate use
          sessionStorage.setItem(`privateKey_${response.data.tag}`, privateKey);
          
          console.log('Registration successful, keys stored');
          setMessage('Registration successful!');
          setStatus(true);
          navigate('/home');
        } else {
          console.error('Registration failed:', response.data);
          setMessage(response.data.status || 'Registration failed');
          setStatus(false);
        }
      } catch (err) {
        console.error('Registration error:', err);
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
                      <input type="text" placeholder="Email" className="input-field" value={Uemail} onChange={(e)=>setEmail(e.target.value)}/>
                      <div className="password-container">
                        <input 
                          type={showPassword ? "text" : "password"} 
                          placeholder="Password" 
                          className="input-field-password" 
                          value={Upassword} 
                          onChange={(e)=>setPassword(e.target.value)}
                        />
                        <button 
                          type="button" 
                          className="password-toggle" 
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? '🙈' : '👁️'}
                        </button>
                      </div>
                      <button type="submit" className="register-button" onClick={()=>setLoginStatus(false)}>No account! click here to register</button>
                      <button type="submit" className="login-button" onClick={handleLogin}>Login</button>
                  </form>
                  </div>
              ):(
                  <div className="register-form">
                  <h1>Register</h1>
                  <form>
                      <input type="text" placeholder="Name" className="input-field" value={Uname} onChange={(e)=>setName(e.target.value)}/>
                      <div className="password-container">
                        <input 
                          type={showPassword ? "text" : "password"} 
                          placeholder="Password" 
                          className="input-field-password" 
                          value={Upassword} 
                          onChange={(e)=>setPassword(e.target.value)}
                        />
                        <button 
                          type="button" 
                          className="password-toggle" 
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? '🙈' : '👁️'}
                        </button>
                      </div>
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