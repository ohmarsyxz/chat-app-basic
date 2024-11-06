const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const userRoute = require("./Routes/userRoute");
const chatRoute = require("./Routes/chatRoute");
const messageRoute = require("./Routes/messageRoute");

const app = express();
require("dotenv").config();

app.use(express.json());
app.use(cors());
app.use("/api/users", userRoute);
app.use("/api/chats", chatRoute);
app.use("/api/messages", messageRoute);

app.get("/", (req, res) => {
  res.send("Welcome our chat app APIs");
});

const port = process.env.PORT || 5001;
const uri =
  process.env.ATLAS_URI ||
  "mongodb+srv://ohmmy:OFu5yHFTMvtCdF5i@cluster0.rednj.mongodb.net/chatApp?retryWrites=true&w=majority&appName=Cluster0";

app.listen(port, "0.0.0.0", (req, res) => {
  console.log(`Server running on port: ${port}`);
});

mongoose
  .connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connection established"))
  .catch((err) => console.log("MongoDB connection failed: ", err.message));
