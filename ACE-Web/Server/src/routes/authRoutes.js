import express from 'express';
import bodyParser from "body-parser";
import bcrypt from 'bcrypt';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { authenticateToken, generateJwtToken, generateRefreshToken } from '../middleware/authMiddleware.js';
import { userRegistrationSchema } from '../schemas/user.schema.js';
import { UIDSchema } from '../schemas/UID.schema.js';
import { User } from '../models/user.model.js';
import { Authority } from '../models/authority.model.js';
import { Querier } from '../models/querier.model.js';
import { Portal } from '../models/portal.model.js';
import sendMail from '../utils/email.js'; 
import { object } from 'zod';
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
// import ethers from "ethers";
dotenv.config();

const app = express();
const router = express.Router();
app.use(bodyParser.json());
app.use(cookieParser());

// Mutual exclusion to prevent multiple entries on database at once
const signUpQue = [];
let signUpIsLocked = false;
let currentSignUp = [];

router.post('/signup', async (req, res) => {
    res.clearCookie("G_ENABLED_IDPS");
    console.log("request on signup");
    const userReq = req.body
    if (signUpIsLocked) {
            signUpQue.push(userReq);
    }
    else{
        signUpIsLocked = true;
        currentSignUp.push(userReq);
        const result = await signUp(userReq);
        res.json(result);
    }

    while (signUpQue.length > 0) {
        const next_data = signUpQue.shift();
        const result_qued = await signUp(next_data);
        res.json(result_qued);
    }

    signUpIsLocked = false;

    
    async function signUp(userData){
        try {
            // const zodCheck = userRegistrationSchema.parse(req.body);
            console.log(userData);
            const hash = await bcrypt.hash(userData.password, 10);

            const user = await User.findOne({ email: userData.email });

            if(!user){
                const newUser = await User.create({
                    email: userData.email,
                    password: hash,
                    role: userData.userType,
                });

                const accessToken = generateJwtToken({ _id: newUser._id });
                const refreshToken = generateRefreshToken({ _id: newUser._id });
                res.cookie("accessToken", accessToken, { httpOnly: true, sameSite: "strict" });
                res.cookie("refreshToken", refreshToken, { httpOnly: true, sameSite: "strict" });

                if(userData.userType === "admin"){
                    return { redirect: 'generateRoom' };
                }else{
                    return { redirect: 'joinRoom' };
                }
            }else{
                return {err:"email already has an account"}
            }
    
        }
        catch (error) {
            return { err: 'Invalid data' };
        }
    }
});

router.post('/login', async (req, res) => {
    console.log("request on login");
    res.clearCookie("G_ENABLED_IDPS");

    try {
        // const zodCheck = LoginSchema.parse(req.body);
        const userData = req.body;
        const user = await User.findOne({ email: userData.email });
        // const team = await Team.findOne({ name: userData.teamName });


        
        // Empty field check
        if (Object.values(userData).includes("")) {
            return res.json({ err: "Fill all details" });
        }

        // No user or team found
        else if (!user) {
            // console.log("here1")
            return res.json({ err: "Invalid Details" });
        }
        else{
            bcrypt.compare(userData.password, user.password, (err, result) => {
                if (result) {
                    const accessToken = generateJwtToken({ _id: user._id });
                    const refreshToken = generateRefreshToken({ _id: user._id });
                    res.cookie("accessToken", accessToken, { httpOnly: true, sameSite: "strict" });
                    res.cookie("refreshToken", refreshToken, { httpOnly: true, sameSite: "strict" });

                    // if(user.role === "admin")
                    // {
                    //     res.json({redirect:"adminLogin"})
                    // }
                    // else{
                    //     res.json({redirect:"userLogin"})
                    // }
                    if (user.role === "admin"){
                        res.json({redirect:"generateRoom"});
                    }else{
                        res.json({redirect:"joinRoom"});
                    }
                } else {
                    console.error(err);
                    res.json({ err: "Invalid Details" });
                }
            });
        }

        // Password comparison
        
    } catch (error) {
        res.json({ err: "Invalid Details" });
    }
    
});

