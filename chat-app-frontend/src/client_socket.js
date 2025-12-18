//handles e2e encryption and decryption utilities
import { ec as EC } from 'elliptic';        // ECDH key exchange
import { Buffer } from 'buffer';            // Binary data handling
import CryptoJS from 'crypto-js';           // For PBKDF2 and SHA256
import {nanoid} from 'nanoid';

//handles the client side socket
import EventEmitter from 'events';
import io from 'socket.io-client';

//conversation key caching utilities
const CONVERSATION_CACHE_KEY = 'conversation_keys';

const generateConversationId = (userTag1, userTag2) => {
  // Sort tags to ensure consistent key regardless of sender/receiver
  const sortedTags = [userTag1, userTag2].sort();
  return `${sortedTags[0]}_${sortedTags[1]}`;
};

const conversationCache = {
  get: (conversationId) => {
    try {
      const cache = JSON.parse(sessionStorage.getItem(CONVERSATION_CACHE_KEY) || '{}');
      return cache[conversationId] || null;
    } catch (error) {
      console.error('Error reading from conversation cache:', error);
      return null;
    }
  },
  
  set: (conversationId, sharedSecret) => {
    try {
      const cache = JSON.parse(sessionStorage.getItem(CONVERSATION_CACHE_KEY) || '{}');
      cache[conversationId] = sharedSecret;
      sessionStorage.setItem(CONVERSATION_CACHE_KEY, JSON.stringify(cache));
      return true;
    } catch (error) {
      console.error('Error writing to conversation cache:', error);
      return false;
    }
  },
  
  has: (conversationId) => {
    try {
      const cache = JSON.parse(sessionStorage.getItem(CONVERSATION_CACHE_KEY) || '{}');
      return conversationId in cache;
    } catch (error) {
      console.error('Error checking conversation cache:', error);
      return false;
    }
  },
  
  clear: () => {
    try {
      sessionStorage.removeItem(CONVERSATION_CACHE_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing conversation cache:', error);
      return false;
    }
  }
};

//e2e encryption functions
const getMasterKey=(password,salt_user)=>{
  console.log('getMasterKey called with:', { hasPassword: !!password, hasSalt: !!salt_user });
  
  let salt;
  if(!salt_user){
    // Use a deterministic salt derived from password for consistency
    const passwordSalt = CryptoJS.SHA256(password + 'app-salt-constant').toString(CryptoJS.enc.Hex).substring(0, 32);
    salt = Buffer.from(passwordSalt, 'hex');
    console.log('Generated deterministic salt from password');
  }else{
    salt=salt_user;
    console.log('Using provided salt');
  }
  
  // Use crypto-js for PBKDF2
  const masterKeyWordArray = CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(salt.toString('hex')), {
    keySize: 8, // 32 bytes = 8 words
    iterations: 100000,
    hasher: CryptoJS.algo.SHA256
  });
  
  // Convert CryptoJS WordArray to Buffer
  const masterKey = Buffer.from(masterKeyWordArray.toString(CryptoJS.enc.Hex), 'hex');
  console.log('Generated master key:', masterKey ? 'Present' : 'Missing');
  
  return {masterKey:masterKey,salt:salt};
}; 

const generateECDHKeyPair=()=>{
  console.log('Generating random ECDH key pair (secure approach)');
  const ec = new EC('p256');
  const key = ec.genKeyPair();
  const publicKey = key.getPublic('hex');
  const privateKey = key.getPrivate('hex');
  console.log('Generated random keys:', { hasPublic: !!publicKey, hasPrivate: !!privateKey });
  return { publicKey, privateKey };
};

// Encrypt private key with password for secure storage
const encryptPrivateKey = (privateKey, password) => {
  console.log('Encrypting private key...', { hasPrivateKey: !!privateKey, hasPassword: !!password });
  
  if (!privateKey || !password) {
    console.error('Missing privateKey or password for encryption');
    return null;
  }
  
  try {
    const { masterKey } = getMasterKey(password);
    console.log('Master key generated for encryption');
    
    if (!masterKey) {
      console.error('Master key generation failed');
      return null;
    }
    
    const encrypted = CryptoJS.AES.encrypt(privateKey, masterKey.toString('hex')).toString();
    console.log('Private key encryption completed:', !!encrypted);
    
    return encrypted;
  } catch (error) {
    console.error('Failed to encrypt private key:', error);
    return null;
  }
};

