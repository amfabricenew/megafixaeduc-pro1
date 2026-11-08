import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { toast } from 'react-hot-toast';
import { 
  Bot, 
  Key, 
  ShieldCheck, 
  Info, 
  Loader2, 
  Save, 
  Sparkles,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  Lock
} from 'lucide-react';

export default function AISettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [openaiKey, setOpenaiKey] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/ai/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
      }
    } catch (error) {
      console.error("Error fetching AI config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openai_api_key: openaiKey })
      });
      if (res.ok) {
        toast.success("Configuration IA enregistrée");
        setOpenaiKey('');
        fetchConfig();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur lors de l'enregistrement");
      }
    } catch (error) {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse text-sm">Chargement de la configuration IA...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 rounded-3xl text-white shadow-xl border border-white/5 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Sparkles size={120} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                <Bot className="text-emerald-400" size={24} />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight">Intelligence Artificielle</h2>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Configurez les services d'IA tiers comme <strong>OpenAI ChatGPT</strong> pour enrichir les fonctionnalités du Laboratoire IA et l'assistance pédagogique.
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-white/10 px-4 py-3 rounded-2xl border border-white/10 backdrop-blur-sm">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Statut Google Gemini</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${config?.has_env_gemini ? 'bg-emerald-400' : 'bg-rose-400 animate-pulse'}`}></div>
                <span className="text-xs font-bold">{config?.has_env_gemini ? 'Connecté (Via Environnement)' : 'Non Détecté'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OpenAI Configuration */}
        <div className="space-y-4">
          <form onSubmit={handleSave} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
                  <Bot className="text-emerald-600" size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">OpenAI ChatGPT</h3>
                  <p className="text-xs text-slate-500">Moteurs GPT-4o, GPT-3.5 & DALL-E 3</p>
                </div>
              </div>
              {config?.openai_configured ? (
                <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-lg">
                  <CheckCircle2 size={12} /> CONFIGURÉ
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-lg">
                  INACTIF
                </span>
              )}
            </div>

            <div className="space-y-4 flex-grow">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-start gap-3">
                  <Key className="text-slate-400 shrink-0 mt-1" size={18} />
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase text-slate-500 tracking-wider">Clé API OpenAI</label>
                    <input 
                      type="password"
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      placeholder={config?.openai_api_key_masked || "sk-................................"}
                      className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-mono placeholder:text-slate-300"
                    />
                  </div>
                </div>
              </div>

              {config?.has_env_openai && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100 text-[11px] text-amber-800 italic">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  <p>
                    Une clé OpenAI est déjà configurée dans les variables d'environnement (.env). La clé saisie ici sera prioritaire.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                  <ShieldCheck size={14} /> Sécurité & Confidentialité
                </h4>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-xs text-slate-500 leading-relaxed">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5"></div>
                    La clé est stockée de manière sécurisée dans la base de données de l'établissement.
                  </li>
                  <li className="flex items-start gap-2 text-xs text-slate-500 leading-relaxed">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5"></div>
                    Elle n'est utilisée que pour les appels serveurs vers OpenAI et n'est jamais exposée aux élèves.
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
              <a 
                href="https://platform.openai.com/api-keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
              >
                Obtenir une clé API <ExternalLink size={10} />
              </a>
              <button
                type="submit"
                disabled={saving || !openaiKey.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-200"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Enregistrer la clé
              </button>
            </div>
          </form>
        </div>

        {/* Gemini Information */}
        <div className="space-y-4">
          <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-indigo-100 shadow-sm">
                  <Sparkles className="text-indigo-600" size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-indigo-900 text-sm">Google Gemini</h3>
                  <p className="text-xs text-indigo-500">Moteurs Flash 3.8, Pro & Omni</p>
                </div>
              </div>
              <span className="flex items-center gap-1 px-2 py-1 bg-white text-indigo-600 text-[10px] font-black rounded-lg shadow-sm">
                PAR DÉFAUT
              </span>
            </div>

            <div className="space-y-4 flex-grow">
              <div className="p-4 bg-white rounded-2xl border border-indigo-100 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900">Statut du service</span>
                  <span className={`text-[10px] font-black ${config?.has_env_gemini ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {config?.has_env_gemini ? 'OPÉRATIONNEL' : 'NON CONFIGURÉ'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className={`h-full ${config?.has_env_gemini ? 'bg-emerald-500 w-full' : 'bg-rose-500 w-0'}`}></div>
                </div>
              </div>

              <div className="p-4 bg-indigo-100/50 rounded-2xl space-y-3">
                <h4 className="text-xs font-black uppercase text-indigo-800 tracking-widest flex items-center gap-2">
                  <Info size={14} /> Pourquoi Gemini ?
                </h4>
                <p className="text-xs text-indigo-700 leading-relaxed">
                  Gemini est le moteur d'IA natif de la plateforme Mégafixa. Il est optimisé pour les tâches éducatives, la correction d'exercices et la génération de médias (images et bientôt vidéos via Veo).
                </p>
              </div>

              {!config?.has_env_gemini && (
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex gap-3">
                  <AlertTriangle className="text-rose-500 shrink-0" size={18} />
                  <div className="space-y-1">
                    <p className="text-xs font-black text-rose-800 uppercase">Attention</p>
                    <p className="text-xs text-rose-700 leading-relaxed">
                      L'accès à Gemini n'est pas détecté. Veuillez configurer <strong>GEMINI_API_KEY</strong> dans l'environnement du serveur.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-indigo-200">
               <div className="flex items-center gap-2 text-[10px] text-indigo-500 font-medium">
                 <Lock size={12} /> Gestion centralisée par l'administrateur système
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
