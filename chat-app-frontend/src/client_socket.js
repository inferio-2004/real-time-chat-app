//handles the client side socket
const EventEmitter = require('events');
const io = require('socket.io-client');
let socket;
let eventEmitter = new EventEmitter();
const handleSocket=(udata,action='connect')=>{
  //establish connection with the socket server
  if(action==='connect'){
    if(!socket||!socket.connected){
      socket= io('http://localhost:4000');
      return new Promise((resolve, reject) => {
          socket.on('socketId', (data) => {
            console.log('Socket connected');
            socket.emit('register', { username: udata.users, tag: udata.utag });
            resolve(data.id);
          });

          socket.on('registered', (data) => {
            console.log(data.message);
          });

          socket.on('error', (err) => {
            reject(new Error('Failed to connect to socket server'));
          });

          socket.on('status_update',(data)=>{
            eventEmitter.emit('status_update',data);
          });

          socket.on('receive_message', (data) => {
            console.log('Received message:', data.message, ' to:', data.utag, ' from:', data.from);
            socket.emit('mess-ack','message received: '+data.message);
            eventEmitter.emit('message', {txt:data.message,stag:data.utag,from:data.from,fromname:data.fromname});
          });
      
      });
    }

  //disconneceting with the socket server
  }else if(action==='disconnect'){
    if(socket||socket.connected){
      socket.emit('disconnection',{users:udata.users,utag:udata.utag});
      socket.disconnect();
      socket=null;
    }

  //sending message
  }else if(action==='message'){
    if(socket||socket.connected){
      console.log('Sending message:',udata.message,' to:',udata.to);
      socket.emit('message',{utag:udata.to,message:udata.message,from:udata.from,name:udata.fromname});
    }else{
      console.log('Socket not connected cannot send message');
    }
  
  //get status update of the receiver
  }else if(action==='status'){
    if(socket||socket.connected){
      socket.emit('get_status',udata);
    }
  }
  
};
//invokes status update call
const chkstatus=async(data)=>{
  try{
    console.log('getting status');
    await handleSocket(data,'status');
  }catch(err){
    console.error('err fetching status\n',err);
  }
};
//invokes sending message part 
const sendMessage = async (message) => {
  try{ 
    await handleSocket(message,'message');
    console.log('Message sent to',message.to);
    return { success: true, message: 'Message sent successfully' };
  }catch(err){
    console.error('Failed to send message:', err);
    console.log('Failed to send message to',message.utag);
    return { success: false, message: 'Failed to send message' };
  }
};
//invokes connection part 
const registertag=async (req)=>{
    try {
        // Try to establish the socket connection
        if(req.users && req.utag){
          const connectionMessage = await handleSocket(req);
          return { message: connectionMessage, status: 1 };
        }else{
          return {message:'cannot connect empty user or tag',status:0};
        }
      } catch (err) {
        console.error('Socket connection error:', err.message);
        return { message: 'Failed to establish socket connection', status: 0 };
      }
};
//invokes disconnection part
const disconnect=async (req)=>{
    try {
        console.log('Disconnecting socket');
        const connectionMessage =await handleSocket(req, 'disconnect');
        return { message: connectionMessage, status: 1 };
      } catch (err) {
        console.error('Failed to disconnect socket:', err);
        return { message: 'Failed to disconnect socket', status: 0 };
      }
};
module.exports={chkstatus,sendMessage,eventEmitter,disconnect,registertag};