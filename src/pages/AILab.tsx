import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Video, 
  MapPin, 
  Mic, 
  Send, 
  Loader2, 
  Download, 
  Info, 
  Maximize2, 
  Trash2, 
  AlertCircle, 
  X,
  Bot,
  Zap,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import toast from 'react-hot-toast';

export default function AILab() {
  const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini');
  const [geminiModel, setGeminiModel] = useState('gemini-3.8-flash');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o');
  const [providerConfig, setProviderConfig] = useState<{ hasGemini?: boolean; hasOpenAI?: boolean } | null>(null);
  const [aiEmail, setAiEmail] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin' || user.role === 'super_admin' || user.role === 'direction';

  const [activeTab, setActiveTab] = useState<'image' | 'video' | 'maps' | 'voice'>('voice');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mapsQuery, setMapsQuery] = useState('');
  const [mapsResult, setMapsResult] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [voiceInput, setVoiceInput] = useState('');

  // Fetch AI providers status on mount
  useEffect(() => {
    async function loadProviders() {
      try {
        const res = await apiFetch('/api/ai/providers');
        if (res.ok) {
          const data = await res.json();
          setProviderConfig(data);
          if (data.defaultProvider) {
            setProvider(data.defaultProvider);
          }
          if (data.aiEmail) {
            setAiEmail(data.aiEmail);
          }
        }
      } catch (err) {
        console.warn("Could not load AI providers status", err);
      }
    }
    loadProviders();
  }, []);

  const saveSchoolConfig = async () => {
    setIsSavingConfig(true);
    try {
      const res = await apiFetch('/api/ai/school-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_provider: provider, ai_email: aiEmail })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setShowConfig(false);
      } else {
        toast.error(data.error || "Erreur lors de la sauvegarde");
      }
    } catch (err) {
      toast.error("Erreur réseau");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const activeModel = provider === 'openai' ? openaiModel : geminiModel;

  const sendVoiceMessage = async () => {
    if (!voiceInput.trim()) return;
    const inputMsg = voiceInput.trim();
    const newMessage = { 
      role: 'user', 
      parts: [{ text: inputMsg }] 
    };
    setChatHistory(prev => [...prev, newMessage]);
    setVoiceInput('');
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiFetch('/api/ai/live-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: inputMsg, 
          history: chatHistory,
          provider,
          model: activeModel
        })
      });
      const data = await res.json();
      if (data.success) {
        setChatHistory(prev => [
          ...prev, 
          { 
            role: 'model', 
            parts: [{ text: data.text }],
            provider: data.provider || provider,
            model: data.model || activeModel
          }
        ]);
        // Speak the response
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(data.text);
          utterance.lang = 'fr-FR';
          window.speechSynthesis.speak(utterance);
        }
      } else {
        const msg = data.error || 'Échec du chat';
        setErrorMessage(msg);
        toast.error(msg);
      }
    } catch (error: any) {
      const msg = error?.message || 'Erreur réseau';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateImage = async () => {
    if (!prompt.trim()) return toast.error('Veuillez entrer une description (prompt)');
    setLoading(true);
    setResult(null);
    setErrorMessage(null);
    try {
      const res = await apiFetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: prompt.trim(), 
          aspectRatio,
          provider,
          model: provider === 'openai' ? 'dall-e-3' : 'gemini-3.1-flash-image'
        })
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        toast.success(`Image générée avec ${data.provider === 'openai' ? 'DALL·E 3 (OpenAI)' : 'Gemini Flash'} !`);
      } else {
        const msg = data.error || 'Échec de la génération';
        setErrorMessage(msg);
        toast.error(msg);
      }
    } catch (error: any) {
      const msg = error?.message || 'Erreur réseau lors de la génération';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const generateVideo = async () => {
    if (!prompt && !imageFile) return toast.error('Veuillez entrer un prompt ou uploader une image');
    setLoading(true);
    setResult(null);
    setErrorMessage(null);
    try {
      const res = await apiFetch('/api/ai/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspectRatio, image: imageFile })
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        toast.success('Vidéo générée !');
      } else {
        const msg = data.error || 'Échec de la génération';
        setErrorMessage(msg);
        toast.error(msg);
      }
    } catch (error: any) {
      const msg = error?.message || 'Erreur réseau lors de la génération vidéo';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const askMaps = async () => {
    if (!mapsQuery.trim()) return toast.error('Veuillez entrer une question');
    setLoading(true);
    setMapsResult(null);
    setErrorMessage(null);
    try {
      const res = await apiFetch('/api/ai/ask-maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: mapsQuery.trim(), provider })
      });
      const data = await res.json();
      if (data.success) {
        setMapsResult(data.text);
      } else {
        const msg = data.error || 'Échec de la requête';
        setErrorMessage(msg);
        toast.error(msg);
      }
    } catch (error: any) {
      const msg = error?.message || 'Erreur réseau';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = typeof result === 'string' ? result : (result.url || '');
    link.download = `megafixa-ia-${activeTab}-${Date.now()}.${activeTab === 'video' ? 'mp4' : 'png'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Téléchargement lancé');
  };

  const PRESETS = [
    "Élèves en uniforme officiel souriants dans une bibliothèque moderne et lumineuse",
    "Remise solennelle des diplômes de fin d'année avec toges et écharpes scolaires",
    "Laboratoire de sciences moderne avec élèves en blouse blanche examinant des éprouvettes",
    "Cour de récréation verdoyante avec complexe scolaire moderne au coucher du soleil"
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Sparkles className="text-amber-500" />
            Laboratoire d'Intelligence Artificielle
          </h1>
          <p className="text-slate-500 text-sm">
            Basculez librement entre <strong>Google Gemini</strong> et <strong>OpenAI ChatGPT</strong> selon vos besoins pédagogiques.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <RefreshCw size={14} className={isSavingConfig ? 'animate-spin' : ''} />
              {showConfig ? 'Masquer Config' : 'Configurer le client IA'}
            </button>
          )}
          {/* Quick Model Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Moteur actif :</span>
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-black ${provider === 'openai' ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'}`}>
              {provider === 'openai' ? `ChatGPT (${openaiModel})` : `Gemini (${geminiModel})`}
            </span>
          </div>
        </div>
      </div>

      {/* Persistence Configuration Panel (Visible only when showConfig is true) */}
      {isAdmin && showConfig && (
        <div className="bg-primary/5 border border-primary/20 p-5 rounded-3xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1 space-y-4 w-full">
              <div className="flex items-center gap-2 mb-1">
                <Info size={16} className="text-primary" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Paramètres du client IA par défaut</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    Email à utiliser pour les fonctionnalités IA
                  </label>
                  <input
                    type="email"
                    value={aiEmail}
                    onChange={(e) => setAiEmail(e.target.value)}
                    placeholder="exemple@ecole.com"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    Moteur par défaut de l'établissement
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setProvider('gemini')}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                        provider === 'gemini' 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Google Gemini
                    </button>
                    <button
                      onClick={() => {
                        if (providerConfig && !providerConfig.hasOpenAI) {
                          toast.error("ChatGPT non configuré sur le serveur (Clé API manquante)");
                          return;
                        }
                        setProvider('openai');
                      }}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                        provider === 'openai' 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      } ${providerConfig && !providerConfig.hasOpenAI ? 'opacity-50 grayscale' : ''}`}
                    >
                      OpenAI ChatGPT
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={saveSchoolConfig}
              disabled={isSavingConfig}
              className="px-6 py-2.5 bg-primary text-white font-black text-sm rounded-xl shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[140px]"
            >
              {isSavingConfig ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              <span>Sauvegarder</span>
            </button>
          </div>
          <p className="mt-3 text-[10px] text-slate-500 italic">
            * Ces paramètres définissent le client par défaut pour tous les utilisateurs de l'établissement dans le laboratoire IA.
          </p>
        </div>
      )}

      {/* AI Engine & Model Selector Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 rounded-3xl text-white shadow-lg border border-slate-700">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Zap className="text-amber-400" size={18} />
              <span className="text-xs font-black uppercase tracking-widest text-slate-300">Sélection du modèle d'IA</span>
            </div>
            <p className="text-xs text-slate-400">
              Choisissez l'intelligence artificielle qui alimentera vos requêtes, prompts et conversations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Provider Switch Buttons */}
            <div className="flex bg-slate-800/80 p-1 rounded-2xl border border-white/10 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => { setProvider('gemini'); setErrorMessage(null); }}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                  provider === 'gemini'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles size={16} className={provider === 'gemini' ? 'text-amber-300' : 'text-slate-400'} />
                <span>Google Gemini</span>
                {provider === 'gemini' && <CheckCircle2 size={14} className="text-white" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (providerConfig && !providerConfig.hasOpenAI) {
                    setErrorMessage("ChatGPT n'est pas encore configuré. Un administrateur doit ajouter une clé API OpenAI dans les Paramètres > Services IA pour activer ce moteur.");
                    return;
                  }
                  setProvider('openai'); 
                  setErrorMessage(null); 
                }}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                  provider === 'openai'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                } ${providerConfig && !providerConfig.hasOpenAI ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                title={providerConfig && !providerConfig.hasOpenAI ? "Configuration requise dans les Paramètres" : ""}
              >
                <Bot size={16} className={provider === 'openai' ? 'text-emerald-300' : 'text-slate-400'} />
                <div className="flex flex-col items-start leading-none gap-0.5">
                  <span>OpenAI ChatGPT</span>
                  {providerConfig && !providerConfig.hasOpenAI && <span className="text-[9px] text-rose-300 font-bold uppercase">Non configuré</span>}
                </div>
                {provider === 'openai' && <CheckCircle2 size={14} className="text-white" />}
              </button>
            </div>

            {/* Model Sub-Select */}
            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-2xl border border-white/10 w-full sm:w-auto">
              <span className="text-[11px] font-bold text-slate-400">Variante :</span>
              {provider === 'openai' ? (
                <select
                  value={openaiModel}
                  onChange={(e) => setOpenaiModel(e.target.value)}
                  className="bg-transparent text-xs font-bold text-emerald-300 outline-none cursor-pointer py-1"
                >
                  <option value="gpt-4o" className="bg-slate-900 text-white">GPT-4o (Ultra Intelligent & Polyvalent)</option>
                  <option value="gpt-4o-mini" className="bg-slate-900 text-white">GPT-4o Mini (Ultra Rapide & Léger)</option>
                  <option value="gpt-3.5-turbo" className="bg-slate-900 text-white">GPT-3.5 Turbo (Classique)</option>
                </select>
              ) : (
                <select
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="bg-transparent text-xs font-bold text-indigo-300 outline-none cursor-pointer py-1"
                >
                  <option value="gemini-3.8-flash" className="bg-slate-900 text-white">Gemini 3.8 Flash (Équilibré & Rapide)</option>
                  <option value="gemini-3.1-pro-preview" className="bg-slate-900 text-white">Gemini 3.1 Pro (Raisonnement Complexe)</option>
                </select>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => { setActiveTab('voice'); setErrorMessage(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'voice' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <Mic size={18} />
          <span>Conversation Live & Texte</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
            {provider === 'openai' ? 'ChatGPT' : 'Gemini'}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('image'); setErrorMessage(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'image' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <ImageIcon size={18} />
          <span>Générateur d'Images</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
            {provider === 'openai' ? 'DALL·E 3' : 'Gemini Flash'}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('video'); setErrorMessage(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'video' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <Video size={18} />
          <span>Générateur de Vidéos</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-semibold">Veo</span>
        </button>

        <button
          onClick={() => { setActiveTab('maps'); setErrorMessage(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'maps' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <MapPin size={18} />
          <span>Conseiller Maps & Trajets</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">Inclus</span>
        </button>
      </div>

      {/* Error / Provider Notice Alert */}
      {errorMessage && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start justify-between gap-3 text-amber-900 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-800">Information du Moteur IA</h4>
              <p className="text-sm mt-0.5 text-amber-800 leading-relaxed">{errorMessage}</p>
              <div className="flex items-center gap-2 mt-3">
                {provider === 'openai' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setProvider('gemini');
                      setErrorMessage(null);
                      toast.success('Bascule sur Google Gemini effectuée !');
                    }}
                    className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-xl transition-colors shadow-sm"
                  >
                    🌟 Basculer sur Google Gemini
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setProvider('openai');
                      setErrorMessage(null);
                      toast.success('Bascule sur ChatGPT effectuée !');
                    }}
                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl transition-colors shadow-sm"
                  >
                    🤖 Basculer sur OpenAI ChatGPT
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-xs font-bold text-amber-700 hover:text-amber-900 px-2 py-1.5"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-amber-500 hover:text-amber-800 p-1">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Input Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            {activeTab === 'image' || activeTab === 'video' ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
                      Description (Prompt)
                    </label>
                    <span className="text-[10px] font-bold text-slate-400">
                      {activeTab === 'image' && provider === 'openai' ? 'Moteur : DALL·E 3' : activeTab === 'image' ? 'Moteur : Gemini Flash' : 'Moteur : Google Veo'}
                    </span>
                  </div>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={activeTab === 'image' ? "Un élève assis dans une bibliothèque moderne et lumineuse..." : "Un drone survolant une école ensoleillée..."}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none h-32 resize-none"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPrompt(preset)}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition-colors text-left truncate max-w-full"
                      >
                        💡 {preset.slice(0, 40)}...
                      </button>
                    ))}
                  </div>
                </div>

                {activeTab === 'video' && (
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Image source (Optionnel pour animation)</label>
                    <div className="flex items-center gap-4">
                      <label className="flex-1 flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-200 rounded-2xl hover:border-primary cursor-pointer transition-all bg-slate-50">
                        {imageFile ? (
                          <img src={imageFile} alt="Preview" className="h-full w-full object-contain p-2" />
                        ) : (
                          <>
                            <ImageIcon size={24} className="text-slate-400 mb-1" />
                            <span className="text-[10px] font-bold text-slate-500">Uploader une photo</span>
                          </>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                      </label>
                      {imageFile && (
                        <button onClick={() => setImageFile(null)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Format d'affichage (Ratio)</label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-medium"
                  >
                    <option value="1:1">Carré (1:1)</option>
                    <option value="16:9">Paysage panoramique (16:9)</option>
                    <option value="9:16">Portrait mobile (9:16)</option>
                  </select>
                </div>

                <button
                  onClick={activeTab === 'image' ? generateImage : generateVideo}
                  disabled={loading}
                  className={`w-full py-4 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg ${
                    provider === 'openai' && activeTab === 'image'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-primary hover:bg-primary/90 shadow-primary/20'
                  }`}
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                  <span>
                    {loading ? 'Génération en cours...' : activeTab === 'image' ? `Générer avec ${provider === 'openai' ? 'DALL·E 3' : 'Gemini Flash'}` : 'Générer la Vidéo (Veo)'}
                  </span>
                </button>
              </div>
            ) : activeTab === 'maps' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Votre question d'orientation</label>
                  <textarea
                    value={mapsQuery}
                    onChange={(e) => setMapsQuery(e.target.value)}
                    placeholder="Quels sont les meilleurs trajets sécurisés pour rejoindre l'école ?"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none h-32 resize-none"
                  />
                </div>
                <button
                  onClick={askMaps}
                  disabled={loading}
                  className="w-full py-4 bg-primary text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <MapPin size={20} />}
                  <span>{loading ? 'Recherche en cours...' : `Consulter (${provider === 'openai' ? 'ChatGPT' : 'Gemini Maps'})`}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto animate-pulse mb-2 ${
                  provider === 'openai' ? 'bg-emerald-100 text-emerald-600' : 'bg-primary/10 text-primary'
                }`}>
                  {provider === 'openai' ? <Bot size={32} /> : <Mic size={32} />}
                </div>

                <div className="text-center">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    provider === 'openai' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    {provider === 'openai' ? `Assistant ChatGPT (${openaiModel})` : `Assistant Gemini (${geminiModel})`}
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Message pour l'assistant</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={voiceInput}
                      onChange={(e) => setVoiceInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendVoiceMessage()}
                      placeholder="Posez une question pédagogique ou administrative..."
                      className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={sendVoiceMessage}
                      disabled={loading || !voiceInput.trim()}
                      className={`p-3 text-white rounded-xl transition-all shadow-md ${
                        provider === 'openai' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-primary hover:bg-primary/90'
                      }`}
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>

                {chatHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setChatHistory([]); toast.success('Conversation réinitialisée'); }}
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-red-500 py-1 transition-colors"
                  >
                    <RefreshCw size={12} />
                    <span>Effacer l'historique de discussion</span>
                  </button>
                )}

                <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                  L'IA répond par écrit et via la synthèse vocale intégrée au navigateur.
                </p>
              </div>
            )}
          </div>

          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
            <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
            <p className="text-[11px] text-blue-700 leading-relaxed">
              <strong>Multi-Modèles :</strong> Vous pouvez basculer d'une IA à l'autre en direct. 
              <strong> OpenAI ChatGPT</strong> excelle en rédaction et synthèse de devoirs, tandis que 
              <strong> Google Gemini</strong> propose l'intégration native avec Google Maps et Veo vidéo.
            </p>
          </div>
        </div>

        {/* Right Preview Panel */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900 rounded-3xl shadow-xl overflow-hidden min-h-[460px] flex flex-col border border-slate-800">
            {/* Window bar */}
            <div className="p-4 bg-slate-800/50 border-b border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                Aperçu et Interaction • {provider === 'openai' ? 'OpenAI ChatGPT' : 'Google Gemini'}
              </span>
              <div className="flex items-center gap-2">
                {result && (
                  <button 
                    onClick={handleDownload}
                    title="Télécharger"
                    className="p-1.5 text-slate-400 hover:text-white transition-colors"
                  >
                    <Download size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Display Area */}
            <div className="flex-1 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-950 overflow-hidden">
              {loading && !chatHistory.length ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className={`w-12 h-12 animate-spin ${provider === 'openai' ? 'text-emerald-400' : 'text-primary'}`} />
                  <p className="text-slate-400 text-sm font-medium animate-pulse">
                    {provider === 'openai' ? 'ChatGPT prépare votre résultat...' : 'Gemini prépare votre résultat...'}
                  </p>
                </div>
              ) : activeTab === 'maps' && mapsResult ? (
                <div className="w-full max-w-2xl bg-white/5 backdrop-blur-md rounded-2xl p-6 text-slate-200 font-sans text-sm leading-relaxed border border-white/10 max-h-[420px] overflow-y-auto">
                  <div className="flex items-center gap-2 mb-3 text-xs font-black text-emerald-400 uppercase tracking-widest">
                    <MapPin size={14} />
                    <span>Réponse Géographique ({provider === 'openai' ? 'ChatGPT' : 'Gemini Maps'})</span>
                  </div>
                  {mapsResult}
                </div>
              ) : activeTab === 'voice' ? (
                <div className="w-full h-full flex flex-col gap-4 overflow-y-auto max-h-[440px] custom-scrollbar p-2">
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      {msg.role === 'model' && (
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                            msg.provider === 'openai' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                          }`}>
                            {msg.provider === 'openai' ? '🤖 ChatGPT' : '🌟 Gemini'}
                          </span>
                          <span className="text-[10px] text-slate-500">{msg.model || ''}</span>
                        </div>
                      )}
                      <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-primary text-white rounded-tr-none' 
                          : 'bg-slate-800 text-slate-200 rounded-tl-none border border-white/5'
                      }`}>
                        {msg.parts[0]?.text}
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[10px] font-black text-slate-400">
                          {provider === 'openai' ? '🤖 ChatGPT tape...' : '🌟 Gemini répond...'}
                        </span>
                      </div>
                      <div className="bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-white/5 flex gap-1.5">
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  )}

                  {!chatHistory.length && (
                    <div className="m-auto text-center space-y-4 py-8">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto border border-white/10 ${
                        provider === 'openai' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-slate-600'
                      }`}>
                        {provider === 'openai' ? <Bot size={40} /> : <Mic size={40} />}
                      </div>
                      <div className="space-y-1">
                        <p className="text-slate-300 text-sm font-bold">
                          Conversation avec {provider === 'openai' ? `ChatGPT (${openaiModel})` : `Gemini (${geminiModel})`}
                        </p>
                        <p className="text-slate-500 text-xs max-w-sm mx-auto">
                          Tapez votre message à gauche pour démarrer une session pédagogique interactive.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : result ? (
                <div className="relative group max-h-[420px] flex items-center justify-center">
                  {activeTab === 'image' ? (
                    <img 
                      src={typeof result === 'string' ? result : (result.url || '/placeholder.png')} 
                      alt="Généré par IA" 
                      className="max-h-[380px] w-auto rounded-2xl shadow-2xl border border-white/10 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <video 
                      src={typeof result === 'string' ? result : (result.url || '')} 
                      controls 
                      className="max-h-[380px] w-auto rounded-2xl shadow-2xl border border-white/10"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl backdrop-blur-sm gap-3">
                    <button 
                      onClick={handleDownload}
                      className="p-3 bg-white text-slate-900 rounded-full shadow-lg hover:scale-110 transition-transform"
                      title="Télécharger"
                    >
                      <Download size={22} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4 py-8">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto text-slate-600 border border-white/10">
                    {activeTab === 'image' ? <ImageIcon size={40} /> : activeTab === 'video' ? <Video size={40} /> : <MapPin size={40} />}
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-300 text-sm font-bold">Prêt pour la génération</p>
                    <p className="text-slate-500 text-xs">
                      Moteur sélectionné : <strong>{provider === 'openai' ? 'OpenAI ChatGPT' : 'Google Gemini'}</strong>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
