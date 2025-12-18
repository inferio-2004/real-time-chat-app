const express=require('express');
const {Pool}=require('pg');
const router=express.Router();
const pool=new Pool({
    user: process.env.DB_USER || "postgres",
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "chat_app_db",
    password: process.env.DB_PASSWORD || "mysecretpassword",
    port: process.env.DB_PORT || 5432,
});

//storing msg
router.post('/store',async (request,response)=>{
    const query='INSERT INTO msg(sender,receiver,content,is_read,timestamp) VALUES ($1,$2,$3,$4,$5)';
    const {receiver,sender,content,isread,time}=request.body;
    console.log('sender:',sender);
    console.log('receiver:',receiver);
    pool.query(query,[sender,receiver,content,isread,time],(err,res)=>{
        if(err) {
            console.error('Error inserting data:', err.stack);
            return response.status(500).json({status:0,res:'error inserting msg to db'});
        }
        console.log("inserted successfully");
        return response.status(200).json({ status: 1, res: "Message stored successfully" });
    });
});

//retreive prev chats
router.get('/retrieve',async (req,response)=>{
    const query=`SELECT sender,content,timestamp 
                FROM msg WHERE (SENDER=$1 AND RECEIVER=$2) OR (RECEIVER=$1 AND SENDER=$2)`;
    const {sender,receiver}=req.query;
    const values=[sender,receiver];
    console.log('sender:',sender);
    console.log('receiver:',receiver);
    pool.query(query,values,(err,res)=>{
        if(err){
            console.error(err);
            return response.status(500).json("error in retreiving messages");
        }
        console.log("retrieved successfully");
        const response_msg=[];
        for(const msg of res.rows){
            response_msg.push(
                {
                    content:msg.content,  // Changed from 'text' to 'content' to match frontend expectation
                    sender:msg.sender,    // Added sender field for isMine calculation
                    timestamp:msg.timestamp,
                }
            );
        }
        console.log(response_msg);
        return response.status(200).json(response_msg);
    });
});

//retreive previous users chatted with
router.get('/prevchats',async (req,response)=>{
    const query=`select u.uid as userid,u.name as username from users u where u.uid in (
                select distinct
                    case
                        when sender=$1 then receiver
                        else sender
                    end
                from msg
                where sender=$1 or receiver=$1
                );`;
    const {tag}=req.query;
    console.log('tag is',tag);
    pool.query(query,[tag],(err,res)=>{
        if(err){
            console.error(err);
            return response.status(400).json("err in restreiving contacts");
        }
        console.log('contacts retreived');
        console.log(res.rows);
        return response.status(200).json(res.rows);
    });
});

module.exports=router;