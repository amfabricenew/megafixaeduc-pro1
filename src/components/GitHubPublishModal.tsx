import React, { useState } from 'react';
import { Github, CheckCircle2, AlertCircle, ExternalLink, Loader2, Rocket, KeyRound, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

interface GitHubPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubPublishModal: React.FC<GitHubPublishModalProps> = ({ isOpen, onClose }) => {
  const [token, setToken] = useState(() => localStorage.getItem('github_publish_token') || '');
  const [repoName, setRepoName] = useState('megafixaeduc-pro');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ repoUrl: string; owner: string; repoName: string } | null>(null);

  if (!isOpen) return null;

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      toast.error("Veuillez renseigner votre jeton d'accès GitHub (Token)");
      return;
    }

    setLoading(true);
    setSuccessData(null);
    const toastId = toast.loading("Création du dépôt et envoi vers GitHub en cours...");

    try {
      const response = await fetch('/api/github/push-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim(),
          repoName: repoName.trim() || 'megafixaeduc-pro',
          isPrivate
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Échec de la publication vers GitHub.");
      }

      // Save token in localStorage for next time
      localStorage.setItem('github_publish_token', token.trim());
      setSuccessData({
        repoUrl: data.repoUrl,
        owner: data.owner,
        repoName: data.repoName
      });
      toast.success("Projet publié avec succès sur GitHub !", { id: toastId });
    } catch (err: any) {
      console.error("Erreur GitHub push:", err);
      toast.error(err.message || "Erreur de connexion", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 text-white relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Github className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Publier sur GitHub en 1 Clic</h2>
              <p className="text-xs text-slate-300">Synchronisez directement votre code sans bloquer sur l'interface</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {successData ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-emerald-900">Félicitations ! Votre code est sur GitHub !</h3>
                  <p className="text-xs text-emerald-700 mt-1">
                    Le dépôt <strong>{successData.owner}/{successData.repoName}</strong> a été créé et tous les fichiers ont été envoyés.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <a
                  href={successData.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-md"
                >
                  <Github className="w-4 h-4" />
                  <span>Ouvrir mon dépôt sur GitHub</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>

                <a
                  href="https://dashboard.render.com/blueprints/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-md"
                >
                  <Rocket className="w-4 h-4" />
                  <span>Déployer maintenant sur Render (Blueprint 1 Clic)</span>
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-200" />
                </a>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setSuccessData(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                >
                  Publier une nouvelle mise à jour
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePublish} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nom du dépôt sur GitHub
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
                    placeholder="megafixaeduc-pro"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Caractères simples sans espaces ni accents (ex: <code>megafixaeduc-pro</code>).
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Jeton d'accès GitHub (Token)</span>
                  </label>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=MegaFixaEduc-AIStudio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium underline flex items-center gap-1"
                  >
                    <span>Générer un jeton en 1 clic</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-600 inline" />
                  <span>Jeton GitHub Classic avec la permission <code>repo</code> cochée.</span>
                </p>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Visibilité du dépôt</span>
                  <span className="text-[11px] text-slate-500">Public (recommandé pour Render gratuit) ou Privé</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isPrivate ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                  }`}
                >
                  {isPrivate ? '🔒 Dépôt Privé' : '🌍 Dépôt Public'}
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Publication en cours...</span>
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4" />
                      <span>Publier directement sur GitHub en 1 Clic</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500">
            Crée le dépôt automatiquement s'il n'existe pas encore et envoie l'ensemble du code.
          </p>
        </div>

      </div>
    </div>
  );
};
