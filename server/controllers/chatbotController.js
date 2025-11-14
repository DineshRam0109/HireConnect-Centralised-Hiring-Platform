import ChatbotService from "../services/ChatbotService.js";

export const chatWithBot = async (req, res) => {
    try {
        const { message, conversationHistory } = req.body;

        if (!message || !message.trim()) {
            return res.json({
                success: false,
                message: 'Message is required'
            });
        }

        console.log('Chatbot request:', {
            message: message.substring(0, 50) + '...',
            historyLength: conversationHistory?.length || 0
        });

        const chatbotService = new ChatbotService();
        const result = await chatbotService.chat(
            message.trim(),
            conversationHistory || []
        );

        console.log('Chatbot response:', {
            success: result.success,
            provider: result.provider,
            responseLength: result.response.length
        });

        res.json({
            success: true,
            response: result.response,
            provider: result.provider,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Chatbot error:', error);
        res.json({
            success: false,
            message: 'Failed to get chatbot response',
            error: error.message
        });
    }
};

export const getChatbotStatus = async (req, res) => {
    try {
        const chatbotService = new ChatbotService();
        
        res.json({
            success: true,
            status: {
                geminiConfigured: !!chatbotService.geminiApiKey,
                huggingFaceConfigured: !!chatbotService.huggingFaceApiKey,
                fallbackAvailable: true
            }
        });
    } catch (error) {
        console.error('Chatbot status error:', error);
        res.json({
            success: false,
            message: 'Failed to get chatbot status',
            error: error.message
        });
    }
};