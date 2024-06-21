import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cookie from 'cookie';        
import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import authRoute from "./src/routes/authRoutes.js";
import connectDB from "./src/db/mongoose.js";
import { authenticateToken } from './src/middleware/authMiddleware.js';
import rateLimiter from './src/middleware/rateLimiterMiddleware.js';
import logoutRoute from "./src/routes/logoutroute.js";
import jwt from "jsonwebtoken";
import { start } from "repl";
import { Portal } from './src/models/portal.model.js';
import dataRoute from "./src/routes/dataRoute.js"


import { createServer } from 'http';
import { Server } from 'socket.io';
import { produceMessage } from "./src/middleware/kafka.js";

const app = express();
const server = createServer(app);
const io = new Server(server);


app.set('trust proxy', 20);
app.get('/ip', (request, response) => response.send(request.ip));
app.get('/x-forwarded-for', (request, response) => response.send(request.headers['x-forwarded-for']));
// app.use(rateLimiter);
// app.use('/', route);


//static files folders
connectDB();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const __public = dirname(__dirname) + "/public";



// Serve static files from the 'public/scripts' directory
app.use('/public', express.static(join(__dirname, '..', 'public')));
app.use('/scripts', express.static(join(__dirname, '..', 'public', 'scripts')));
app.use(express.static(__public));
// app.use(express.static("public/views"));

app.use(helmet.noSniff());
app.use(helmet.referrerPolicy({ policy: "no-referrer" }));

app.get("/", (req, res) => {
    res.sendFile(__public + "/views/home.html");
});

app.get("/signup", (req, res) => {
    res.sendFile(__public + "/views/sign_up.html");
});

app.get("/adminVerification", authenticateToken, (req, res) => {
    res.sendFile(__public + "/views/registerAuthority.html");
});

app.get("/login", (req, res) => {
    res.sendFile(__public + "/views/login.html");

});


// app.get("/home", authenticateToken, (req, res) => {
//     res.sendFile(__public + "/views/home.html");
// });


app.get("/userLogin", authenticateToken, async (req, res) => {
    res.sendFile(__public + "/views/create_query.html");
});

app.get("/submitQuery", authenticateToken, async (req, res) => {
    res.sendFile(__public + "/views/create_query.html");
});

// app.get("/adminLogin", authenticateToken, (req, res) => {
//     res.sendFile(__public + "/views/loginAuthority.html");
// });

app.get("/temp", authenticateToken, (req, res) => {
    res.sendFile(__public + "/views/temp.html");
});

app.get("/chat", authenticateToken, (req, res) => {
    if(req.user.role === "authority"){
        res.sendFile(__public + "/views/adminChat.html");

    }else if(req.user.role === "querier"){
        res.sendFile(__public + "/views/userChat.html");

    }
    // res.sendFile(__public + "/views/userChat.html");
})

app.get("/dashboard", authenticateToken, (req, res) => {
    res.sendFile(__public + "/views/adminDashboard.html");
})

app.use(authRoute);
app.use(dataRoute);
app.use(logoutRoute);
const users=[];

export async function storeMessage(message,qId,UID){
    console.log(message,qId,UID);
    try{
        const portal = await Portal.findOne({UID});
        //   console.log(portal);
        const targetPortal = portal.portals.find(p => p.querierId === qId);
        if (targetPortal) {
            targetPortal.messages.push(message);
            await portal.save();
            console.log("Message stored successfully.");
        } else {
            console.log("Querier not found.");
        }
        // res.json({saved:"true"});

    }catch(err){
        console.log("gemini")
        console.log(err);
        // res.json({saved:"false"});
    }
}


