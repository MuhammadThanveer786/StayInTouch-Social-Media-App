import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './configs/db.js';
import { inngest, functions } from './inngest/index.js';
import { serve } from "inngest/express";   // ✅ import serve

const app = express(); // this is my server

await connectDB();

app.use(express.json());
app.use(cors()); // this middleware allows frontend to talk to backend if on different ports

app.get('/', (req, res) => res.send('Server is running'));

// ✅ correct route for Inngest functions
app.use('/api/inngest', serve({ client: inngest, functions }));

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
