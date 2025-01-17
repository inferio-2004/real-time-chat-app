# Real-Time Chat Application

> ## 📝 Overview  
> A scalable real-time chat application built with modern technologies to provide live messaging, user authentication, and online/offline status tracking. Designed with a responsive UI and containerized for easy deployment.

## 🛠️ Features  
> - **Real-Time Messaging**: Instant communication using WebSockets via Socket.IO.  
> - **User Authentication**: Secure login and registration system.  
> - **Online Status Updates**: Tracks user availability with Redis.  
> - **Persistent Chat History**: Stores messages and conversation data in PostgreSQL.  
> - **Scalable and Portable**: Dockerized for seamless deployment and scaling.  
> - **Enhanced User Experience**: Includes chat search, unread message indicators, and a responsive interface.  

## 📖 Tech Stack  
- **Frontend**: React, Chat UI Kit  
- **Backend**: Node.js, Express.js  
- **Real-Time Communication**: Socket.IO  
- **Database**: PostgreSQL  
- **Caching and Status Management**: Redis  
- **Containerization**: Docker  

## 🚀 Getting Started  

### Prerequisites  
+ Ensure you have the following installed:  
    - Node.js  
    - Docker  
    - React
  
### Installation  
1. Clone the Repository:
   ```bash
   git clone https://github.com/yourusername/real-time-chat-app.git
   cd real-time-chat-app
   ```
2. Run the Docker:
   ```bash
   docker-compose up
   ```
3. **Start Backend**:
   ```bash
   cd backend
   npm install
   npm start
   ```
4. **Start Frontend**:
   ```bash
   cd frontend
   npm install
   npm start
   ```
## 📂 Project Structure
  ```bash
   root/
      ├── backend/
      │   ├── msg_db.js          # Database queries for messages
      │   ├── SocketServer.js    # Socket.IO server logic
      │   ├── server.js          # Express server setup
      │   ├── search.js          # Search functionality
      │   ├── login_register.js  # User login and registration
      │   ├── init.sql           # SQL file for database initialization
      │   ├── docker-compose.yaml # Docker Compose configuration
      ├── frontend/
      │   ├── src/
      │   │   ├── App.css        # Stylesheets
      │   │   ├── login.jsx      # Login page
      │   │   ├── home.jsx       # Home page contains the main app
  ```
## ⚙️ Endpoints
  ### Api Routes
  - /api/login: logs in the user
  - /api/register: registers an user
  - /api/store: Store chat messages.
  - /api/retrieve: Retrieve chat history.
  - /api/prevchats: Fetch user’s recent chats.
  - /api/search: search an user

## 📸 Screenshots
   ![Screenshot 2025-01-17 102949](https://github.com/user-attachments/assets/3934e654-d7ad-4a1c-975f-593e12101e8d)
   ![Screenshot 2025-01-17 103001](https://github.com/user-attachments/assets/aa2f40bc-cea5-44e3-96fb-b8cff682f9d8)
   ![Screenshot 2025-01-17 103247](https://github.com/user-attachments/assets/82085bbb-9965-4c70-bc3b-f9df07a3f857)
   ![Screenshot 2025-01-17 103304](https://github.com/user-attachments/assets/feb4d309-6c9d-4430-937f-e691e8fc19ca)
   ![Screenshot 2025-01-17 103346](https://github.com/user-attachments/assets/a88016f9-1a1a-4f9a-b8bf-6a49c23d1d42)
   ![Screenshot 2025-01-17 103359](https://github.com/user-attachments/assets/f8f824ae-f4d8-4182-bf48-2592575641cd)
   ![Screenshot 2025-01-17 103417](https://github.com/user-attachments/assets/0945c48c-1e97-422c-a892-3fa285e1ea9c)

## 🛠️ Future Improvements
- Group chats and file sharing.
- adding encryption for messages to improve security
- Deployment on cloud platforms like AWS/GCP.
