import express from 'express';
import dotenv from 'dotenv';
import userRoutes from './routes/user.routes';
import trainingRoutes from "./routes/training.routes";
import cookieParser from 'cookie-parser';
import exerciseRoutes from "./routes/exercise.routes";
import setRoutes from "./routes/set.routes";

dotenv.config();

const app = express();

app.use(cookieParser());
app.use(express.json());

app.use('/api/users', userRoutes);
app.use("/api/training", trainingRoutes);
app.use("/api/exercise", exerciseRoutes)
app.use("/api/set", setRoutes)

export default app;