router.post('/login-with-metamask', async (req, res) => {
    const { address, message, signature ,role} = req.body;

    try {
        // Recover the address that signed the message
        const recoveredAddress = ethers.utils.verifyMessage(message, signature);

        // Check if the recovered address matches the provided address
        if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
            // return res.json({ success: false, error: 'Signature verification failed' });
            let user = await User.findOne({ email: address });

            // If user doesn't exist, create a new user with the Ethereum address as the username
            if (!user) {
                user = await User.create({ email: address, password: 'metamask',role:role }); // no password needed
            }
    
            // Generate JWT tokens for the session
            const accessToken = generateJwtToken({ _id: user._id });
            const refreshToken = generateRefreshToken({ _id: user._id });
            res.cookie("accessToken", accessToken, { httpOnly: true, sameSite: "strict" });
            res.cookie("refreshToken", refreshToken, { httpOnly: true, sameSite: "strict" });
            if(role === "admin"){
                res.json({redirect:"generateRoom"})
            }else{
                res.json({redirect:"joinRoom"})
            }
        }else{
            return res.json({ err: "Invalid Details" });
        }

        // Check if the user exists in the database
       
    } catch (error) {
        console.error('Login with MetaMask failed:', error);
        res.json({ success: false, error: 'Failed to login with MetaMask' });
    }
});


// Mutex lock at Authority Verification

const registerAuthorityQue = [];
let registerAuthorityIsLocked = false;
let currentAuthorityRegister = [];

router.post('/CreateRoom',authenticateToken, async(req,res)=>{
    console.log("request on create room");
    const authorityData = req.body;
    if (registerAuthorityIsLocked) {
            registerAuthorityQue.push(authorityData);
            console.log("reques qued:",req.user._id);
    }

    else{
        registerAuthorityIsLocked = true;
        currentAuthorityRegister.push(authorityData);
        console.log("request accepted:",req.user._id);
        const result = await registerAuthority(authorityData);
        res.json(result);
    }

    while (registerAuthorityQue.length > 0) {
        const next_data = registerAuthorityQue.shift();
        const result_qued =await registerAuthority(next_data);
        res.json(result_qued);
    }

    registerAuthorityIsLocked = false;

    async function registerAuthority(data){

        try{
            function generateRandomString(length) {
                const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                let result = '';
                const charactersLength = characters.length;
                for (let i = 0; i < length; i++) {
                result += characters.charAt(Math.floor(Math.random() * charactersLength));
                }
                return result;
            }
            
            const UID = generateRandomString(12);

            const user = await User.findOne({ _id: req.user._id });


            // const hash = await bcrypt.hash(data.password, 10);

            // const newAuthority = await Authority.create({
            //     authorityName: data.authorityName,
            //     user:req.user._id,
            //     UID:UID,
            //     password: hash,
            //     // verificationFiles:{$push:{filename:data.file}},
            //     verified:true
            // });
            const currentDate = new Date();
            const newPortal = await Portal.create({
                creatorId:req.user._id,
                UID:UID,
                dateCreated:currentDate
                // portals:[{
                //     querySubject:"null",
                //     querierId:"null",
                //     dateInitialized:currentDate,
                //     queryStatus:"pending",
                // }]
            })
    
            return{message:`your UID is ${UID}`}
    
        }catch(err){
            return{err:"invalid details"};
        }
    }
    
})


router.post('/joinRoom',authenticateToken, async (req, res) => {
    res.clearCookie("G_ENABLED_IDPS");

    console.log(req.user._id);

    try {
        const userData = req.body;
        const user = await Portal.findOne({UID:userData.UID});
        let hasQuery = false;
        const admin = await Portal.findOne({UID:userData.UID,creatorId:req.user._id});
        console.log(admin);
        // console.log(user);
        if(!admin){
            user.portals.forEach((el)=>{
                if(el.querierId === req.user._id){
                    console.log("found");
                    res.clearCookie("accessToken");
                    res.clearCookie("refreshToken");
        
                    const newAccessToken = generateJwtToken({ _id: req.user._id, UID: userData.UID,adminId:user.creatorId,role:"querier"});
                    const newRefreshToken = generateRefreshToken({ _id: req.user._id, UID: userData.UID,role:"querier" });
                    res.cookie("accessToken", newAccessToken, { httpOnly: true, sameSite: "strict" });
                    res.cookie("refreshToken", newRefreshToken, { httpOnly: true, sameSite: "strict" });
                    hasQuery = true;
                    res.json({redirect:"chat"})
                }
            })
            if(hasQuery === false){
                res.json({submitQuery:"true"})
            }

        }else{
            console.log("here");
            res.clearCookie("accessToken");
            res.clearCookie("refreshToken");

            const newAccessToken = generateJwtToken({ _id: req.user._id, UID: user.UID ,role:"authority"});
            const newRefreshToken = generateRefreshToken({ _id: req.user._id, UID: user.UID,role:"authority" });
            res.cookie("accessToken", newAccessToken, { httpOnly: true, sameSite: "strict" });
            res.cookie("refreshToken", newRefreshToken, { httpOnly: true, sameSite: "strict" });

            res.json({redirect:"dashboard"})

        }

    } catch (error) {
        res.json({ err: "blah" });
    }
});


