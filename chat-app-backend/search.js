const express = require("express");
const { Pool } = require("pg");
const router = express.Router();
const pool=new Pool({
    user: process.env.DB_USER || "postgres",
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "chat_app_db",
    password: process.env.DB_PASSWORD || "mysecretpassword",
    port: process.env.DB_PORT || 5432,
});
router.post("/search",(req,res)=>{
    const uid=req.body.tag;
    console.log(uid);
    // Join with user_keys table to get public key for E2E encryption
    pool.query(`SELECT u.*, uk.public_key 
                FROM users u 
                LEFT JOIN user_keys uk ON u.uid = uk.uid 
                WHERE u.uid = $1`,[uid],(error,result)=>{
        if(error){
            console.log(error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        if(result.rows.length===0){
            return res.status(400).json({success: false,status: 'No such user found'});
        }
        res.status(200).json({
            success: true,
            uname: result.rows[0].name,
            publicKey: result.rows[0].public_key
        });
    });
});
module.exports=router;