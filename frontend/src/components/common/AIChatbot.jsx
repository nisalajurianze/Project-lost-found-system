import React, { useState, useRef, useEffect } from 'react';
import { FiMessageSquare, FiX, FiSend, FiMic, FiTrash2 } from 'react-icons/fi';
import { FaSearch, FaRobot } from 'react-icons/fa';
import api from '../../services/api';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Hi! Tell me what you lost or found, and I\'ll search the database for you. You can even type in Singlish (e.g. "mage phone eka nathi wuna")!', timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [quickReplies, setQuickReplies] = useState(["I lost something", "I found something"]);
  const messagesEndRef = useRef(null);
  const chatWindowRef = useRef(null);
  const floatingBtnRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && 
          chatWindowRef.current && 
          !chatWindowRef.current.contains(event.target) &&
          floatingBtnRef.current &&
          !floatingBtnRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, quickReplies, isLoading]);

  const handleSend = async (e, customMessage = null) => {
    e?.preventDefault();
    const userMessage = customMessage || input.trim();
    if (!userMessage || isLoading) return;

    // Save current history to send
    const historyToSend = [...messages];
    const currentTime = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: currentTime }]);
    setInput('');
    setQuickReplies([]);
    setIsLoading(true);

    try {
      const res = await api.post('/ai/chat', { message: userMessage, history: historyToSend });
      const reply = res.data?.data?.text || "Sorry, I couldn't understand that.";
      const replies = res.data?.data?.quickReplies || [];
      const replyTime = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      
      // Play a subtle pop sound for AI reply using Web Audio API (no external files needed)
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          osc.type = 'sine';
          // A quick high-to-low frequency sweep makes a nice "pop" or "bloop" sound
          osc.frequency.setValueAtTime(600, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
          
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
          
          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          osc.start();
          osc.stop(ctx.currentTime + 0.1);
        }
      } catch (err) {
        console.error("Audio play failed:", err);
      }

      setMessages(prev => [...prev, { role: 'ai', content: reply, timestamp: replyTime }]);
      setQuickReplies(replies);
    } catch (error) {
      console.error(error);
      toast.error('Failed to connect to AI Assistant.');
      setMessages(prev => [...prev, { role: 'ai', content: 'Oops! Something went wrong. Please try again later.', timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      { role: 'ai', content: 'Chat history cleared. How can I help you now?', timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
    ]);
    setQuickReplies(["I lost something", "I found something"]);
  };

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Your browser doesn't support voice input.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; // Works reasonably well for Singlish too
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      toast.success("Listening...", { icon: '🎤', duration: 2000 });
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + " " + transcript);
    };

    recognition.onerror = (event) => {
      console.error(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <>
      {/* Floating Button */}
      <button
        ref={floatingBtnRef}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-[72px] right-4 sm:bottom-6 sm:right-6 p-3 sm:p-4 rounded-full bg-primary-600 text-white shadow-xl hover:bg-primary-700 transition-transform duration-300 z-50 ${isOpen ? 'scale-0' : 'scale-100 hover:scale-110'}`}
        aria-label="Open AI Assistant"
      >
        <FiMessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Chat Window */}
      <div
        ref={chatWindowRef}
        className={`fixed bottom-[72px] right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-[400px] bg-white dark:bg-surface-800 rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-700 flex flex-col overflow-hidden transition-all duration-300 z-50 origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}
        style={{ height: '500px', maxHeight: 'calc(100vh - 7rem)' }}
      >
        {/* Header */}
        <div className="bg-white dark:bg-surface-800 p-3 sm:p-4 flex justify-between items-center shrink-0 border-b border-surface-200 dark:border-surface-700 z-10">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-primary-500 dark:text-primary-400">
              <img src="/logo.png" alt="Smart L&F Logo" className="h-[26px] w-[26px] object-contain translate-y-0.5" />
              <h3 className="font-black text-[22px] tracking-[-0.02em] leading-none">
                Smart L&F
              </h3>
            </div>
            <div className="flex items-center gap-1 ml-[30px]">
              <span className="text-[10px] bg-gradient-to-r from-primary-500 to-primary-600 text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                <FaRobot className="w-3 h-3" /> AI Assistant
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleClearChat}
              title="Clear Chat"
              className="text-surface-400 hover:text-red-500 p-1.5 rounded-md hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 p-1 rounded-md hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[85%] p-3 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white rounded-br-sm'
                    : 'bg-surface-100 dark:bg-surface-700 text-surface-900 dark:text-surface-100 rounded-bl-sm prose prose-sm dark:prose-invert max-w-none'
                }`}
              >
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <ReactMarkdown
                    components={{
                      a: ({ node, ...props }) => {
                        const isInternal = props.href && props.href.startsWith('/');
                        if (isInternal) {
                          return (
                            <Link 
                              to={props.href} 
                              className="text-primary-600 dark:text-primary-400 font-semibold underline hover:text-primary-700 dark:hover:text-primary-300"
                              onClick={() => setIsOpen(false)}
                            >
                              {props.children}
                            </Link>
                          );
                        }
                        return (
                          <a 
                            {...props} 
                            className="text-primary-600 dark:text-primary-400 font-semibold underline hover:text-primary-700 dark:hover:text-primary-300" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                          />
                        );
                      }
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                )}
              </div>
              <span className="text-[10px] text-surface-400 mt-1 px-1">
                {msg.timestamp}
              </span>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-surface-100 dark:bg-surface-700 p-4 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-surface-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-surface-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-surface-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          
          {/* Quick Replies */}
          {!isLoading && quickReplies.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2 justify-start">
              {quickReplies.map((reply, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(null, reply)}
                  className="px-3 py-1.5 text-xs font-medium bg-surface-50 hover:bg-surface-100 dark:bg-surface-800 dark:hover:bg-surface-700 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800/50 rounded-full transition-colors cursor-pointer"
                >
                  {reply}
                </button>
              ))}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-3 border-t border-surface-200 dark:border-surface-700 shrink-0 bg-white dark:bg-surface-800">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a lost or found item..."
              className="w-full bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-full pl-4 pr-24 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            />
            <div className="absolute right-1 flex items-center gap-1">
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2 rounded-full transition-colors ${
                  isListening 
                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 animate-pulse' 
                    : 'text-surface-400 hover:text-primary-600 hover:bg-surface-200 dark:hover:bg-surface-800'
                }`}
                title="Voice Input"
              >
                <FiMic className="w-4 h-4" />
              </button>
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mr-1"
              >
                <FiSend className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default AIChatbot;
