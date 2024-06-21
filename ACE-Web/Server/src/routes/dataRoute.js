import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { Portal } from '../models/portal.model.js';
import bodyParser from "body-parser";


const app = express();
const router = express.Router();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// router.get('/data',authenticateToken, async (req,res)=>{
//     const UID = req.user.UID;
//     const userId = req.user._id;
//     const messages = [];
//     console.log(req.user.UID)

//     const currentPortal = await Portal.find({ UID: UID, })
//     console.log(currentPortal)
//     const allPortals = currentPortal.portals

//     for(port of allPortals){
//         if (port.querierId == req.user._id) {
//             messages = port.messages
//         }
//     }

//     res.json({data: messages})
// })

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