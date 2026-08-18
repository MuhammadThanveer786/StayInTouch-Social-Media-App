import mongoose from "mongoose";

const connectDB = async () => {
  try {
    mongoose.connection.on("connected", () => {
      console.log("Database connected");
      console.log("Database name:", mongoose.connection.name);
      console.log("Database host:", mongoose.connection.host);
    });

    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "StayINTouch"
    });

  } catch (error) {
    console.log(error.message);
  }
};

export default connectDB;