import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectDB from './config/db.js'
import './config/instrument.js'
import * as Sentry from "@sentry/node";
import { clerkWebhooks } from './controllers/webhooks.js'
import companyRoutes from './routes/companyRoutes.js'
import connectCloudinary from './config/cloudinary.js'
import jobRoutes from './routes/jobRoutes.js'
import userRoutes from './routes/userRoutes.js'
import { clerkMiddleware } from '@clerk/express'
import chatbotRoutes from './routes/ChatbotRoutes.js';
import reportRoutes from './routes/reportRoutes.js';


// Initialize Express
const app = express()

// Connect to database and cloudinary
await connectDB()
await connectCloudinary()

// Middlewares
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173','https://hireconnect-centralised-hiring-platform.onrender.com'
],
    credentials: true
}))

// Raw body parser for webhooks (before express.json())
app.use('/webhooks', express.raw({ type: 'application/json' }))

app.use(express.json())
app.use(clerkMiddleware())
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/reports', reportRoutes);
app.use('/reports', express.static('reports'));
// Routes
app.get('/', (req, res) => res.send("Job Portal API Working"))

app.get("/debug-sentry", function mainHandler(req, res) {
    throw new Error("My first Sentry error!");
});

// Webhook route (should be before other routes)
app.post('/webhooks', clerkWebhooks)

// API routes
app.use('/api/company', companyRoutes)
app.use('/api/jobs', jobRoutes)
app.use('/api/users', userRoutes)

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// Port
const PORT = process.env.PORT || 5000

// Sentry error handler (should be last)
Sentry.setupExpressErrorHandler(app);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})