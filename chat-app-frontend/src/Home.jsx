import React,{useEffect, useState, useRef} from 'react';
import './App.css';
import { chkstatus,sendMessage,registertag,disconnect,eventEmitter } from './client_socket.js';
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
    const [IsCycleRunning,SetIsCycleRunning]=useState(false);
    const [convos,setConvos]=useState([]);
    const navigate = useNavigate();
    const isConnected = useRef(false);
    const activetagRef = useRef('');
    useEffect(() => {

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
                const r=await axios.get('http://localhost:3000/api/prevchats',{params:{tag:tag}});
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
                const response = await axios.post('http://localhost:3000/api/search', { tag: search_tag });
                
                // If success, display success message and any other data
                if (response.data.success) {
                    setUser(`${response.data.uname}`);
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
        const response=await axios.get('http://localhost:3000/api/retrieve',{params:{sender:tag,receiver:(userid)?userid:activetagRef.current}});
        console.log('Chat with user:',user,' tag:',userid);
        setMessages(response.data);
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
        try{
            //sends the message to the Socket server
            const response = await sendMessage({  message:message,to:activetagRef.current,from: tag,fromname:username});
            if(response.success){
                console.log('Message',message,'sent successfully');
            }
            try{
                //if successfully sent to server store it in db
                const time=setTimestamp(Date.now());
                const res=await axios.post('http://localhost:3000/api/store',
                    {
                        sender:tag,
                        receiver:(activetagRef.current)?activetagRef.current:Activetag,
                        content:message,
                        isread:true,
                        time:time
                    }
                );
                console.log(res.data);
            }catch(err){
                console.log("failed to store message");
            }
        }catch(err){
            console.log('Failed to send message:',err);
        }
        //display the message in the chat window
        setMessages((prevMessages)=>[...prevMessages,{id:Date.now(),text:message,isMine:true}]);
        console.log(messages);
        setMessage('');
    };

    //function to receive message from receiver
    const handleRecieveMessage=async (response)=>{
        console.log(response.from);
        console.log(Activetag);
        console.log(response.from===activetagRef.current);
        //if received message is from the receiver we are chatting to currently
        if(response.from===activetagRef.current){
            //display the message
            console.log('Received message:',response.txt);
            setMessages((prevMessages) => [...prevMessages,{id:Date.now(),text:response.txt,isMine:false}]);
        //when the message not from the receiver we are chatting to rn
        }else{
            //placement of the user name in the sidebar
            setConvos((prevConvos)=>{
                const updatedConvos=prevConvos.filter((convo)=>convo.userid !== response.from);
                updatedConvos.unshift({ username: response.fromname,userid:response.from }); // Add the user to the front
                return updatedConvos;
            });
            setUnreadMessages(prev =>({...prev,[response.from]:true}));
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
                        convos.map((convo)=>{
                            return(
                                <Conversation 
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
                            {messages.map((msg) => (
                               
                               <p className={`message ${msg.isMine ? 'from-me' : 'from-them'}`}>
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