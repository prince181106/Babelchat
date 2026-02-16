import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import serverModule from "../server.js";

const app = express();

// Export for Vercel Serverless Functions
export default app;
