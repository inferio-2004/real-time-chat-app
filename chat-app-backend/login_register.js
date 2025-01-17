const express=require('express');
const {nanoid}=require('nanoid');
const {Pool}=require('pg');

const pool=new Pool({
    user: "postgres",
    host: "localhost",
    database: "chat_app_db",
    password: "mysecretpassword",
    port: 5432,
});

const router=express.Router();
router.post("/login",(req,res)=>{
    const {name,password}=req.body;
    pool.query('SELECT * FROM users where name=$1 and password=$2',[name,password],(error,result)=>{
        if(error){
            console.log(error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        //when no such user exists give error
        if(result.rows.length===0){
            return res.status(400).json({success: false,status: 'User not found'});
        }
        res.status(200).json({success: true,name: result.rows[0].name,tag: result.rows[0].uid});
    });
});

router.post("/register",(req,res)=>{
    const {name,email,password}=req.body;
    //nanoid generates a alphanumeric string of length 6
    //this tag helps to identify each user in the app
    pool.query('INSERT INTO users (uid,name,email,password) VALUES ($1,$2,$3,$4)',[nanoid(6,),name,email,password],(error,result)=>{
        if(error){
            console.log(error);
            if(error.code==='23505'){
                return res.status(200).json({success: false,status: 'User already exists'});
            }
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.status(200).json({success: true,status: 'User registered successfully'});
    });
});
module.exports=router;