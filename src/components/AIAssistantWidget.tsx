import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, Send, X, Minimize2, RefreshCw, MessageSquare, Lightbulb, PhoneCall, Headphones, ExternalLink, ShieldCheck, GraduationCap, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export function openAIAssistant() {
  window.dispatchEvent(new CustomEvent('megafixa:open-ai-assistant'));
}

export function toggleAIAssistant() {
  window.dispatchEvent(new CustomEvent('megafixa:toggle-ai-assistant'));
}

export default function AIAssistantWidget() {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      text: "Bonjour ! Je suis **MégafixaBot**, votre assistant expert officiel pour la plateforme **MégafixaEduc Pro**.\n\nJe suis à votre disposition pour vous expliquer en détail le fonctionnement du système, vous faire des propositions concrètes et vous orienter vers le bon interlocuteur (Support MEGAFIXA Tech, Direction ou Administrateur).\n\nComment puis-je vous aider aujourd'hui ?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('megafixa:open-ai-assistant', handleOpen);
    window.addEventListener('megafixa:toggle-ai-assistant', handleToggle);
    return () => {
      window.removeEventListener('megafixa:open-ai-assistant', handleOpen);
      window.removeEventListener('megafixa:toggle-ai-assistant', handleToggle);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const historyPayload = messages
        .filter(m => m.id !== 'welcome-1')
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          text: m.text
        }));

      const res = await apiFetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
          context: {
            role: user?.role,
            name: user?.nom ? `${user.nom} ${user.prenom || ''}`.trim() : undefined,
            page: window.location.pathname
          }
        })
      });

      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            text: data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        throw new Error(data.error || 'Erreur de réponse');
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: "Désolé, une erreur s'est produite lors de la communication avec l'assistant. En cas de blocage persistant, vous pouvez contacter directement le **Support MEGAFIXA Tech** au **+229 01 61 10 79 18** ou par email à **megafixatecheduc@gmail.com**.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: 'welcome-1',
        role: 'assistant',
        text: "Conversation réinitialisée. Comment puis-je vous guider dans MégafixaEduc Pro ? Vous pouvez également me demander qui contacter selon votre préoccupation.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const quickQuestions = [
    "💡 Que me proposes-tu ?",
    "🛠️ Contacter le Support Megafixa",
    "🎓 Joindre la Direction",
    "💼 Joindre l'Administrateur",
    "Calcul des moyennes & perfectionnement",
    "Procédure de saisie rapide des notes",
    "Paiement en ligne FedaPay & reçus QR",
    "Emploi du temps & fusion continue",
    "Générer cartes scolaires avec QR"
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="ai-assistant-modal"
          drag
          dragMomentum={false}
          dragElastic={0.1}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-4 right-4 sm:right-8 z-[99999] pointer-events-auto select-none cursor-grab active:cursor-grabbing"
        >
          <div className="w-[94vw] sm:w-[440px] h-[580px] max-h-[80vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden mb-3 relative pointer-events-auto">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-primary-700 via-primary-600 to-indigo-700 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                  <Bot size={22} className="text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-sm text-white">MégafixaBot IA</h3>
                    <span className="text-[10px] bg-amber-400/20 text-amber-200 border border-amber-300/30 px-1.5 py-0.5 rounded-full font-bold">Pro</span>
                  </div>
                  <p className="text-[11px] text-primary-100 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Assistant & Escalade Support 7j/7
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-white/90">
                <button
                  onClick={() => setShowContactsModal(!showContactsModal)}
                  title="Annuaire d'assistance & escalade"
                  className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold px-2 border ${
                    showContactsModal 
                      ? 'bg-amber-400 text-slate-900 border-amber-300' 
                      : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                  }`}
                >
                  <Headphones size={14} />
                  <span>Contacts</span>
                </button>
                <button
                  onClick={handleClear}
                  title="Réinitialiser le chat"
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <RefreshCw size={15} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Minimize2 size={16} />
                </button>
              </div>
            </div>

            {/* Quick Contacts Banner / Drawer */}
            <AnimatePresence>
              {showContactsModal && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 p-3.5 overflow-hidden text-xs"
                >
                  <div className="flex items-center justify-between font-bold text-amber-900 dark:text-amber-200 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Headphones size={15} className="text-amber-600" />
                      Qui contacter selon votre préoccupation ?
                    </span>
                    <button
                      onClick={() => setShowContactsModal(false)}
                      className="text-amber-700 hover:text-amber-900 dark:text-amber-300"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  
                  <div className="space-y-2.5">
                    {/* Support Technique MEGAFIXA */}
                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-amber-200/80 dark:border-slate-700 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-primary-700 dark:text-primary-400 flex items-center gap-1">
                          <ShieldCheck size={13} className="text-emerald-500" />
                          Support Technique MEGAFIXA Tech
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded-full">
                          7j/7
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                        Pour tout bug technique, panne, licence, passerelle FedaPay ou passerelle SMS.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                        <a
                          href="https://wa.me/2290161107918"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium"
                        >
                          <PhoneCall size={11} />
                          WhatsApp: +229 01 61 10 79 18
                        </a>
                        <a
                          href="tel:+2290141264238"
                          className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg font-medium"
                        >
                          Appel: +229 01 41 26 42 38
                        </a>
                        <a
                          href="mailto:megafixatecheduc@gmail.com"
                          className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg font-medium"
                        >
                          megafixatecheduc@gmail.com
                        </a>
                      </div>
                    </div>

                    {/* Direction Pédagogique */}
                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                      <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <GraduationCap size={13} className="text-indigo-500" />
                        Direction & Censeur de l'école
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                        Pour déverrouiller des notes clôturées, valider des épreuves d'examens ou autoriser des absences enseignants.
                      </p>
                      <button
                        onClick={() => {
                          setShowContactsModal(false);
                          handleSend("Comment contacter la direction ou soumettre une demande de note ?");
                        }}
                        className="mt-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-0.5"
                      >
                        En savoir plus sur les démarches Direction →
                      </button>
                    </div>

                    {/* Administrateur de l'école */}
                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                      <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <Building2 size={13} className="text-amber-500" />
                        Administration Système & Secrétariat
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                        Pour création de compte, mot de passe perdu, affectation de classe ou rectification d'erreur sur un dossier élève.
                      </p>
                      <button
                        onClick={() => {
                          setShowContactsModal(false);
                          handleSend("Comment contacter l'administrateur pour un mot de passe ou un compte ?");
                        }}
                        className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-0.5"
                      >
                        En savoir plus sur l'administration →
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Chips Bar */}
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  disabled={loading}
                  className="shrink-0 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary-400 dark:hover:border-primary-500 rounded-full text-slate-700 dark:text-slate-300 font-medium transition-all hover:text-primary-600 shadow-2xs flex items-center gap-1"
                >
                  <Lightbulb size={12} className="text-amber-500" />
                  {q}
                </button>
              ))}
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
              {messages.map((m) => {
                const hasProposals = m.text.includes("💡") || m.text.includes("Propositions");
                const hasContacts = m.text.includes("📞") || m.text.includes("+229");

                return (
                  <div
                    key={m.id}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[88%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-primary-600 text-white rounded-br-none shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-none shadow-xs'
                      }`}
                    >
                      <div className="whitespace-pre-line">
                        {m.text.split('\n').map((line, lIdx) => {
                          // Check if section header
                          const isHeading = line.startsWith('### ');
                          const isProposalHeader = line.includes('💡') || line.includes('Propositions & Recommandations');
                          const isContactHeader = line.includes('📞') || line.includes('Interlocuteur');

                          const cleanLine = isHeading ? line.replace('### ', '') : line;
                          const parts = cleanLine.split(/(\*\*.*?\*\*)/g);

                          return (
                            <div 
                              key={lIdx} 
                              className={`
                                ${lIdx > 0 ? 'mt-1' : ''}
                                ${isHeading ? 'font-bold text-sm text-primary-700 dark:text-primary-400 mb-1.5' : ''}
                                ${isProposalHeader ? 'font-bold text-amber-700 dark:text-amber-400 mt-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-700/60' : ''}
                                ${isContactHeader ? 'font-bold text-indigo-700 dark:text-indigo-400 mt-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-700/60' : ''}
                              `}
                            >
                              {parts.map((part, pIdx) => {
                                if (part.startsWith('**') && part.endsWith('**')) {
                                  return <strong key={pIdx} className="font-semibold">{part.slice(2, -2)}</strong>;
                                }
                                return part;
                              })}
                            </div>
                          );
                        })}
                      </div>

                      {/* Interactive Contact Quick Buttons if Support is mentioned */}
                      {m.role === 'assistant' && hasContacts && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-1.5">
                          <a
                            href="https://wa.me/2290161107918"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2.5 py-1 rounded-lg font-bold hover:bg-emerald-100 transition-colors"
                          >
                            <PhoneCall size={11} />
                            WhatsApp Support (+229 01 61 10 79 18)
                          </a>
                          <a
                            href="mailto:megafixatecheduc@gmail.com"
                            className="inline-flex items-center gap-1 text-[11px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                          >
                            Email Support
                          </a>
                        </div>
                      )}

                      <span className={`block text-[10px] mt-1.5 text-right ${m.role === 'user' ? 'text-primary-200' : 'text-slate-400'}`}>
                        {m.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3.5 rounded-2xl rounded-bl-none shadow-xs flex items-center gap-2">
                    <Bot size={16} className="text-primary-600 animate-spin" />
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Analyse et formulation des recommandations...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Posez une question, demandez un conseil ou un contact..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-primary-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-40 transition-all shadow-md shrink-0"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
