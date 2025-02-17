import express from "express";
import cors from "cors";
import connect from "./db/db.js";
import morgan from "morgan";
import cookieParser from "cookie-parser";
connect();
import userRoutes from "./routes/user.routes.js";
import projectRoutes from "./routes/project.routes.js";
import aiRoutes from "./routes/ai.routes.js"
const app = express();
app.use(morgan('dev'));
app.use(express.json());
app.use(cors());
app.use(cookieParser());
app.get('/', (req, res) => {
    res.send('Hello World');
});

app.use('/users', userRoutes);
app.use('/projects', projectRoutes);
app.use('/ai', aiRoutes)
export default app;