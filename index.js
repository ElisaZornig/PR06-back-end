import express from 'express';
import mongoose from "mongoose";
import Song from "./models/Song.js";
import songsRouter from "./routes/songsRouter.js";

const app = express();
await mongoose.connect(process.env.MONGODB_URL);
app.use(express.json())
app.use(express.urlencoded({extended:true}));

app.use((req, res, next)=>{
    const acceptHeader = req.headers['accept'];

    if (acceptHeader.includes('application/json') || req.method === "OPTIONS") {
        next()
    } else {
        res.status(406).send('Deze webservice accepteert alleen een application/json for accept');
    }
})
app.use((req, res, next)=>{
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, Content-type, Accept');
    next()
})

app.use((req, res, next)=>{
    const contentTypeHeader = req.headers['content-type'];
    if (req.method === "PUT" || req.method === "POST") {
        if (contentTypeHeader.includes('application/json') || contentTypeHeader.includes('x-www-form-urlencoded')) {
            next()
        } else {
            res.status(400).send('Deze webservice accepteert alleen een JSON-repsonse of een x-www-form-urlencoded');
        }
    }else{
        next()
    }
})

app.use('/songs', songsRouter)

app.listen(process.env.EXPRESS_PORT, () => {
    console.log(`Server is listening on port ${process.env.EXPRESS_PORT}`);
});