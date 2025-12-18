const express=require('express');
const bcrypt=require('bcrypt');
const {nanoid}=require('nanoid');
const {Pool}=require('pg');

const pool=new Pool({
    user: process.env.DB_USER || "postgres",
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "chat_app_db",
    password: process.env.DB_PASSWORD || "mysecretpassword",
    port: process.env.DB_PORT || 5432,
});

const router=express.Router();
router.post("/login",async (req,res)=>{
    console.log("Login endpoint hit");
    const {email,password}=req.body;
    hashedPassword=await bcrypt.hashSync(password,10);
    pool.query('SELECT * FROM users where email=$1',[email],(error,result)=>{
        if(error){
            console.log(error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        //when no such user exists give error
        if(result.rows.length===0){
            console.log("No such user found");
            return res.status(400).json({success: false,status: 'User not found'});
        }
        users=result.rows[0];
        //compare the hashed password with the stored hash
        const passwordMatch=bcrypt.compareSync(password,users.password);
        if(!passwordMatch){
            console.log("Incorrect password");
            return res.status(400).json({success: false,status: 'Incorrect password'});
        }
        
        // Get user's public key, encrypted private key, and salt for E2E encryption
        pool.query('SELECT public_key, encrypted_private_key, salt FROM user_keys WHERE uid = $1', [users.uid], (keyError, keyResult) => {
            if(keyError) {
                console.log(keyError);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            
            const keyData = keyResult.rows.length > 0 ? keyResult.rows[0] : null;
            
            res.status(200).json({
                success: true,
                name: users.name,
                tag: users.uid,
                publicKey: keyData ? keyData.public_key : null,
                encryptedPrivateKey: keyData ? keyData.encrypted_private_key : null,
                salt: keyData ? keyData.salt : null
            });
        });
    });
});

router.post("/register",async (req,res)=>{
    console.log("Register endpoint hit");
    console.log("Request body:", req.body);
    const {name,email,password,publicKey,encryptedPrivateKey,salt}=req.body;
    
    console.log("Extracted values:", {
        hasName: !!name,
        hasEmail: !!email,
        hasPassword: !!password,
        hasPublicKey: !!publicKey,
        hasEncryptedPrivateKey: !!encryptedPrivateKey,
        hasSalt: !!salt,
        publicKeyLength: publicKey ? publicKey.length : 0,
        encryptedPrivateKeyLength: encryptedPrivateKey ? encryptedPrivateKey.length : 0,
        saltLength: salt ? salt.length : 0
    });
    
    //nanoid generates a alphanumeric string of length 6
    //this tag helps to identify each user in the app
    const hashedPassword=await bcrypt.hashSync(password,10);
    const userTag = nanoid(6);
    
    // Insert user first
    pool.query('INSERT INTO users (uid,name,email,password) VALUES ($1,$2,$3,$4)',[userTag,name,email,hashedPassword],(error,result)=>{
        if(error){
            console.log(error);
            if(error.code==='23505'){
                return res.status(200).json({success: false,status: 'User already exists'});
            }
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        
        // Insert public key, encrypted private key, and salt if provided
        if(publicKey && encryptedPrivateKey && salt) {
            console.log("Attempting to store keys for user:", userTag);
            pool.query('INSERT INTO user_keys (uid, public_key, encrypted_private_key, salt) VALUES ($1, $2, $3, $4)', 
                      [userTag, publicKey, encryptedPrivateKey, salt], (keyError) => {
                if(keyError) {
                    console.log('Error storing keys:', keyError);
                    console.log('Key error details:', keyError.message);
                    return res.status(500).json({ success: false, status: 'Failed to store encryption keys', error: keyError.message });
                }
                console.log("Keys stored successfully for user:", userTag);
                res.status(200).json({
                    success: true,
                    status: 'User registered successfully', 
                    tag: userTag,
                    name: name  // Include the user's name in the response
                });
            });
        } else {
            console.log("Missing encryption parameters:", {
                hasPublicKey: !!publicKey,
                hasEncryptedPrivateKey: !!encryptedPrivateKey,
                hasSalt: !!salt
            });
            return res.status(400).json({success: false, status: 'Missing encryption parameters'});
        }
    });
});

router.post("/update-public-key", async (req, res) => {
    console.log("Update public key endpoint hit");
    const { tag, publicKey } = req.body;
    
    if (!tag || !publicKey) {
        return res.status(400).json({ success: false, status: 'Missing tag or public key' });
    }
    
    // Check if user exists
    pool.query('SELECT * FROM users WHERE uid = $1', [tag], (userError, userResult) => {
        if (userError) {
            console.log(userError);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, status: 'User not found' });
        }
        
        // Update or insert public key
        pool.query('INSERT INTO user_keys (uid, public_key) VALUES ($1, $2) ON CONFLICT (uid) DO UPDATE SET public_key = EXCLUDED.public_key', 
                  [tag, publicKey], (keyError) => {
            if (keyError) {
                console.log('Error updating public key:', keyError);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            
            res.status(200).json({ success: true, status: 'Public key updated successfully' });
        });
    });
});

module.exports=router;