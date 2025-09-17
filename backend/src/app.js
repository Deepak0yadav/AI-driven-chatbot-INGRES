import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import queryRoute from "./routes/query.js";
import { connectDB } from "./db/db.js";

// import errorHandler from "./middleware/errorHandler.js";

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));


connectDB();
app.get("/", (req, res) => res.send("INGRES Chatbot Backend ✅"));

app.use("/api/query", queryRoute);    

// app.use(errorHandler);

export default app;
