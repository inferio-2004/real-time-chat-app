import React,{useEffect, useState, useRef} from 'react';
import './App.css';
import { chkstatus,sendMessage,registertag,disconnect,eventEmitter,computeSharedSecret,decryptMessage,encryptMessage,generateECDHKeyPair } from './client_socket.js';
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import {
    MessageInput,
    ConversationHeader,
    Avatar,
    Conversation,
    Sidebar,
    ConversationList,
    Search,
    Status,
  } from "@chatscope/chat-ui-kit-react";
import styles from "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";

const Home = () => {
    const [username, setUsername] = useState(() => {
        const storedUser = localStorage.getItem('user');
        return storedUser ? JSON.parse(storedUser).name : '';
    });

    const [tag, setTag] = useState(() => {
        const storedUser = localStorage.getItem('user');
        return storedUser ? JSON.parse(storedUser).tag : '';
    });
    
    const [privateKey, setPrivateKey] = useState(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            // Try to get from user data first, then sessionStorage
            return user.privateKey || sessionStorage.getItem(`privateKey_${user.tag}`) || null;
        }
        return null;
    });
    
    // Function to regenerate keys if missing
    const regenerateKeysIfMissing = async () => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            console.log('No user data found, redirecting to login');
            navigate('/');
            return null;
        }
        
        const user = JSON.parse(storedUser);
        let currentPrivateKey = privateKey || user.privateKey || sessionStorage.getItem(`privateKey_${user.tag}`);
        
        if (!currentPrivateKey) {
            console.log('Private key missing, regenerating keys for session...');
            
            // Generate new key pair for this session
            const { privateKey: newPrivateKey, publicKey: newPublicKey } = generateECDHKeyPair();
            
            // Update the user's public key in the database
            try {
                const response = await axios.post(`${process.env.REACT_APP_API_BASE}/api/update-public-key`, {
                    tag: user.tag,
                    publicKey: newPublicKey
                });
                
                if (response.data.success) {
                    // Store the new private key in localStorage and sessionStorage
                    const updatedUser = { ...user, privateKey: newPrivateKey };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    sessionStorage.setItem(`privateKey_${user.tag}`, newPrivateKey);
                    setPrivateKey(newPrivateKey);
                    
                    console.log('Keys regenerated successfully. Note: Old messages cannot be decrypted.');
                    alert('Keys regenerated for security. You cannot decrypt old messages, but new messages will work.');
                    
                    return newPrivateKey;
                } else {
                    console.error('Failed to update public key in database');
                    return null;
                }
            } catch (error) {
                console.error('Error updating public key:', error);
                return null;
            }
        }
        
        return currentPrivateKey;
    };
    
    const [searchResult, setSearchResult] = useState(null); // Store search results with public key
    const [IsCycleRunning,SetIsCycleRunning]=useState(false);
    const [convos,setConvos]=useState([]);
    const navigate = useNavigate();
    const isConnected = useRef(false);
    const activetagRef = useRef('');
    useEffect(() => {
        console.log('Home useEffect - Current privateKey state:', privateKey);
        console.log('Home useEffect - LocalStorage user:', localStorage.getItem('user'));
        
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            console.log('Home useEffect - SessionStorage privateKey:', sessionStorage.getItem(`privateKey_${user.tag}`));
        }
        
        // Check if private key is missing and regenerate if needed
        const checkAndRegenerateKeys = async () => {
            if (!privateKey) {
                console.log('Private key missing, attempting to regenerate...');
                const newPrivateKey = await regenerateKeysIfMissing();
                if (!newPrivateKey) {
                    console.log('Failed to regenerate keys, redirecting to login');
                    navigate('/');
                    return;
                }
            }
        };
        
        checkAndRegenerateKeys();
        
        //connect to server on loggin in
        const connectToSocket = async () => {
            console.log('Connecting to socket server...');
            try {
                const connectionMessage = await registertag({ users: username, utag: tag });
                console.log('Connected to socket server:', connectionMessage.message);
            } catch (err) {
                console.error('Socket connection failed:', err);
            }
        };

        //retreiving prev chatted individuals in the sidebar of the home page
        const getContacts=async ()=>{
            console.log('getting previous chats');
            try{
                console.log(tag);
                const r=await axios.get(`${process.env.REACT_APP_API_BASE}/api/prevchats`,{params:{tag:tag}});
                console.log(r.data);
                setConvos(r.data);
            }catch(err){
                console.error('problem retreiving prev chats',err);
            }
        }

        // Check if already connected
        if (!isConnected.current) {
            connectToSocket();
            isConnected.current = true; // Mark as connected
        }

        console.log('the user tag is ',tag);
        console.log('now collecting prev chats');
        getContacts();

        //on receiving any message from server add to the chat window
        eventEmitter.on('message', (response) => {
            console.log('active tag:',activetagRef.current);
            handleRecieveMessage(response);
        });

        //on receiving any updates on the receiver's status(online/offline) update on the chat window
        eventEmitter.on('status_update',(response)=>{
            console.log('status update:',response);
            if(response.status==='offline'&&activetagRef.current===response.tag){
                if (!IsCycleRunning) {
                    SetIsCycleRunning(true); // Start the cycle
                    chkstatus({ sender: tag, receiver: activetagRef.current });
                }
            }else {
                SetIsCycleRunning(false); // Reset the cycle
            }        
            setStatus(response.status);
        });
        
        // Cleanup
        return () => {
            console.log("Cleaning up listener...");
            eventEmitter.removeListener('message', handleRecieveMessage);
        };
    
    }, []);
    
    // Update private key when sessionStorage changes (after login)
    useEffect(() => {
        const updatePrivateKey = () => {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                const key = sessionStorage.getItem(`privateKey_${user.tag}`);
                if (key && key !== privateKey) {
                    setPrivateKey(key);
                    console.log('Private key updated from sessionStorage');
                }
            }
        };

        // Check immediately
        updatePrivateKey();
        
        // Check periodically (in case sessionStorage is updated)
        const interval = setInterval(updatePrivateKey, 1000);
        
        return () => clearInterval(interval);
    }, [privateKey]);
    
    const [search_tag,setSearchTag]=useState('');
    const [Activetag,setActiveTag]=useState('');
    const [unreadMessages, setUnreadMessages] = useState({});
    const [user,setUser]=useState('');
    const [chat,setChat]=useState(false);
    const [message,setMessage]=useState('');
    const [messages,setMessages]=useState([]);
    const [display,setDisplay]=useState(false);
    const [status,setStatus]=useState('offline');

    //log out button function
    const handleBack=async ()=>{
        console.log('Logging out user...');
  
        // Call handleBeforeUnload to notify the server
        try {
          await disconnect({ users: username, utag: tag });
          console.log('Server notified about disconnection');
        } catch (err) {
          console.error('Failed to notify server about disconnection:', err);
        }
      
        // Clear user data from localStorage
        localStorage.removeItem('user');
        console.log('User data removed from localStorage');
      
        // Redirect to login
        navigate('/');
    };

    //searching a user 
    const handleSearch = async (e) => {
        if(e.key==='Enter'){
            setDisplay(true);
            e.preventDefault();
            try {
                const response = await axios.post(`${process.env.REACT_APP_API_BASE}/api/search`, { tag: search_tag });
                
                // If success, display success message and store result with public key
                if (response.data.success) {
                    setUser(`${response.data.uname}`);
                    // Store search result with public key for E2E encryption
                    setSearchResult({
                        username: response.data.uname,
                        tag: search_tag,
                        publicKey: response.data.publicKey
                    });
                    console.log('User found with public key:', response.data.publicKey ? 'Yes' : 'No');
                }
            } catch (err) {
                // Display the error message based on the response status
                console.log('Search failed:', err);
                if (err.response) {
                    // Server responded with a status other than 2xx
                    setUser(`Error: ${err.response.data.status}`);
                } else {
                    // Network error or no response from the server
                    setUser('Error: Network or Server not responding');
                }
                setSearchResult(null); // Clear search result on error
            }
        }
    };

    //reading a chat window on clicking a user to chat with
    const handleChat=async(userid,username)=>{
        setChat(true);
        setUser((username)?username:user);
        setActiveTag((userid)?userid:search_tag)
        if(unreadMessages[userid]){
            unreadMessages[userid]=false;
        }
        chkstatus({sender:tag,receiver:(userid)?userid:search_tag});
        
        try{
            // Ensure private key is available before attempting to decrypt messages
            let currentPrivateKey = privateKey;
            console.log('=== DECRYPTION DEBUGGING ===');
            console.log('Initial privateKey state:', privateKey);
            
            if (!currentPrivateKey) {
                console.log('Private key missing, attempting to regenerate...');
                currentPrivateKey = await regenerateKeysIfMissing();
                
                if (!currentPrivateKey) {
                    console.error('Failed to regenerate private key');
                    setMessages([]);
                    alert('Failed to restore encryption keys. Please log out and log in again.');
                    return;
                }
            }
            
            console.log('Final currentPrivateKey for decryption:', currentPrivateKey ? 'Present' : 'Missing');
            
            const response=await axios.get(`${process.env.REACT_APP_API_BASE}/api/retrieve`,{params:{sender:tag,receiver:(userid)?userid:activetagRef.current}});
            console.log('Chat with user:',user,' tag:',userid);
            console.log('Retrieved messages:', response.data);
            
            // Decrypt all retrieved messages
            const decryptedMessages = [];
            
            // Get the conversation partner's public key once
            let conversationPartnerKey = null;
            const conversationPartnerTag = userid || search_tag;
            
            try {
                const keyResponse = await axios.post(`${process.env.REACT_APP_API_BASE}/api/search`, {
                    tag: conversationPartnerTag
                });
                
                if (keyResponse.data.success && keyResponse.data.publicKey) {
                    conversationPartnerKey = keyResponse.data.publicKey;
                    console.log('Retrieved conversation partner public key for:', conversationPartnerTag);
                } else {
                    console.error('Failed to get conversation partner public key for:', conversationPartnerTag);
                }
            } catch (keyError) {
                console.error('Error fetching conversation partner key:', keyError);
            }
            
            if (!conversationPartnerKey) {
                console.error('Cannot decrypt messages - no public key for conversation partner');
                setMessages([]);
                return;
            }
            
            for (const msg of response.data) {
                try {
                    console.log('=== PROCESSING MESSAGE ===');
                    console.log('Raw message from DB:', msg);
                    console.log('Message content type:', typeof msg.content);
                    console.log('Message content value:', msg.content);
                    console.log('Content is null/undefined?', !msg.content || msg.content === null || msg.content === undefined);
                    
                    // Skip messages with no content (old/corrupted messages)
                    if (!msg.content || msg.content === null || msg.content === undefined) {
                        console.warn('Skipping message with no content:', msg);
                        decryptedMessages.push({
                            ...msg,
                            text: '[Message content missing - may be from before encryption was enabled]',
                            isMine: msg.sender === tag
                        });
                        continue;
                    }
                    
                    console.log('Computing shared secret with:', {
                        hasPrivateKey: !!currentPrivateKey,
                        hasPublicKey: !!conversationPartnerKey,
                        senderTag: tag,
                        receiverTag: conversationPartnerTag
                    });
                    
                    // Use the current private key (either from state or sessionStorage)
                    const sharedSecret = computeSharedSecret(currentPrivateKey, conversationPartnerKey, tag, conversationPartnerTag);
                    console.log('Shared secret computed:', sharedSecret ? 'Present' : 'Missing');
                    
                    if (sharedSecret) {
                        console.log('Attempting to decrypt message content:', msg.content);
                        const decryptedText = await decryptMessage(msg.content, sharedSecret);
                        console.log('Decryption successful:', decryptedText);
                        
                        decryptedMessages.push({
                            ...msg,
                            text: decryptedText,
                            isMine: msg.sender === tag
                        });
                        console.log('Successfully decrypted stored message');
                    } else {
                        console.error('Failed to compute shared secret for stored message');
                        decryptedMessages.push({
                            ...msg,
                            text: '[Could not decrypt message - shared secret failed]',
                            isMine: msg.sender === tag
                        });
                    }
                } catch (error) {
                    console.error('Error decrypting stored message:', error);
                    console.error('Failed message data:', msg);
                    decryptedMessages.push({
                        ...msg,
                        text: '[Decryption failed - corrupted message]',
                        isMine: msg.sender === tag
                    });
                }
            }
            
            setMessages(decryptedMessages);
        }catch(err){
            console.error('error:',err);
        }
        console.log('Chat with user:',user,' tag:',search_tag);
    };

    //activetagref holds the current value of activetag(the receiver's tag)
    useEffect(() => {
        if (Activetag) {
            console.log('Active tag updated:', Activetag);
            activetagRef.current = Activetag;
        }
    }, [Activetag]);

    //function to handle change of message typed in message input 
    const handleMessageChange=(e)=>{
        setMessage(e);
    };

    //getting timestamp of a message in form of date,time am/pm from date.now
    const setTimestamp=(timestamp)=>{
        const date = new Date(timestamp);
        const options = {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true // For 12-hour format
        };
        const formattedDate = new Intl.DateTimeFormat('en-Us', options).format(date);
        return formattedDate;
    };

    //function to handle sending a message
    const handleSendMessage=async ()=>{
        console.log('Sending message:',message);
        console.log('Current private key:', privateKey ? 'Present' : 'Missing');
        console.log('Active tag:', activetagRef.current);
        
        if (!privateKey) {
            console.error('Cannot send message: Private key not available');
            alert('Error: Private key not found. Please log in again.');
            return;
        }
        
        try{
            // Get receiver's public key from search result or fetch it
            let receiverPublicKey = searchResult?.publicKey;
            if (!receiverPublicKey) {
                console.log('Fetching receiver public key for:', activetagRef.current);
                // Fetch receiver's public key if not available
                const keyResponse = await axios.post(`${process.env.REACT_APP_API_BASE}/api/search`, {
                    tag: activetagRef.current
                });
                if (keyResponse.data.success) {
                    receiverPublicKey = keyResponse.data.publicKey;
                    console.log('Retrieved receiver public key:', receiverPublicKey ? 'Present' : 'Missing');
                }
            }
            
            if (!receiverPublicKey) {
                console.error('Cannot send message: Receiver public key not found');
                alert('Error: Cannot encrypt message for this user');
                return;
            }
            
            console.log('Computing shared secret with keys:', {
                hasPrivateKey: !!privateKey,
                hasPublicKey: !!receiverPublicKey,
                senderTag: tag,
                receiverTag: activetagRef.current
            });
            
            // Compute shared secret and encrypt message
            const sharedSecret = computeSharedSecret(privateKey, receiverPublicKey, tag, activetagRef.current);
            console.log('Shared secret computed:', sharedSecret ? 'Present' : 'Missing');
            
            if (!sharedSecret) {
                console.error('Cannot send message: Failed to compute shared secret');
                alert('Error: Failed to encrypt message');
                return;
            }
            
            const encryptedMessage = await encryptMessage(message, sharedSecret);
            
            //sends the encrypted message to the Socket server
            const response = await sendMessage({  
                encryptedMessage: encryptedMessage,
                to: activetagRef.current,
                from: tag,
                fromname: username
            });
            
            if(response.success){
                console.log('Message',message,'sent successfully');
                
                // Store the encrypted message in database
                try{
                    const time=setTimestamp(Date.now());
                    const res=await axios.post(`${process.env.REACT_APP_API_BASE}/api/store`,
                        {
                            sender:tag,
                            receiver:(activetagRef.current)?activetagRef.current:Activetag,
                            content:encryptedMessage, // Store encrypted content
                            isread:true,
                            time:time
                        }
                    );
                    console.log(res.data);
                }catch(err){
                    console.log("failed to store message");
                }
                
                //display the plaintext message in the chat window
                setMessages((prevMessages)=>[...prevMessages,{id:Date.now(),text:message,isMine:true}]);
                console.log(messages);
                setMessage('');
            }
        }catch(err){
            console.log('Failed to send message:',err);
        }
    };

    //function to receive message from receiver  
    const handleRecieveMessage=async (response)=>{
        console.log(response.from);
        console.log(Activetag);
        console.log(response.from===activetagRef.current);
        
        try {
            // Get sender's public key to decrypt message
            const senderKeyResponse = await axios.post(`${process.env.REACT_APP_API_BASE}/api/search`, {
                tag: response.from
            });
            
            if (senderKeyResponse.data.success && senderKeyResponse.data.publicKey) {
                // Compute shared secret and decrypt message
                const sharedSecret = computeSharedSecret(privateKey, senderKeyResponse.data.publicKey, tag, response.from);
                const decryptedMessage = await decryptMessage(response.txt, sharedSecret);
                
                console.log('Decrypted message:', decryptedMessage);
                
                //if received message is from the receiver we are chatting to currently
                if(response.from===activetagRef.current){
                    //display the decrypted message
                    setMessages((prevMessages) => [...prevMessages,{id:Date.now(),text:decryptedMessage,isMine:false}]);
                //when the message not from the receiver we are chatting to rn
                }else{
                    //placement of the user name in the sidebar
                    setConvos((prevConvos)=>{
                        const updatedConvos=prevConvos.filter((convo)=>convo.userid !== response.from);
                        updatedConvos.unshift({ username: response.fromname,userid:response.from }); // Add the user to the front
                        return updatedConvos;
                    });
                    // Mark as unread
                    setUnreadMessages((prev) => ({ ...prev, [response.from]: true }));
                }
            } else {
                console.error('Cannot decrypt message: Sender public key not found');
                // Display encrypted message as fallback
                if(response.from===activetagRef.current){
                    setMessages((prevMessages) => [...prevMessages,{id:Date.now(),text:'[Encrypted message - cannot decrypt]',isMine:false}]);
                }
            }
        } catch (error) {
            console.error('Error decrypting message:', error);
            // Display error message as fallback
            if(response.from===activetagRef.current){
                setMessages((prevMessages) => [...prevMessages,{id:Date.now(),text:'[Message decryption failed]',isMine:false}]);
            }
        }
    };
    
    return (
        <div className="home-container">
            <Sidebar position="left" scrollable={true} className='user-list'>
                <ConversationHeader>
                    <ConversationHeader.Back onClick={handleBack}/>
                    <Avatar
                        name={username}
                        src="https://www.pngall.com/wp-content/uploads/5/User-Profile-PNG.png"
                    />
                    <ConversationHeader.Content
                        info={`Tag: ${tag}`}
                        userName={username}
                    >
                    </ConversationHeader.Content>
                </ConversationHeader>
                        <Search
                            placeholder="Search tag" 
                            onChange={(e)=>setSearchTag(e)}
                            value={search_tag}
                            onClearClick={() =>{
                                setSearchTag("");
                                setDisplay(false);
                            }}
                            onKeyDown={handleSearch}
                            style={{marginTop:'10px'}}
                        >
                            
                        </Search>
                        {
                        
                        user&&display&& 
                        (<div>
                            <p>user found:</p>
                            <Conversation
                                name={user}
                                onClick={()=>{
                                    const userExists = convos.some((convo) => convo.username === user);
                                    if(!userExists){
                                        setConvos((prevConvos)=>[{username:user,userid:search_tag},...prevConvos])
                                    }
                                    handleChat(search_tag,user)
                                }}
                            >
                                <Avatar
                                name={user}
                                src="https://www.pngall.com/wp-content/uploads/5/User-Profile-PNG.png"
                                />
                            </Conversation>
                        </div>)
                        }
                <hr style={{border:'0',height:'1px',background:'#ccc',margin:"20px 0"}}/>
                <ConversationList>
                    <p>Your Chats:</p>
                    {
                        convos.map((convo, index)=>{
                            return(
                                <Conversation 
                                    key={convo.userid || index}
                                    name={convo.username}
                                    onClick={()=>{handleChat(convo.userid,convo.username)}}
                                    unreadDot={unreadMessages[convo.userid]}
                                >
                                    
                                    <Avatar
                                        name={convo.username}
                                        src="https://www.pngall.com/wp-content/uploads/5/User-Profile-PNG.png"
                                    />
                                    {unreadMessages[convo.userid] && (
                                        <Status status="available" />
                                    )}
                                </Conversation>
                            );
                        })
                    }
                </ConversationList>
            </Sidebar>
            {chat ? (
                <div className="text-area">
                    <ConversationHeader>
                        <ConversationHeader.Back />
                        <Avatar
                            name={user}
                            src="https://www.pngall.com/wp-content/uploads/5/User-Profile-PNG.png"
                        />
                        <ConversationHeader.Content
                            info={status}
                            userName={user}
                        />
                    </ConversationHeader>
                    <div className="chat-area">
                        <div className="chat-box">
                            {messages.map((msg, index) => (
                               
                               <p key={msg.id || index} className={`message ${msg.isMine ? 'from-me' : 'from-them'}`}>
                                {msg.text}
                                <span className="timestamp">{(msg.id)?setTimestamp(msg.id):msg.timestamp}</span>
                                </p>
                                
                            ))}
                        </div>
                        <MessageInput placeholder="Type a message" value={message} onChange={handleMessageChange} className='input-field-chat' onSend={handleSendMessage}/>
                        
                    </div>
                </div>
            ) : (
                <p className='select-user'>Select a user to start a conversation</p>
            )}
        </div>
    );
};
export default Home;