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
// import rateLimiter from './src/middleware/rateLimiterMiddleware.js';
import logoutRoute from "./src/routes/logoutroute.js";
import jwt from "jsonwebtoken";
import { start } from "repl";
import { Portal } from './src/models/portal.model.js';
import dataRoute from "./src/routes/dataRoute.js"
import AWS from "aws-sdk";
import multer from "multer";
import cors from "cors";

// sockets
import { createServer } from 'http';
import { Server } from 'socket.io';

// kafka
import { produceMessage } from "./src/middleware/kafka.js";

// Prometheus
import client from "prom-client";
import responseTime from "response-time";

const collectDefaultMetrics= client.collectDefaultMetrics;
collectDefaultMetrics({register:client.register})

const reqResTime = new client.Histogram({
    name:"http_express_req_res_time",
    help:"This tells how much time is taken by req and res",
    labelNames:["method","route","status_code"],
    buckets:[1,50,100,200,400,500,800,1000,2000]
})

// loki
import { createLogger, transports } from 'winston';
import LokiTransport from 'winston-loki';

const options = {
  // Add your other options here
  transports: [
    new LokiTransport({
      host: 'http://192.168.119.130:3100'
    })
  ]
  // Add any other options here
};

const logger = createLogger(options);

export default logger;


const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true // Allow cookies to be sent with the request
  
  }));
  app.use(cookieParser());
  app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    next();
  });
app.set('trust proxy', 20);
app.get('/ip', (request, response) => response.send(request.ip));
app.get('/x-forwarded-for', (request, response) => response.send(request.headers['x-forwarded-for']));
// app.use(rateLimiter);
// app.use('/', route);

app.use(responseTime((req,res,time)=>{
    reqResTime.labels({
        method:req.method,
        route:req.url,
        status_code:res.statusCode,
    }).observe(time);
}))

//static files folders
connectDB();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const __public = dirname(__dirname) + "/public";


// Prometheus route
app.get("/metrics",async(req,res)=>{
    res.setHeader("Content-Type",client.register.contentType);
    const metrics= await client.register.metrics();
    res.send(metrics);
})

// Serve static files from the 'public/scripts' directory
app.use('/public', express.static(join(__dirname, '..', 'public')));
app.use('/scripts', express.static(join(__dirname, '..', 'public', 'scripts')));
app.use(express.static(__public));
// app.use(express.static("public/views"));

app.use(helmet.noSniff());
app.use(helmet.referrerPolicy({ policy: "no-referrer" }));

app.get("/", (req, res) => {
    const timestamp = new Date().toISOString(); // Get current timestam
	   // const ip = req.headers['x-forwarded-for'] || req.ip; 
//	console.log(ip);
    logger.info(`Req from ${req.ip} on / route at ${timestamp}`);
    console.log(`Req from ${req.ip} on / route at ${timestamp} on port ${req.socket.localPort}`);    res.sendFile(__public + "/views/home.html");
});

app.get("/signup", (req, res) => {
    const timestamp = new Date().toISOString(); // Get current timestam
	   // const ip = req.headers['x-forwarded-for'] || req.ip; 
//	console.log(ip);
    logger.info(`Req from ${req.ip} on / route at ${timestamp}`);
    console.log(`Req from ${req.ip} on / route at ${timestamp} on port ${req.socket.localPort}`);
    res.sendFile(__public + "/views/sign_up.html");
});

app.get("/adminVerification", authenticateToken, (req, res) => {
    logger.info('Req recieved on /adminVerification route');
    res.sendFile(__public + "/views/registerAuthority.html");
});

app.get("/login", (req, res) => {
    logger.info('Req recieved on / route');
    res.sendFile(__public + "/views/login.html");
});


// app.get("/home", authenticateToken, (req, res) => {
//     res.sendFile(__public + "/views/home.html");
// });


app.get("/userLogin", authenticateToken, async (req, res) => {
    logger.info('Req recieved on /userLogin route');
    res.sendFile(__public + "/views/create_query.html");
});

app.get("/submitQuery", authenticateToken, async (req, res) => {
    logger.info('Req recieved on /submitQuery route');
    res.sendFile(__public + "/views/create_query.html");
});

// app.get("/adminLogin", authenticateToken, (req, res) => {
//     res.sendFile(__public + "/views/loginAuthority.html");
// });

app.get("/temp", authenticateToken, (req, res) => {
    logger.info('Req recieved on /temp route');
    res.sendFile(__public + "/views/temp.html");
});

app.get("/chat", authenticateToken, (req, res) => {
    logger.info('Req recieved on /chat route');
    if(req.user.role === "authority"){
        res.sendFile(__public + "/views/adminChat.html");

    }else if(req.user.role === "querier"){
        res.sendFile(__public + "/views/userChat.html");

    }
    // res.sendFile(__public + "/views/userChat.html");
})

