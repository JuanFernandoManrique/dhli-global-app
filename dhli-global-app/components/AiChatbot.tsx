'use client';
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Sparkles, User, HelpCircle } from 'lucide-react';
import { generateAiResponse, ChatContext } from '../lib/ai-assistant';

interface AiChatbotProps {
  context: ChatContext;
}

export default function AiChatbot({ context }: AiChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: `¡Hola! Soy tu **Asistente Zootécnico IA especializado en Termorregulación**. Estoy monitoreando en tiempo real las condiciones en **${context.placeName}** (${context.livestockMode === 'dairy' ? 'DHLI' : 'HLI'}: **${context.indexVal}** - ${context.category}). ¿En qué te puedo asesorar hoy?`,
      time: 'Ahora',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputValue;
    if (!text.trim()) return;

    const userMsg = { sender: 'user' as const, text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const botReply = generateAiResponse(text, context);
      setMessages((prev) => [
        ...prev,
        { sender: 'bot' as const, text: botReply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Botón Flotante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white p-4 rounded-full shadow-2xl flex items-center gap-2.5 transition transform hover:scale-105 border-2 border-white/20"
        >
          <Bot className="w-6 h-6 animate-pulse" />
          <span className="text-xs font-bold hidden md:inline">Asistente Zootécnico IA</span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-ping absolute -top-1 -right-1" />
        </button>
      )}

      {/* Ventana de Chat */}
      {isOpen && (
        <div className="w-[360px] md:w-[420px] h-[540px] bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl">
          
          {/* Cabecera */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-4 border-b border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                <Bot className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
                  Asistente Zootécnico IA <Sparkles className="w-3 h-3 text-amber-400" />
                </h4>
                <span className="text-[10px] text-emerald-400 font-semibold">
                  En vivo: {context.livestockMode === 'dairy' ? 'DHLI' : 'HLI'} {context.indexVal} ({context.category})
                </span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Historial de Mensajes */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex gap-2 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.sender === 'bot' && (
                  <div className="w-6 h-6 rounded-full bg-emerald-900/60 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] p-3 rounded-2xl ${
                    m.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none shadow-md space-y-1.5'
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
                  <span className={`text-[9px] block text-right ${m.sender === 'user' ? 'text-emerald-200' : 'text-slate-500'}`}>
                    {m.time}
                  </span>
                </div>
                {m.sender === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-blue-900/60 border border-blue-500/40 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2 items-center text-slate-400 text-[11px] italic">
                <Bot className="w-4 h-4 text-emerald-400 animate-spin" />
                <span>Analizando biofísica térmica y literatura científica...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Preguntas Rápidas */}
          <div className="px-3 py-2 bg-slate-950/80 border-t border-slate-800/80 flex gap-1.5 overflow-x-auto text-[10px]">
            <button
              onClick={() => handleSend('¿Qué medidas de emergencia debo tomar hoy?')}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700 shrink-0 flex items-center gap-1"
            >
              <HelpCircle className="w-3 h-3 text-emerald-400" /> Medidas de hoy
            </button>
            <button
              onClick={() => handleSend('¿Cuáles son los mejores horarios de pastoreo?')}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700 shrink-0"
            >
              ⏰ Horarios pastoreo
            </button>
            <button
              onClick={() => handleSend('¿Cómo ayuda la sombra en este predio?')}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700 shrink-0"
            >
              🌳 Impacto sombra
            </button>
          </div>

          {/* Input de Mensaje */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2"
          >
            <input
              type="text"
              placeholder="Hazle una pregunta zootécnica a la IA..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}
    </div>
  );
}