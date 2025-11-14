import React, { useState, useEffect, useRef, useContext } from 'react';
import { X, Send, MessageCircle, Loader, Bot, User, Minimize2, Maximize2 } from 'lucide-react';
import { AppContext } from '../context/AppContext';

const Chatbot = () => {
  const { backendUrl } = useContext(AppContext);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! 👋 I\'m your AI assistant. I can help you with:\n\n• Job applications and career advice\n• Resume tips and interview preparation\n• Learning resources (DBMS, Programming, Web Dev)\n• Company information and benefits\n• Salary insights and more!\n\nWhat would you like to know?',
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  // Format message content to render markdown-like syntax
  const formatMessage = (content) => {
    if (!content) return '';

    // Split by lines
    const lines = content.split('\n');
    const formattedLines = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // Handle headers (###, ##, #)
      if (line.startsWith('### ')) {
        formattedLines.push(
          <h3 key={i} className="text-lg font-bold mt-3 mb-2 text-gray-900">
            {line.replace('### ', '')}
          </h3>
        );
      } else if (line.startsWith('## ')) {
        formattedLines.push(
          <h2 key={i} className="text-xl font-bold mt-4 mb-2 text-gray-900">
            {line.replace('## ', '')}
          </h2>
        );
      } else if (line.startsWith('# ')) {
        formattedLines.push(
          <h1 key={i} className="text-2xl font-bold mt-4 mb-2 text-gray-900">
            {line.replace('# ', '')}
          </h1>
        );
      }
      // Handle bullet points
      else if (line.trim().startsWith('• ') || line.trim().startsWith('- ')) {
        const text = line.trim().replace(/^[•\-]\s*/, '');
        formattedLines.push(
          <div key={i} className="flex items-start ml-2 my-1">
            <span className="mr-2 mt-1.5 text-blue-600">•</span>
            <span>{processInlineFormatting(text)}</span>
          </div>
        );
      }
      // Handle numbered lists
      else if (line.trim().match(/^\d+\.\s/)) {
        const text = line.trim().replace(/^\d+\.\s*/, '');
        const number = line.trim().match(/^(\d+)\./)[1];
        formattedLines.push(
          <div key={i} className="flex items-start ml-2 my-1">
            <span className="mr-2 font-semibold text-blue-600">{number}.</span>
            <span>{processInlineFormatting(text)}</span>
          </div>
        );
      }
      // Handle code blocks
      else if (line.trim().startsWith('```')) {
        const codeLines = [];
        i++; // Skip the opening ```
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        formattedLines.push(
          <pre key={i} className="bg-gray-800 text-green-400 p-3 rounded-lg my-2 overflow-x-auto text-sm">
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
      }
      // Handle horizontal rules
      else if (line.trim() === '---' || line.trim() === '***') {
        formattedLines.push(<hr key={i} className="my-3 border-gray-300" />);
      }
      // Handle empty lines
      else if (line.trim() === '') {
        formattedLines.push(<div key={i} className="h-2" />);
      }
      // Regular paragraphs
      else {
        formattedLines.push(
          <p key={i} className="my-1">
            {processInlineFormatting(line)}
          </p>
        );
      }
    }

    return formattedLines;
  };

  // Process inline formatting like **bold**, *italic*, `code`
  const processInlineFormatting = (text) => {
    const parts = [];
    let currentIndex = 0;
    let key = 0;

    // Handle bold text (***text*** or **text**)
    const boldRegex = /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*/g;
    let match;
    let lastIndex = 0;

    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      // Add bold text
      parts.push(
        <strong key={key++} className="font-bold text-gray-900">
          {match[1] || match[2]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    // If no formatting found, return original text
    return parts.length > 0 ? parts : text;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');

    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      // Prepare conversation history (last 5 exchanges = 10 messages)
      const conversationHistory = messages
        .slice(-10)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      // Make actual API call to your backend
      const response = await fetch(`${backendUrl}/api/chatbot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory
        }),
        timeout: 30000
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: data.timestamp || new Date().toISOString(),
          provider: data.provider
        };

        setMessages(prev => [...prev, assistantMessage]);
        setProvider(data.provider);
      } else {
        throw new Error(data.message || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage = {
        role: 'assistant',
        content: 'I apologize, but I\'m having trouble responding right now. Please try again in a moment, or contact support for immediate assistance.',
        timestamp: new Date().toISOString(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Chat cleared! How can I help you today?',
        timestamp: new Date().toISOString()
      }
    ]);
  };

  const quickQuestions = [
    'How do I apply for a job?',
    'Tell me about Zoho',
    'Resume tips',
    'Interview preparation',
    'Palindrome program in Python'
  ];

  const handleQuickQuestion = (question) => {
    setInputMessage(question);
    setTimeout(() => handleSendMessage(), 100);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 z-50 group"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Chat with AI Assistant
        </div>
      </button>
    );
  }

  return (
    <div 
      className={`fixed z-50 transition-all duration-300 ${
        isMinimized 
          ? 'bottom-6 right-6 w-80' 
          : 'bottom-6 right-6 w-96 h-[600px] max-h-[80vh]'
      }`}
    >
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col h-full border border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Bot className="w-6 h-6" />
              <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></span>
            </div>
            <div>
              <h3 className="font-semibold text-lg">AI Assistant</h3>
              {provider && (
                <p className="text-xs opacity-80">
                  Powered by {provider === 'gemini' ? 'Gemini' : 'AI'}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`flex items-start space-x-2 max-w-[85%] ${
                      message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : message.isError
                          ? 'bg-red-100 text-red-600'
                          : 'bg-purple-100 text-purple-600'
                      }`}
                    >
                      {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : message.isError
                          ? 'bg-red-50 text-red-900 border border-red-200'
                          : 'bg-white text-gray-800 border border-gray-200'
                      }`}
                    >
                      <div className="text-sm break-words">
                        {message.role === 'user' ? (
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        ) : (
                          <div className="formatted-content">
                            {formatMessage(message.content)}
                          </div>
                        )}
                      </div>
                      <p
                        className={`text-xs mt-2 ${
                          message.role === 'user' ? 'text-blue-200' : 'text-gray-400'
                        }`}
                      >
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-2">
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Questions */}
            {messages.length <= 2 && (
              <div className="p-4 border-t border-gray-200 bg-white">
                <p className="text-xs text-gray-500 mb-2 font-medium">Quick questions:</p>
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.slice(0, 3).map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickQuestion(question)}
                      className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors border border-blue-200"
                      disabled={isLoading}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
              <div className="flex items-end space-x-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    rows="1"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                    disabled={isLoading}
                    style={{ minHeight: '48px', maxHeight: '120px' }}
                  />
                  {messages.length > 2 && (
                    <button
                      onClick={clearChat}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 text-xs"
                      title="Clear chat"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                Press Enter to send • Shift+Enter for new line
              </p>
            </div>
          </>
        )}

        {isMinimized && (
          <div className="p-4 text-center">
            <p className="text-sm text-gray-600">Chat minimized</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chatbot;