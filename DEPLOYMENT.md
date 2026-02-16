# BabelChat Deployment Guide

## Prerequisites
- Vercel account
- GitHub repository connected to Vercel

## Deployment Steps

### 1. Environment Variables Setup
Add these environment variables in Vercel project settings:

**Frontend (.env.local in chat-frontend):**
```
VITE_API_URL=https://your-vercel-project.vercel.app
```

**Backend (.env in realtime-chat-backend):**
```
NODE_ENV=production
PORT=5000
```

### 2. Deploy to Vercel

#### Option A: Using Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Click "New Project"
3. Import your GitHub repository
4. Select "chat-frontend" as root directory
5. Add environment variables
6. Deploy

#### Option B: Using Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from project root
vercel --prod

# Set environment variables when prompted
```

### 3. Configure Backend
The backend automatically runs as a serverless function at `/api/`

### 4. Update Frontend API URL
Once deployed, update the `VITE_API_URL` environment variable to your Vercel deployment URL.

## Project Structure

```
├── chat-frontend/          # React + Vite frontend
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── realtime-chat-backend/  # Node.js Express backend
│   ├── api/
│   ├── server.js
│   └── package.json
└── vercel.json            # Deployment configuration
```

## Important Notes

- The database is file-based (`/tmp/database.json`) and will persist within Vercel's serverless functions
- For production use, consider migrating to a persistent database (MongoDB, PostgreSQL, etc.)
- Socket.io currently works for development but may have limitations in serverless environment
- File uploads are stored in `/tmp/uploads` and should be migrated to cloud storage (Vercel Blob, S3, etc.)

## Troubleshooting

### API Connection Issues
- Verify `VITE_API_URL` is correctly set in Vercel environment
- Check that the backend API route is accessible at `/api/`

### Database Issues
- `/tmp/` directory is ephemeral - data may be lost after function timeout
- Consider using a persistent database service

### Socket.io Issues
- Real-time features may not work reliably in serverless environment
- Alternative: Use WebSockets or HTTP polling for production