// Decrypt private key using password
const decryptPrivateKey = (encryptedPrivateKey, password) => {
  console.log('Attempting to decrypt private key...');
  try {
    const { masterKey } = getMasterKey(password);
    console.log('Master key generated for decryption');
    
    const decrypted = CryptoJS.AES.decrypt(encryptedPrivateKey, masterKey.toString('hex'));
    const privateKey = decrypted.toString(CryptoJS.enc.Utf8);
    
    console.log('Private key decryption result:', privateKey ? 'Success' : 'Failed');
    
    if (!privateKey || privateKey.length === 0) {
      console.error('Decrypted private key is empty or invalid');
      return null;
    }
    
    return privateKey;
  } catch (error) {
    console.error('Failed to decrypt private key:', error);
    return null;
  }
};

const computeSharedSecret=(privateKeyHex, otherPublicKeyHex, userTag1, userTag2)=>{
  // Validate inputs
  if (!privateKeyHex || !otherPublicKeyHex) {
    console.error('computeSharedSecret: Missing keys', {
      hasPrivateKey: !!privateKeyHex,
      hasPublicKey: !!otherPublicKeyHex,
      userTag1,
      userTag2
    });
    return null;
  }

  // Check cache first if conversation IDs are provided
  if (userTag1 && userTag2) {
    const conversationId = generateConversationId(userTag1, userTag2);
    if (conversationCache.has(conversationId)) {
      console.log('Using cached shared secret for conversation:', conversationId);
      return conversationCache.get(conversationId);
    }
  }
  
  try {
    // Compute shared secret
    const ec = new EC('p256');
    const key = ec.keyFromPrivate(privateKeyHex, 'hex');
    const otherKey = ec.keyFromPublic(otherPublicKeyHex, 'hex');
    const sharedSecret = key.derive(otherKey.getPublic()).toString(16);
    
    // Cache the result if conversation IDs are provided
    if (userTag1 && userTag2) {
      const conversationId = generateConversationId(userTag1, userTag2);
      conversationCache.set(conversationId, sharedSecret);
      console.log('Cached shared secret for conversation:', conversationId);
    }
    
    return sharedSecret;
  } catch (error) {
    console.error('Error computing shared secret:', error);
    return null;
  }
};

//deriuve aes key from shared secret
const deriveKey=async(sharedSecret)=>{
  const sharedSecretBuffer=Buffer.from(sharedSecret,'hex');
  const KeyMaterial = await crypto.subtle.importKey(
    'raw',
    sharedSecretBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(16),
      iterations: 100000,
      hash: 'SHA-256',
    },
    KeyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

//aes gcm encryption
const encryptMessage=async(plaintext, sharedSecret)=>{
  try{
    if (!sharedSecret) {
      throw new Error('Shared secret is null or undefined');
    }
    const aesGcmKey=await deriveKey(sharedSecret);
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const plaintextBytes=new TextEncoder().encode(plaintext);
    const ciphertextBuffer=await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      aesGcmKey,
      plaintextBytes
    );
    const ciphertext=new Uint8Array(ciphertextBuffer);
    const combinedBuffer=new Uint8Array(iv.length + ciphertext.length);
    combinedBuffer.set(iv,0);
    combinedBuffer.set(ciphertext,iv.length);
    return Buffer.from(combinedBuffer).toString('hex');
  }catch(err){
    console.error('Encryption error:',err);
    throw err;
  }
};

//aes gcm decryption
const decryptMessage = async (ciphertextHex, sharedSecret) => {
  try {
    if (!sharedSecret) {
      throw new Error('Shared secret is null or undefined');
    }
    
    if (!ciphertextHex || ciphertextHex === null || ciphertextHex === undefined) {
      throw new Error('Ciphertext is null, undefined, or empty');
    }
    
    if (typeof ciphertextHex !== 'string') {
      throw new Error(`Expected ciphertext to be string, got ${typeof ciphertextHex}`);
    }
    
    // Derive AES key
    const aesKey = await deriveKey(sharedSecret);
    
    // Parse combined data
    const combined = Buffer.from(ciphertextHex, 'hex');
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    // Decrypt with AES-GCM
    const plaintextBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      aesKey,
      ciphertext
    );
    
    // Convert back to string
    return new TextDecoder().decode(plaintextBuffer);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw error;
  }
};

//client socket functions
let socket;
let eventEmitter = new EventEmitter();
const handleSocket= async (udata,action='connect')=>{
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
      // Send the already encrypted message from frontend
      console.log('Sending encrypted message:', udata.encryptedMessage);
      console.log('Sending message to:', udata.to);
      socket.emit('message',{utag:udata.to,message:udata.encryptedMessage,from:udata.from,name:udata.fromname});
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

export {chkstatus,sendMessage,eventEmitter,disconnect,registertag,getMasterKey,generateECDHKeyPair,computeSharedSecret,encryptMessage,decryptMessage,encryptPrivateKey,decryptPrivateKey};