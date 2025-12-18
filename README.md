# Real-Time Chat Application

> ## 📝 Overview  
>A real-time chat application built with React.js frontend and Node.js backend, featuring secure end-to-end encryption using ECDH key exchange and AES-GCM encryption.

## 📸 Screenshots
   ![Screenshot 2025-01-17 102949](https://github.com/user-attachments/assets/3934e654-d7ad-4a1c-975f-593e12101e8d)
   ![Screenshot 2025-01-17 103001](https://github.com/user-attachments/assets/aa2f40bc-cea5-44e3-96fb-b8cff682f9d8)
   ![Screenshot 2025-01-17 103247](https://github.com/user-attachments/assets/82085bbb-9965-4c70-bc3b-f9df07a3f857)
   ![Screenshot 2025-01-17 103304](https://github.com/user-attachments/assets/feb4d309-6c9d-4430-937f-e691e8fc19ca)
   ![Screenshot 2025-01-17 103346](https://github.com/user-attachments/assets/a88016f9-1a1a-4f9a-b8bf-6a49c23d1d42)
   ![Screenshot 2025-01-17 103359](https://github.com/user-attachments/assets/f8f824ae-f4d8-4182-bf48-2592575641cd)
   ![Screenshot 2025-01-17 103417](https://github.com/user-attachments/assets/0945c48c-1e97-422c-a892-3fa285e1ea9c)

## 🚀 Features

### Security Features
>- **🔐 End-to-End Encryption**: Messages are encrypted using ECDH + AES-GCM
>- **🔑 Secure Key Management**: Private keys encrypted with password-derived master keys
>- **🧂 Salt-based Encryption**: Random salts for enhanced security
>- **🔒 Hashed Passwords**: Passwords stored as bcrypt hashes in database
>- **👁️ Show/Hide Password**: User-friendly password visibility toggle

### Communication Features
>- **💬 Real-time Messaging**: Instant message delivery using Socket.IO
>- **👥 Multi-user Support**: Search and chat with multiple users
>- **📱 Responsive Design**: Works on desktop and mobile devices
>- **🔄 Persistent Sessions**: Login state maintained across browser sessions
>- **📝 Chat History**: Previous conversations stored and retrievable

### Technical Features
>- **🏗️ Scalable Architecture**: Separate frontend and backend services
>- **🐳 Docker Database**: PostgreSQL database containerized with Docker
>- **🌐 CORS Enabled**: Cross-origin resource sharing configured
>- **📊 Real-time Status**: Online/offline status tracking
>- **🔧 Environment Configuration**: Configurable via environment variables

## 🛠️ Technology Stack

### Frontend
- **React.js** - UI framework
- **Socket.IO Client** - Real-time communication
- **Axios** - HTTP client for API requests
- **Crypto-js** - Cryptographic functions
- **Elliptic** - ECDH key generation
- **React Router** - Client-side routing
- **ChatScope UI Kit** - Chat interface components

### Backend
- **Node.js** - Server runtime
- **Express.js** - Web application framework
- **Socket.IO** - Real-time bidirectional communication
- **PostgreSQL** - Database for user data and messages
- **bcrypt** - Password hashing
- **nanoid** - Unique ID generation
- **dotenv** - Environment variable management

### Infrastructure
- **Docker** - Database containerization
- **CORS** - Cross-origin resource sharing
- **Environment Variables** - Configuration management

## 🔧 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- Docker and Docker Compose
- npm or yarn package manager

### 1. Clone the Repository
```bash
git clone <repository-url>
cd chat_app
```

### 2. Setup Environment Variables
Create a `.env` file in the root directory:
```env
# Database Configuration
DB_USER=postgres
DB_HOST=localhost
DB_NAME=chat_app_db
DB_PASSWORD=mysecretpassword
DB_PORT=5432

# API Configuration
REACT_APP_API_BASE=http://localhost:5000

# Socket Configuration
SOCKET_PORT=4000
API_PORT=5000
```

### 3. Start the Database
```bash
docker-compose up -d
```

### 4. Install Backend Dependencies
```bash
cd chat-app-backend
npm install
```

### 5. Install Frontend Dependencies
```bash
cd ../chat-app-frontend
npm install
```

### 6. Start the Backend Server
```bash
cd ../chat-app-backend
npm start
```

### 7. Start the Frontend Application
```bash
cd ../chat-app-frontend
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Socket.IO Server: http://localhost:4000

## 🔐 Encryption Flow

### Registration Process
1. User enters password and personal information
2. Random salt is generated using nanoid
3. Master key is derived from password + salt using PBKDF2
4. ECDH key pair (public/private) is generated
5. Private key is encrypted with master key using AES
6. Public key, encrypted private key, and salt are stored in database
7. Password is hashed with bcrypt before storage

### Login Process
1. User enters email and password
2. Server verifies password against bcrypt hash
3. Server returns encrypted private key and salt
4. Client recreates master key from password + salt
5. Client decrypts private key using master key
6. Private key is stored in session for message encryption/decryption

### Message Encryption
1. Sender computes shared secret using their private key + receiver's public key (ECDH)
2. Message is encrypted using AES-GCM with the shared secret
3. Encrypted message is sent to server and stored in database
4. Receiver retrieves encrypted message
5. Receiver computes same shared secret using their private key + sender's public key
6. Receiver decrypts message using AES-GCM

## 🚀 Running Multiple Instances

To test encryption between different users, run multiple frontend instances:

### Terminal 1 (Port 3002)
```bash
cd chat-app-frontend
npm run start:3002
```

### Terminal 2 (Port 3003)
```bash
cd chat-app-frontend
npm run start:3003
```

## 📁 Project Structure

```
chat_app/
├── chat-app-backend/          # Node.js backend
│   ├── server.js             # Main server file
│   ├── SocketServer.js       # Socket.IO server
│   ├── login_register.js     # Authentication endpoints
│   ├── search.js            # User search functionality
│   ├── msg_db.js            # Message storage/retrieval
│   └── package.json
├── chat-app-frontend/         # React frontend
│   ├── src/
│   │   ├── App.js           # Main app component
│   │   ├── Login.jsx        # Authentication component
│   │   ├── Home.jsx         # Chat interface
│   │   ├── client_socket.js # Crypto & socket functions
│   │   └── App.css          # Styles
│   └── package.json
├── docker-compose.yaml       # Docker configuration
├── init.sql                 # Database schema
├── .env                     # Environment variables
└── README.md               # Documentation
```

## 🔒 Security Considerations

### What's Protected
- ✅ Messages are encrypted end-to-end
- ✅ Private keys are encrypted before storage
- ✅ Passwords are hashed with bcrypt
- ✅ Shared secrets are computed client-side only
- ✅ Database stores only encrypted content

### Security Notes
- 🔐 Private keys never leave the client unencrypted
- 🔑 Master keys are derived from passwords and never stored
- 🧂 Each user has a unique salt for key derivation
- 💾 Conversation keys are cached per session for performance
- 🔄 Key regeneration is possible if keys are lost

## 🚀 Future Enhancements

- [ ] Group chat functionality
- [ ] File sharing with encryption
- [ ] Push notifications
- [ ] Message delivery confirmations
- [ ] User profile management
- [ ] Advanced security features (key rotation, etc.)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Error**: Ensure Docker is running and PostgreSQL container is started
2. **Port Already in Use**: Check if ports 3000, 4000, 5000, or 5432 are already in use
3. **Environment Variables**: Ensure `.env` file is properly configured
4. **Key Decryption Fails**: Clear localStorage and re-register if keys are corrupted

### Debug Mode
Enable verbose logging by setting `DEBUG=true` in your environment variables.
