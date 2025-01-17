const express=require('express');
const cors=require('cors');
const app=express();
const login_register=require('./login_register');
const search=require('./search'); //search users
const db=require('./msg_db'); //storing,retreiving messages and retreiving prev chatted users
app.use(cors({
    origin: '*',
    methods: 'GET,POST',
}));
app.use(express.json()); 
app.use('/api',login_register);
app.use('/api',search);
app.use('/api',db);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});