router.post("/submitQuery",authenticateToken,async(req,res)=>{
    const userData = req.body;
    async function NewQuerier(){
        const newEntry = {
            querySubject: userData.querySubject,
            querierId: req.user._id,
            dateInitialized: new Date(),
            messages: [userData.message] 
        };

        const newPortal = await Portal.findOneAndUpdate({UID:userData.UID},{$push:{portals:newEntry}})

        const newAccessToken = generateJwtToken({ _id: req.user._id, UID: userData.UID, role:"querier" });
        const newRefreshToken = generateRefreshToken({ _id: req.user._id, UID: userData.UID,role:"querier" });

        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");

        res.cookie("accessToken", newAccessToken, { httpOnly: true, sameSite: "strict" });
        res.cookie("refreshToken", newRefreshToken, { httpOnly: true, sameSite: "strict" });

        res.json({redirect:"userChat"})}
        NewQuerier();
})


// router.post('/adminLogin',authenticateToken, async (req, res) => {
//     try {
//         // const zodCheck = userLoginSchema.parse(req.body);
//         const userData = req.body;
//         const user = await Authority.findOne({ authorityName: userData.authorityName });
//         // const team = await Team.findOne({ name: userData.teamName });


        
//         // Empty field check
//         if (Object.values(userData).includes("")) {
//             return res.json({ err: "Fill all details" });
//         }

//         // No user or team found
//         else if (!user) {
//             return res.json({ err: "no Details" });
//         }
//         else{
//             bcrypt.compare(userData.password, user.password, (err, result) => {
//                 if (result) {

//                     res.clearCookie("accessToken");
//                     res.clearCookie("refreshToken");


//                     const newAccessToken = generateJwtToken({ _id: user._id, UID: user.UID ,role:"authority"});
//                     const newRefreshToken = generateRefreshToken({ _id: user._id, UID: user.UID,role:"authority" });
//                     res.cookie("accessToken", newAccessToken, { httpOnly: true, sameSite: "strict" });
//                     res.cookie("refreshToken", newRefreshToken, { httpOnly: true, sameSite: "strict" });

//                     res.json({redirect:"dashboard"})

//                     // }
// 		            // else if(user.role==="team_member"){res.json({redirect:"cryptictime"})}
    
//                     // const loggedTeam = await Performance.findOneAndUpdate({ _id: performance._id },{ loggedIn: true });
//                 } else {
//                     console.error(err);
//                     res.json({ err: "Invalid Details" });
//                 }
//             });
//         }

//         // Password comparison
        
//     } catch (error) {
//         res.json({ err: "Invalid Details" });
//     }
    
// });



router.get("/querierUID",authenticateToken,async(req,res)=>{
    try{
        const user = await Querier.find({ user: req.user._id });
        const userUIDS = await user.map((el)=>{
            return el.UID
        })
        res.json({allUID:userUIDS});
    }catch(err){
        console.log(err);
    }
})

router.post('/refresh', (req, res) => {
    const { accessToken, refreshToken } = req.body;

    jwt.verify(refreshToken, process.env.ENCRYPT_KEY || 'your_default_secret_key', (err, decoded) => {
        if (err) {
            console.log("Refresh key doesn't match");
            return res.status(401).json({ message: 'Invalid refresh token' });
        } else {
            const newAccessToken = generateJwtToken({ _id: decoded.username, role: decoded.role });

            res.clearCookie("accessToken");
            res.clearCookie("refreshToken");

            res.cookie("accessToken", newAccessToken, { httpOnly: true, sameSite: "strict" });
            res.cookie("refreshToken", refreshToken, { httpOnly: true, sameSite: "strict" });

            res.redirect("/home");
        }
    });
});

export default router;