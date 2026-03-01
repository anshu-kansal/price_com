import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const AIShopper = () => {

  const { user } = useAuth() || {};

  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "ai",
      text:
        "👋 Hi! I compare prices across Amazon, Flipkart & eBay.\n\nTry:\n• best headphones under 5000\n• cheap laptops\n• today deals",
      timestamp: new Date(),
    },
  ]);

  const [query, setQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  /* ---------- AUTO SCROLL ---------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  /* ---------- QUERY UNDERSTANDING ---------- */
  const understandQuery = (text) => {
    const q = text.toLowerCase();

    let category = "Product";
    let budget = null;

    if (q.includes("laptop")) category = "Laptop";
    if (q.includes("headphone")) category = "Headphones";
    if (q.includes("phone")) category = "Smartphone";
    if (q.includes("watch")) category = "Smart Watch";

    const match = q.match(/under (\d+)/);
    if (match) budget = match[1];

    return { category, budget };
  };

  /* ---------- PRICE COMPARISON SIMULATION ---------- */
  const generateComparison = ({ category, budget }) => {

    const base = Math.floor(Math.random() * 4000 + 3000);

    const amazon = base + 250;
    const flipkart = base - 180;
    const ebay = base + 420;

    const bestPrice = Math.min(amazon, flipkart, ebay);

    const bestStore =
      bestPrice === amazon
        ? "Amazon"
        : bestPrice === flipkart
        ? "Flipkart"
        : "eBay";

    return {
      text:
        `🔎 Comparing ${category}` +
        (budget ? ` under ₹${budget}` : "") +
        `...\n\n` +
        `🛒 Amazon : ₹${amazon}\n` +
        `🛍 Flipkart : ₹${flipkart}\n` +
        `🌐 eBay : ₹${ebay}\n\n` +
        `✅ Best Price: ₹${bestPrice}\n` +
        `💡 Recommended Store: ${bestStore}`,

      suggestions: [
        "Today's deals",
        "Track price",
        "Budget products",
      ],
    };
  };

  const generateAIResponse = (question) => {
    const intent = understandQuery(question);
    return generateComparison(intent);
  };

  /* ---------- SEND MESSAGE ---------- */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      text: query,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setQuery("");
    setIsTyping(true);

    setTimeout(() => {
      const response = generateAIResponse(userMessage.text);

      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          type: "ai",
          text: response.text,
          suggestions: response.suggestions,
          timestamp: new Date(),
        },
      ]);

      setIsTyping(false);
    }, 1300);
  };

  const formatTime = (date) =>
    date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  /* ---------- UI ---------- */
  return (
    <div className="p-8 max-w-5xl mx-auto">

      <h1 className="text-2xl font-bold flex gap-2 mb-6">
        <Sparkles className="text-indigo-600" />
        AI Price Comparison Assistant
      </h1>

      {user && (
        <p className="text-gray-500 mb-4">
          Hi {user.name || user.username} 👋
        </p>
      )}

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">

        {/* CHAT AREA */}
        <div className="h-[500px] overflow-y-auto p-6 bg-gray-50 space-y-4">

          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${
                msg.type === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] p-4 rounded-2xl ${
                  msg.type === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-white border"
                }`}
              >
                <div className="flex gap-2 text-xs mb-1">
                  {msg.type === "ai"
                    ? <Bot size={14}/>
                    : <User size={14}/>}
                  {formatTime(msg.timestamp)}
                </div>

                <p className="whitespace-pre-line text-sm">
                  {msg.text}
                </p>

                {msg.suggestions && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {msg.suggestions.map((s,i)=>(
                      <button
                        key={i}
                        onClick={()=>setQuery(s)}
                        className="text-xs bg-gray-100 px-3 py-1 rounded-full"
                      >
                        {s}
                        <ChevronRight size={12}/>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="text-gray-400 text-sm">
              Fetching live prices...
            </div>
          )}

          <div ref={messagesEndRef}/>
        </div>

        {/* INPUT */}
        <form
          onSubmit={handleSubmit}
          className="border-t p-4 flex gap-2"
        >
          <input
            value={query}
            onChange={(e)=>setQuery(e.target.value)}
            placeholder="Ask price comparison..."
            className="flex-1 border px-4 py-2 rounded-lg"
          />

          <button className="bg-indigo-600 text-white px-5 rounded-lg">
            <Send size={18}/>
          </button>
        </form>

      </div>
    </div>
  );
};

export default AIShopper;