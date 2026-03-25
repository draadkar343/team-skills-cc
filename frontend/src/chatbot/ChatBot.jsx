import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { findAnswer, getGreeting } from './knowledge';
import api from '../api/axiosInstance';

function renderText(text) {
  // Render **bold** and \n line breaks
  return text.split('\n').map((line, i) => {
    const parts = line.split(/\*\*(.+?)\*\*/g);
    return (
      <span key={i}>
        {parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
        {i < text.split('\n').length - 1 && <br />}
      </span>
    );
  });
}

export default function ChatBot() {
  const { user } = useAuth();
  const role = user?.role || 'employee';

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [llmMode, setLlmMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Initialise with greeting when first opened
  useEffect(() => {
    if (open && messages.length === 0) {
      const { response, suggestions: sugg } = getGreeting(role);
      setMessages([{ from: 'bot', text: response }]);
      setSuggestions(sugg);
    }
  }, [open]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // When switching modes, add a transition message
  const toggleMode = () => {
    const next = !llmMode;
    setLlmMode(next);
    setSuggestions([]);
    const note = next
      ? 'Switched to **AI Assistant** mode. I can now answer more detailed questions about the app.'
      : 'Switched to **Quick Help** mode. Ask me about any feature to get a fast answer.';
    setMessages(prev => [...prev, { from: 'bot', text: note }]);
    if (!next) setSuggestions(getGreeting(role).suggestions);
  };

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg = { from: 'user', text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSuggestions([]);

    if (llmMode) {
      setLoading(true);
      try {
        // Build history from current messages (exclude the one we just added)
        const history = messages.map(m => ({ from: m.from, text: m.text }));
        const { data } = await api.post('/chat', { message: trimmed, history, role });
        setMessages(prev => [...prev, { from: 'bot', text: data.reply }]);
      } catch (err) {
        const msg = err.response?.data?.error || 'Sorry, I couldn\'t reach the AI assistant. Try Quick Help mode instead.';
        setMessages(prev => [...prev, { from: 'bot', text: msg }]);
      } finally {
        setLoading(false);
      }
    } else {
      const answer = findAnswer(trimmed, role);
      if (answer) {
        setTimeout(() => {
          setMessages(prev => [...prev, { from: 'bot', text: answer.response }]);
          setSuggestions(answer.suggestions || []);
        }, 300);
      } else {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            from: 'bot',
            text: "I'm not sure about that. Try asking about skills, timesheets, certifications, your profile, or switch to **AI Assistant** mode for more help.",
          }]);
          setSuggestions(getGreeting(role).suggestions);
        }, 300);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-80 sm:w-96 flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
          style={{ maxHeight: '520px' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white">
            <div className="flex items-center gap-2">
              <span className="text-lg">💬</span>
              <div>
                <p className="font-semibold text-sm leading-tight">App Assistant</p>
                <p className="text-xs text-blue-200 capitalize">{role} guide</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Mode toggle */}
              <button
                onClick={toggleMode}
                title={llmMode ? 'Switch to Quick Help' : 'Switch to AI Assistant'}
                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                  llmMode
                    ? 'bg-white text-blue-600 border-white'
                    : 'bg-blue-500 text-blue-100 border-blue-400 hover:bg-blue-400'
                }`}
              >
                {llmMode ? '🤖 AI' : '⚡ Quick'}
              </button>
              <button onClick={() => setOpen(false)} className="text-blue-200 hover:text-white text-lg leading-none">✕</button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed
                  ${msg.from === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-sm'
                  }`}>
                  {renderText(msg.text)}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-2xl rounded-bl-sm">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}

            {/* Suggestions */}
            {!loading && suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-blue-300 text-blue-600 dark:text-blue-400 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t border-gray-200 dark:border-gray-700">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={llmMode ? 'Ask the AI assistant…' : 'Ask me anything…'}
              disabled={loading}
              className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60"
            />
            <button type="submit" disabled={!input.trim() || loading}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors">
              Send
            </button>
          </form>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-4 right-4 z-50 w-13 h-13 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
        style={{ width: '52px', height: '52px' }}
        title="App Assistant"
      >
        {open ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>
    </>
  );
}
