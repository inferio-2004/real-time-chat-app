//handles the socket server

//creates the server
const io = require('socket.io')(4000, {
    cors: {
        origin: "*", // Frontend URL
    },
});
//redis server to store all the online users
const redis=require('@redis/client');
const RedisClient=redis.createClient(
    {
        url: 'redis://localhost:6379'
    }
);
RedisClient.on('error',function (err){ 
    console.error(err);
});
RedisClient.on('connect',function(){
    console.log('Connected to Redis');
});
//establishing redis server
RedisClient.connect();
//to store a set of users who wants the reciver's status(online/offline) with key as receiver's tag
let activeChatsKey = 'activeChats';
io.on('connection',socket=>{
    console.log('A user connected');
    socket.emit('socketId', { id: socket.id });
    socket.on('register',async (data)=>{
        try {
                // Ensure the Redis client is connected before using it
                console.log('Registering user:',data);
                
                if(data.tag && data){
                    socket.tag=data.tag;
                    socket.users=data.username;
                    await RedisClient.set(data.tag, socket.id);
                    socket.emit('registered', { status: 1, message: 'User registered successfully' });
                    //retreiving set of users who want the user's status
                    const pendingRequests = await RedisClient.sMembers(`status_requests:${data.tag}`);
            
                    if (pendingRequests.length > 0) {
                        // Notify all users who were waiting for the status of this user (u2)
                        pendingRequests.forEach(async (requesterSocketId) => {
                            const requesterSocket = await io.sockets.sockets.get(requesterSocketId);
                            if (requesterSocket) {
                                // Send the online status to the requester
                                requesterSocket.emit('status_update', { tag: data.tag, status: 'online' });
                                // Add both users (u2 and u1) to each other's active chats
                                await RedisClient.sAdd(`${activeChatsKey}:${data.tag}`, requesterSocketId);
                                await RedisClient.sAdd(`${activeChatsKey}:${requesterSocketId}`, data.tag);
                            
                            }
                        });
                    }
                
                }else{
                    socket.emit('registered', { status: 0, message: 'User registration failed' });
                }
        } catch (err) {
            console.error('Error setting data in Redis:', err);
            socket.emit('registered', { status: 0, message: 'Error registering user' });
        }
    });
    //giving the status
    socket.on('get_status',async (data)=>{
        try{
            let uid=data.sender;
            let otherUser=data.receiver;
            const target_socketId=await RedisClient.get(data.receiver);
            if(target_socketId){
                console.log('user inquired is online');
                try{
                    await RedisClient.sAdd(`${activeChatsKey}:${uid}`, otherUser);
                    await RedisClient.sAdd(`${activeChatsKey}:${otherUser}`, uid);
                    socket.emit('status_update',{tag:data.receiver,status:'online'});
                }catch(err){
                    console.log('error storing active chat in redis');
                    console.log(err);
                }
            }else{
                console.log('user is not online');
                await RedisClient.sAdd(`status_requests:${otherUser}`, socket.id);
            }
        }catch(err){
            console.log('error retreiving tag from redis');
        }
    });
    //disconnection part 
    socket.on('disconnection',async (data)=>{
        console.log(`socket user ${data.utag} ${socket.id} disconnected`);
        
        if(socket.tag){
            
            try {
                const activeChats = await RedisClient.sMembers(`${activeChatsKey}:${data.utag}`);
        
                if (activeChats.length > 0) {
                    for (let otherUser of activeChats) {
                        console.log(`getting all users connected to ${data.utag}`);
                        // Remove the disconnected user from the other user's active chats
                        await RedisClient.sRem(`${activeChatsKey}:${otherUser}`, data.utag);
                        const target_socketId = await RedisClient.get(otherUser);
    
                        if (target_socketId) {
                            // Notify the other user that the disconnected user is offline
                            console.log(`notifying user ${otherUser} abt status disconnect`)
                            socket.to(target_socketId).emit('status_update', { tag: data.utag, status: 'offline' });
                        }
                    }
                }
                await RedisClient.del(`${activeChatsKey}:${data.utag}`);
                console.log(`Removed ${data.utag} from active chats.`);
                RedisClient.del(data.utag, (err, reply) => {
                    if (err) {
                        console.log('Error removing socket ID from Redis:', err);
                    } else {
                        console.log('Socket ID removed from Redis on disconnect');
                    }
                });
            } catch (error) {
                console.error('Error removing from active chats:', error);
            }
        }
    });
    //getting a message from sender and sending it to receiver
    socket.on('message',async (data)=>{
        console.log(data)
        console.log('Sending message:',data.message,' to:',data.utag);
        try{
            //retreiving the socketId from redis, which stored as the receiver logs in to the app {user's tag: socketId}
            const target_socketId=await RedisClient.get(data.utag);
            console.log(data.utag);
            if(target_socketId&&data&&data.utag){
                //sending the message to the receiver client
                socket.to(target_socketId).emit('receive_message', { utag: data.utag, message: data.message,from:data.from,fromname:data.name });
                
                console.log('Message sent to:', data.utag);
            }else{
                console.log('User not online');
            }
        }catch(err){
            console.error('Error getting socket ID from Redis:', err);
        }
    });
    //acknowledgement from client socket on receiving the msg 
    socket.on('mess-ack',(data)=>{
        console.log('Message ack:',data);
    });
    socket.on('error',(err)=>{
        console.error(err);
    });
});
