import express from 'express';
import { chatWithBot, getChatbotStatus } from '../controllers/chatbotController.js';

const router = express.Router();

// Public routes - no authentication needed
router.post('/chat', chatWithBot);
router.get('/status', getChatbotStatus);

export default router;