import dotenv from "dotenv";
import connectDB  from "./db/index.js"
import app from "./app.js";

dotenv.config();

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`server is running on port ${process.env.PORT || 8000}`);
    })
})
.catch((err)=>{
    console.log("mongo db connection failed", err)
})