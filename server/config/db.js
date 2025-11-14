import mongoose from "mongoose";
import dotenv from 'dotenv';
dotenv.config();


//Function to connect to mongodb database

const connectDB=async()=>{
    mongoose.set('strictPopulate', false);

    mongoose.connection.on('connected',()=>console.log('Database Connected'));

    await mongoose.connect(`${process.env.MONGODB_URI}`);
}

export default connectDB