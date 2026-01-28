import mongoose from "mongoose";
import "dotenv/config";
function connect() {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("Database connected");
    })
    .catch((err) => {
      console.log(err);
    });
}

export default connect;
