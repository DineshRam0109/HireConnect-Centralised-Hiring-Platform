import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

class ChatbotService {
  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.model = "gemini-2.5-flash";
    this.geminiBaseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;

    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: { "Content-Type": "application/json" },
    });

    // Enhanced system prompt for comprehensive capabilities
    this.systemPrompt = `You are a versatile AI assistant that can help with ANY topic or question. You have NO restrictions on what you can discuss or explain.

=== YOUR CAPABILITIES (Answer ALL of these) ===

✅ GENERAL KNOWLEDGE & INFORMATION:
- Explain ANY company, technology, product, or service (e.g., Zoho, Microsoft, Google, etc.)
- Discuss science, history, current events, and any topic
- Provide detailed explanations about anything the user asks
- Answer questions about the world, technology, business, etc.

✅ PROGRAMMING & CODE:
- Write code in ANY programming language (Python, JavaScript, Java, C++, etc.)
- Create programs, algorithms, and solutions
- Provide palindrome checkers, sorting algorithms, data structures
- Debug and optimize code
- Explain programming concepts

✅ LEARNING & EDUCATION:
- Teach any subject or concept
- Provide tutorials and step-by-step guides
- Explain complex topics in simple terms
- Recommend learning resources


=== IMPORTANT RULES ===
1. Answer EVERY question the user asks - do not refuse or say something is outside your scope
2. If asked about external companies (Zoho, Google, etc.), provide information about them
3. If asked for code examples, provide complete working code
4. Be conversational, helpful, and informative
5. Never say "I cannot provide information about X" - you CAN answer everything

Examples of what you SHOULD do:
- User: "Tell me about Zoho" → Explain what Zoho is, their products, services
- User: "Palindrome program" → Provide complete code with explanation
- User: "What is MERN stack?" → Explain MongoDB, Express, React, Node.js
- User: "How to apply for jobs?" → Explain the job portal application process
Answer everything!`;
  }

  async chat(userMessage, conversationHistory = []) {
    if (!conversationHistory) conversationHistory = [];

    try {
      console.log("Processing message with Gemini API...");
      const geminiResponse = await this.chatWithGemini(
        userMessage,
        conversationHistory
      );
      return {
        success: true,
        response: geminiResponse,
        provider: "gemini",
      };
    } catch (err) {
      console.error("Gemini API error:", err.message);
      
      // Provide helpful fallback response
      return {
        success: false,
        response: this.getFallbackResponse(userMessage),
        provider: "fallback",
        error: err.message,
      };
    }
  }

  async chatWithGemini(userMessage, conversationHistory) {
    if (!this.geminiApiKey) {
      throw new Error("Gemini API key not configured. Check .env file");
    }

    // Build conversation contents
    const contents = [];

    // Add system prompt as first message if history is empty
    if (conversationHistory.length === 0) {
      contents.push({
        role: "user",
        parts: [{ text: this.systemPrompt }],
      });
      contents.push({
        role: "model",
        parts: [{ text: "I understand. I'm ready to assist with job portal queries, programming help, general knowledge questions, and more. How can I help you today?" }],
      });
    }

    // Add conversation history
    conversationHistory.forEach((msg) => {
      contents.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      });
    });

    // Add current user message
    contents.push({
      role: "user",
      parts: [{ text: userMessage }],
    });

    const requestBody = {
      contents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048, // Increased for longer responses
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
      ],
    };

    const url = `${this.geminiBaseUrl}?key=${this.geminiApiKey}`;
    console.log("Making Gemini API request...");

    const response = await this.axiosInstance.post(url, requestBody);

    // Parse response
    const candidate = response.data?.candidates?.[0];
    
    if (candidate?.content?.parts?.[0]?.text) {
      return candidate.content.parts[0].text.trim();
    } else if (response.data?.promptFeedback?.blockReason) {
      throw new Error(`Content blocked: ${response.data.promptFeedback.blockReason}`);
    } else if (candidate?.finishReason === "SAFETY") {
      throw new Error("Response blocked by safety filters");
    }

    throw new Error("Invalid response structure from Gemini API");
  }

  getFallbackResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase();

    // Check for programming-related keywords
    if (lowerMessage.includes("program") || lowerMessage.includes("code") || 
        lowerMessage.includes("palindrome") || lowerMessage.includes("algorithm")) {
      return `I'd be happy to help with programming! However, I'm currently experiencing technical difficulties with my AI service. 

Here's a basic palindrome checker program as an example:

JavaScript:
\`\`\`javascript
function isPalindrome(str) {
  const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, '');
  return cleaned === cleaned.split('').reverse().join('');
}

console.log(isPalindrome("racecar")); // true
console.log(isPalindrome("hello")); // false
\`\`\`

Python:
\`\`\`python
def is_palindrome(s):
    cleaned = ''.join(c.lower() for c in s if c.isalnum())
    return cleaned == cleaned[::-1]

print(is_palindrome("racecar"))  # True
print(is_palindrome("hello"))    # False
\`\`\`

Please try your question again, or let me know if you need help with something else!`;
    }

    // Default fallback
    return "I apologize, but I'm currently experiencing technical difficulties. Please try your question again in a moment, or rephrase it if you'd like. I'm here to help with job portal features, programming questions, general knowledge, and more!";
  }

  // Helper method to reset conversation
  resetConversation() {
    return {
      success: true,
      message: "Conversation history cleared. How can I help you?",
    };
  }

  // Helper method to get chatbot status
  getStatus() {
    return {
      model: this.model,
      apiConfigured: !!this.geminiApiKey,
      capabilities: [
        "Job Portal Assistance",
        "Programming Help",
        "General Knowledge",
        "Code Examples",
        "Problem Solving",
      ],
    };
  }
}

export default ChatbotService;