// --------------------------------Socket.io------------------------------------------------------------------------------>
io.on('connection',(socket) => {
    console.log('A user connected');
  
    socket.on('register-admin', (username) => {
        let userDetails;
        const cookies = cookie.parse(socket.handshake.headers.cookie || '');
        const accessToken = cookies.accessToken;
        const queryId = cookies.queryId;
        jwt.verify(accessToken, process.env.SECRET_KEY , (err, user) => {
            if (err) {
                return res.status(403).json({ error: 'Token expired or invalid' });
            }
            userDetails=user;
        });
        let updated = false;
        let count=0
        for(let i=0;i<users.length;i++){
            if(users[i].adminId===userDetails._id && count === 0){
                users[i].adminSocketId=socket.id;
                updated = true;
                console.log(`User SocketId updated: ${userDetails._id}`);
                count++;
            }
        }
        if(updated===false){
            const user={
                adminId:userDetails._id,
                adminSocketId:socket.id,
                userId:queryId,
                userSocketId:null,
            }
            users.push(user);
            console.log(`User registered: ${userDetails._id}`);
        }

    });

    socket.on('register-user', (username) => {
        let userDetails;
        const cookies = cookie.parse(socket.handshake.headers.cookie || '');
        const accessToken = cookies.accessToken;
        jwt.verify(accessToken, process.env.SECRET_KEY , (err, user) => {
            if (err) {
                return res.status(403).json({ error: 'Token expired or invalid' });
            }
            userDetails=user;
        });
        let updated = false;
        for(let i=0;i<users.length;i++){
            if(users[i].userId===userDetails._id){
                users[i].userSocketId=socket.id;
                updated = true;
                console.log(`User SocketId updated: ${userDetails._id}`);
            }
            // else if(users[i].adminId===userDetails.adminId){
            //     users[i].userSocketId=socket.id;
            //     updated = true;
            //     console.log(`User SocketId updated: ${userDetails._id}`);
            // }
        }
        if(updated===false){
            const user={
                adminId:userDetails.adminId,
                adminSocketId:null,
                userId:userDetails._id,
                userSocketId:socket.id,
            }
            users.push(user);
            console.log(`User registered: ${userDetails._id}`);
        }
    });
  
    socket.on('private_message', (data) => {
        let userDetails;
        const cookies = cookie.parse(socket.handshake.headers.cookie || '');
        const accessToken = cookies.accessToken;
        jwt.verify(accessToken, process.env.SECRET_KEY , (err, user) => {
            if (err) {
                return res.status(403).json({ error: 'Token expired or invalid' });
            }
            userDetails=user;
        });
    let recipientSocketId;
    let qId;
    if(userDetails.role==="authority"){
        for(let i=0;i<users.length;i++){
            if(users[i].adminId===userDetails._id){
                recipientSocketId=users[i].userSocketId;
                qId=users[i].userId;
            }
        }
    }else{
        for(let i=0;i<users.length;i++){
            if(users[i].userId===userDetails._id){
                recipientSocketId=users[i].adminSocketId;
                qId=users[i].userId;
            }
        }
    }
    
    if (recipientSocketId) {
        io.to(recipientSocketId).emit('recieve_message', {
            message: data.message,
        });
        // storeMessage(data.message,qId,userDetails.UID)
        produceMessage(data.message,qId,userDetails.UID);
    } else {
        // console.log(`User  not found`);
        // storeMessage(data.message,qId,userDetails.UID)
        produceMessage(data.message,qId,userDetails.UID);
    }

    });
  
    socket.on('disconnect', () => {
        console.log("disconnected");
        let userDetails;
        const cookies = cookie.parse(socket.handshake.headers.cookie || '');
        const accessToken = cookies.accessToken;
        jwt.verify(accessToken, process.env.SECRET_KEY , (err, user) => {
            if (err) {
                return res.status(403).json({ error: 'Token expired or invalid' });
            }
            userDetails=user;
        });
    //   if (socket.username) {
    //     delete users[socket.username];
    //     console.log(`User disconnected: ${socket.username}`);
    //   }
    for(let i=0;i<users.length;i++){
        if(users[i].user1SocketId===socket.id){
            // delete user[i];
            users.splice(i,1);
            // console.log(users);
        }
    }
    });
  });

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// app.listen(8000,()=>{
//     console.log("Server started on port:8000");
// });
