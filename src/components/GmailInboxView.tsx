import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  RefreshCw, 
  Search, 
  Inbox, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ExternalLink, 
  UserCheck, 
  Eye, 
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  LogOut,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  connectGmail, 
  disconnectGmail, 
  getGmailAccessToken, 
  listGmailMessages, 
  getGmailMessage, 
  sendGmailMessage, 
  GmailMessageSummary, 
  GmailMessageDetail 
} from '../lib/gmail';

export default function GmailInboxView() {
  const [token, setToken] = useState<string | null>(getGmailAccessToken());
  const [loading, setLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMessage, setSelectedMessage] = useState<GmailMessageDetail | null>(null);
  const [readingLoading, setReadingLoading] = useState<boolean>(false);

  // Compose State
  const [showCompose, setShowCompose] = useState<boolean>(false);
  const [toEmail, setToEmail] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  // Destructive/Mutating Confirmation State (MANDATORY per Workspace Skill)
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (token) {
      loadMessages();
    }
  }, [token]);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const res = await connectGmail();
      setToken(res.accessToken);
      toast.success("Compte Gmail connecté avec succès !");
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.message?.includes('popup-closed-by-user')) {
        toast("Connexion annulée.");
      } else if (err?.code === 'auth/popup-blocked' || err?.message?.includes('popup-blocked')) {
        toast.error("La fenêtre de connexion a été bloquée par votre navigateur. Veuillez autoriser les fenêtres pop-up.", { duration: 6000 });
      } else {
        toast.error(err.message || "Échec de connexion au compte Gmail.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectGmail();
    setToken(null);
    setMessages([]);
    setSelectedMessage(null);
    toast.success("Session Gmail déconnectée.");
  };

  const loadMessages = async (query = 'in:inbox') => {
    setLoading(true);
    try {
      const list = await listGmailMessages({ query, maxResults: 20 });
      setMessages(list);
    } catch (err: any) {
      toast.error(err.message || "Impossible de charger les messages Gmail.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMessage = async (msgId: string) => {
    setReadingLoading(true);
    try {
      const detail = await getGmailMessage(msgId);
      setSelectedMessage(detail);
    } catch (err: any) {
      toast.error("Erreur lors de la lecture du message.");
    } finally {
      setReadingLoading(false);
    }
  };

  const handleTriggerSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEmail.trim() || !subject.trim() || !body.trim()) {
      toast.error("Veuillez remplir le destinataire, l'objet et le message.");
      return;
    }
    // Open mandatory confirmation dialog before sending
    setConfirmModalOpen(true);
  };

  const handleConfirmSend = async () => {
    setConfirmModalOpen(false);
    setIsSending(true);
    try {
      await sendGmailMessage({
        to: toEmail.trim(),
        subject: subject.trim(),
        body: body.trim(),
        html: `<div style="font-family:sans-serif;line-height:1.6;color:#1e293b;padding:16px;">
          ${body.replace(/\n/g, '<br/>')}
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>
          <p style="font-size:12px;color:#64748b;">Envoyé via MégafixaEduc Pro</p>
        </div>`
      });

      toast.success(`Email envoyé avec succès à ${toEmail} !`);
      setToEmail('');
      setSubject('');
      setBody('');
      setShowCompose(false);
      loadMessages();
    } catch (err: any) {
      toast.error(err.message || "Échec de l'envoi de l'email.");
    } finally {
      setIsSending(false);
    }
  };

  const applyTemplate = (type: 'convocation' | 'bulletin' | 'info') => {
    if (type === 'convocation') {
      setSubject("Convocation rencontre pédagogique - Établissement Scolaire");
      setBody("Madame, Monsieur,\n\nNous vous invitons cordialement à prendre part à une rencontre pédagogique au sein de notre établissement le [Date] à [Heure].\n\nVotre présence est vivement souhaitée.\n\nCordialement,\nLa Direction");
    } else if (type === 'bulletin') {
      setSubject("Disponibilité du bulletin de notes - Trimestre en cours");
      setBody("Chers parents,\n\nNous vous informons que les bulletins de notes du trimestre sont désormais disponibles et consultables.\n\nVous pouvez également retirer le relevé officiel au secrétariat de l'école.\n\nBien cordialement,\nL'Administration Scolaire");
    } else if (type === 'info') {
      setSubject("Avis important aux parents et élèves");
      setBody("Chers membres de la communauté scolaire,\n\nVeuillez prendre note des informations suivantes concernant la vie de l'établissement :\n- [Détail de l'information]\n\nMerci pour votre engagement à nos côtés.\n\nL'équipe MégafixaEduc");
    }
  };

  // 1. Unauthenticated state: official GSI material button
  if (!token) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm text-center max-w-xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100 dark:border-rose-900">
          <Mail size={32} />
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">
          Intégration Google Gmail
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          Connectez votre compte Google Workspace ou Gmail pour consulter vos emails scolaires, envoyer des convocations et communiquer avec les parents directement depuis l'application.
        </p>

        {/* Official Google Sign-In Button compliant with Workspace Guidelines */}
        <button
          type="button"
          onClick={handleConnect}
          disabled={loading}
          className="inline-flex items-center justify-center gap-3 px-6 py-3.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-sm rounded-2xl border border-slate-300 dark:border-slate-700 shadow-sm transition-all hover:shadow-md cursor-pointer disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          <span>{loading ? "Connexion en cours..." : "Se connecter avec Google (Gmail)"}</span>
        </button>

        <p className="text-xs text-slate-400 mt-4">
          L'accès est sécurisé et requiert l'autorisation explicite de votre part.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
            <Mail size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              Messagerie Gmail Pro
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold px-2 py-0.5 rounded-full">
                Connecté
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Synchronisé en direct avec l'API Google Gmail de l'établissement
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowCompose(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Send size={15} />
            <span>Nouveau Message</span>
          </button>
          <button
            type="button"
            onClick={() => loadMessages()}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Actualiser les messages"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-primary-600" : ""} />
          </button>
          <button
            type="button"
            onClick={handleDisconnect}
            className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
            title="Déconnecter Gmail"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Main Grid: Inbox List & Reader */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Messages List Column */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher dans Gmail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  loadMessages(searchQuery ? `in:inbox ${searchQuery}` : 'in:inbox');
                }
              }}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-primary-500/20 outline-none"
            />
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[620px] overflow-y-auto custom-scrollbar">
            {loading && messages.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <RefreshCw size={24} className="animate-spin mx-auto text-primary-600 mb-2" />
                Chargement de la boîte de réception...
              </div>
            ) : messages.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <Inbox size={28} className="mx-auto text-slate-400 mb-2" />
                Aucun message trouvé.
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  onClick={() => handleSelectMessage(m.id)}
                  className={`p-3 rounded-2xl transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                    selectedMessage?.id === m.id ? 'bg-primary-50/80 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                      {m.from?.split('<')[0]?.replace(/"/g, '') || m.from}
                    </span>
                    {m.isUnread && (
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate mb-1">
                    {m.subject}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {m.snippet}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Message Detail Pane */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm min-h-[400px]">
          {readingLoading ? (
            <div className="h-full flex flex-col items-center justify-center p-12 text-slate-500">
              <RefreshCw size={24} className="animate-spin text-primary-600 mb-2" />
              <p className="text-xs">Chargement du message complet...</p>
            </div>
          ) : selectedMessage ? (
            <div className="space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {selectedMessage.subject}
                  </h3>
                  <button
                    onClick={() => {
                      setToEmail(selectedMessage.from?.match(/<([^>]+)>/)?.[1] || selectedMessage.from || '');
                      setSubject(`Re: ${selectedMessage.subject}`);
                      setShowCompose(true);
                    }}
                    className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Répondre
                  </button>
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  <p><strong className="text-slate-700 dark:text-slate-300">De :</strong> {selectedMessage.from}</p>
                  <p><strong className="text-slate-700 dark:text-slate-300">À :</strong> {selectedMessage.to || 'Moi'}</p>
                  <p><strong className="text-slate-700 dark:text-slate-300">Date :</strong> {selectedMessage.date}</p>
                </div>
              </div>

              {/* Message Content */}
              <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed overflow-x-auto max-h-[480px] overflow-y-auto">
                {selectedMessage.bodyHtml ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: selectedMessage.bodyHtml }} 
                    className="prose dark:prose-invert max-w-none"
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans">
                    {selectedMessage.bodyText}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 text-slate-400 text-center">
              <Inbox size={40} className="mb-3 opacity-40" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                Aucun message sélectionné
              </p>
              <p className="text-xs text-slate-400">
                Cliquez sur un email dans la liste de gauche pour lire son contenu.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Email Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-gradient-to-r from-primary-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail size={20} />
                <h3 className="font-extrabold text-sm">Composer un message Gmail</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCompose(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTriggerSend} className="p-6 space-y-4">
              {/* Template quick pills */}
              <div className="flex items-center gap-2 text-xs overflow-x-auto pb-1">
                <span className="text-slate-500 font-bold shrink-0">Modèles :</span>
                <button
                  type="button"
                  onClick={() => applyTemplate('convocation')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium shrink-0 cursor-pointer"
                >
                  Convocation parent
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('bulletin')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium shrink-0 cursor-pointer"
                >
                  Avis Bulletin
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('info')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium shrink-0 cursor-pointer"
                >
                  Annonce générale
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Destinataire (Email) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="parent@exemple.com ou direction@ecole.com"
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:ring-2 focus:ring-primary-500/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Objet du message *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Convocation rencontre parents-professeurs"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:ring-2 focus:ring-primary-500/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Corps du message *
                </label>
                <textarea
                  required
                  rows={8}
                  placeholder="Rédigez votre email ici..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:ring-2 focus:ring-primary-500/20 outline-none resize-none"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCompose(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send size={15} />
                  <span>Envoyer l'email</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mandatory User Confirmation Dialog before sending an email */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                Confirmer l'envoi de l'email ?
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Vous êtes sur le point d'envoyer cet email via votre compte Gmail officiel :
              </p>
              <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-1">
                <p><strong>Destinataire :</strong> {toEmail}</p>
                <p><strong>Objet :</strong> {subject}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <CheckCircle2 size={14} />
                <span>Confirmer et Envoyer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
