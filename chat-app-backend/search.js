const express = require("express");
const { Pool } = require("pg");
const router = express.Router();
const pool=new Pool({
    user: "postgres",
    host: "localhost",
    database: "chat_app_db",
    password: "mysecretpassword",
    port: 5432,
});
router.post("/search",(req,res)=>{
    const uid=req.body.tag;
    console.log(uid);
    pool.query('SELECT * FROM users where uid=$1',[uid],(error,result)=>{
        if(error){
            console.log(error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        if(result.rows.length===0){
            return res.status(400).json({success: false,status: 'No such user found'});
        }
        res.status(200).json({success: true,uname: result.rows[0].name});
    });
});
module.exports=router;