app.get("/dashboard", authenticateToken, (req, res) => {
    logger.info('Req recieved on /dashboard  route');
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


//redis------------------------------------------------------------------------------->
import { createClient } from 'redis';

// Create Redis clients for publishing and subscribing
const redisPubClient = createClient();
const redisSubClient = createClient();

redisPubClient.connect();
redisSubClient.connect();

redisSubClient.on('error', (err) => console.error('Redis Client Error', err));
redisPubClient.on('error', (err) => console.error('Redis Client Error', err));

redisSubClient.on('connect', () => console.log('Connected to Redis'));
redisPubClient.on('connect', () => console.log('Connected to Redis'));

redisSubClient.subscribe('user_update', (message) => {
    const { action, user } = JSON.parse(message);

    switch (action) {
        case 'add-admin':
            // users.push(user);
            console.log("add-admin",user);
            if( !users.includes(user)){
                users.push(user);
            };
            break;
        case 'add-user':
            // users.push(user);
            console.log("add-user",user);
            if( !users.includes(user)){
                users.push(user);
            };
            break;
        case 'update-admin':
            console.log("update-admin",user);
            for(let i=0;i<users.length;i++){
                if(users[i].adminId===user._id){
                    users[i]=user;
                    // updated = true;
                    // console.log(User SocketId updated: ${user._id});
                    // count++;
                    // publishUserUpdate('update-admin', users[i]);
                }
            };
            break;
        case 'update-user':
            console.log("update-user",user);
            for(let i=0;i<users.length;i++){
                if(users[i].userId===user){
                    users[i]=user;
                    // updated = true;
                    // publishUserUpdate('update-user', users[i]);
                    console.log(`User SocketId updated: ${user._id}`);
                }
                // else if(users[i].adminId===userDetails.adminId){
                //     users[i].userSocketId=socket.id;
                //     updated = true;
                //     console.log(User SocketId updated: ${userDetails._id});
                // }
            }
            break;
        case 'remove':
            console.log("remove",user);
            // users.splice(i,1);
            for(let i=0;i<users.length;i++){
                if(users[i].user1SocketId===user.user1SocketId){
                    // delete user[i];
                    users.splice(i,1);
                    // publishUserUpdate('remove', users[i]);
                    // console.log(users);
                }
            }
            break;
    }
    console.log(`User list updated: ${JSON.stringify(users)}`);
});

function publishUserUpdate(action, user) {
    const message = JSON.stringify({ action, user });
    redisPubClient.publish('user_update', message);
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
                publishUserUpdate('update-admin', users[i]);
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
            publishUserUpdate('add-admin', user);
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
                // publishUserUpdate('update-user', users[i]);
                console.log(`User SocketId updated: ${userDetails._id}`);
            }
            // else if(users[i].adminId===userDetails.adminId){
            //     users[i].userSocketId=socket.id;
            //     updated = true;
            //     console.log(User SocketId updated: ${userDetails._id});
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
            // publishUserUpdate('add-user', user);
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
    console.log(recipientSocketId);
    if (recipientSocketId) {
        io.to(recipientSocketId).emit('recieve_message', {
            message: data.message,
        });
        produceMessage(data.message,qId,userDetails.UID);
    } else {
        produceMessage(data.message,qId,userDetails.UID);
    }

    });



    const s3 = new AWS.S3({
        region: process.env.AWS_REGION,
        credentials:{
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
    });
    
    const storage = multer.memoryStorage();
    const upload = multer({ storage });
    
    socket.on('upload', (data) => {
        let userDetails;
        const cookies = cookie.parse(socket.handshake.headers.cookie || '');
        const accessToken = cookies.accessToken;
    
        jwt.verify(accessToken, process.env.SECRET_KEY, (err, user) => {
            if (err) {
                return socket.emit('error', { error: 'Token expired or invalid' });
            }
            userDetails = user;
            
            const fileBuffer = data.fileBuffer;
            const fileName = `${Date.now()}_${data.originalname}`;
            const fileMimeType = data.mimetype;
    
            const params = {
                Bucket: process.env.S3_BUCKET_NAME, // The name of your S3 bucket
                Key: `uploads/${fileName}`, // File name in S3
                Body: fileBuffer,  // Send the buffer directly
                ContentType: fileMimeType,
            };
    
            s3.upload(params, async (error, data) => {
                if (error) {
                    console.error("Error uploading file to S3:", error);
                    return socket.emit('error', { error: 'Failed to upload file.' });
                } else {
                    let recipientSocketId;
                    let qId;
    
                    if (userDetails.role === "authority") {
                        for (let i = 0; i < users.length; i++) {
                            if (users[i].adminId === userDetails._id) {
                                recipientSocketId = users[i].userSocketId;
                                qId = users[i].userId;
                            }
                        }
                    } else {
                        for (let i = 0; i < users.length; i++) {
                            if (users[i].userId === userDetails._id) {
                                recipientSocketId = users[i].adminSocketId;
                                qId = users[i].userId;
                            }
                        }
                    }
    
                    console.log(recipientSocketId);
    
                    if (recipientSocketId) {
                        io.to(recipientSocketId).emit('recieve_message', {
                            message: data.Location,
                        });
                        produceMessage(data.Location, qId, userDetails.UID);
                    } else {
                        produceMessage(data.Location, qId, userDetails.UID);
                    }
                    recipientSocketId=null;
                    qid = null;
                }
            });
        });
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
    //     console.log(User disconnected: ${socket.username});
    //   }
    for(let i=0;i<users.length;i++){
        if(users[i].user1SocketId===socket.id){
            // delete user[i];
            users.splice(i,1);
            // publishUserUpdate('remove', users[i]);
            // console.log(users);
        }
    }
    });
  });

const PORT = process.env.PORT || 8001;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});



// app.listen(8000,()=>{
//     console.log("Server started on port:8000");
// });