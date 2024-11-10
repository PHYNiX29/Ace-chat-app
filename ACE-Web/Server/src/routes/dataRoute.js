import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { Portal } from '../models/portal.model.js';
import bodyParser from "body-parser";
import AWS from "aws-sdk";
import multer from "multer";


const app = express();
const router = express.Router();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const s3 = new AWS.S3({
    region: process.env.AWS_REGION,
    credentials:{
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload',authenticateToken,upload.single('file'), async(req, res) => {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }
    console.log("hereeee");
    const fileContent = req.file.buffer;
    const params = {
      Bucket: process.env.S3_BUCKET_NAME, // The name of your S3 bucket
      Key: `uploads/${Date.now()}_${req.file.originalname}`, // File name you want to save as in S3
      Body: fileContent,
      ContentType: req.file.mimetype
    };
  
    // Upload file to S3
    s3.upload(params, async(error, data) => {
      if (error) {
        console.error("Error uploading file to S3:", error);
        return res.status(500).send("Failed to upload file.");
      }

    const UID = req.user.UID;
    const qId = req.user.UID;

    try{
        const portal = await Portal.findOne({UID});
        //   console.log(portal);
        const targetPortal = portal.portals.find(p => p.querierId === qId);
        if (targetPortal) {
            targetPortal.messages.push(data.location);
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
      // File uploaded successfully
      res.status(200).send({
        message: "File uploaded successfully",
        fileUrl: data.Location
      });
    });
    
  });

router.get('/data',authenticateToken, async (req,res)=>{
    const UID = req.user.UID;
    const userId = req.user._id;
    const messages = [];
    console.log(req.user.UID)

    const currentPortal = await Portal.find({ UID: UID, })
    console.log(currentPortal)
    const allPortals = currentPortal.portals

    for(port of allPortals){
        if (port.querierId == req.user._id) {
            messages = port.messages
        }
    }
    res.json({data: messages})
})

router.post("/queryId",authenticateToken,async(req,res)=>{
    // console.log(req.body.id);
    if(req.user.role === "authority"){
        const queryId = req.body.id;
        const data = await Portal.findOne({ UID: req.user.UID });
        const allChats = data.portals;
        // console.log(allChats)
        allChats.forEach(element => {
            if(element.querierId === queryId){
                // console.log("reached")
                res.cookie("queryId", element.querierId, { httpOnly: true, sameSite: "strict" });
                res.json({redirect:"/chat"});
            }
        });
    }else{
        res.json({err:"Unauthorized"});
    }
});

router.get("/allData",authenticateToken,async(req,res)=>{
    // console.log(req.user);
    if(req.user.role === "authority"){
        const data = await Portal.findOne({ UID: req.user.UID });
        res.json({data:data});
    }else{
        res.json({err:"Unauthorized"});
    }
});

router.get("/allChatsAdmin",authenticateToken,async(req,res)=>{
    const qId = req.cookies.queryId;
    const data = await Portal.findOne({ UID: req.user.UID });
    const chats = data.portals.map((el)=>{
        if(el.querierId === qId ){
            res.json({messages:el.messages});
        }
    })
});

router.get("/allChatsUser",authenticateToken,async(req,res)=>{
    const data = await Portal.findOne({ UID: req.user.UID });
    const chats = data.portals.map((el)=>{
        if(el.querierId === req.user._id ){
            res.json({messages:el.messages});
        };
    })
});

router.post("/adminChat",authenticateToken,async(req,res)=>{
    // const data = await Portal.findOne({ UID: req.user.UID });
    try{
        const qId = req.cookies.queryId;
        const UID = req.user.UID;
        const portal = await Portal.findOne({
            UID
          });
        portal.portals.find(p => p.querierId === qId).messages.push(req.body.message);
        await portal.save();
        res.json({saved:"true"});

    }catch(err){
        console.log("gemini")
        console.log(err);
        res.json({saved:"false"});
    }

})

router.post("/userChat",authenticateToken,async(req,res)=>{
    // const data = await Portal.findOne({ UID: req.user.UID });
    try{
        const qId = req.user._id;
        const UID = req.user.UID;
        const portal = await Portal.findOne({
            UID
          });
        portal.portals.find(p => p.querierId === qId).messages.push(req.body.message);
        await portal.save();
    
        res.json({saved:"true"});
    }catch(err){
        console.log("gemini")
        console.log(err);
        res.json({saved:"false"});
    }

})




export default router;