import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  KeyRound, 
  Copy, 
  Check, 
  Printer, 
  Eye, 
  EyeOff, 
  Building2, 
  UserCheck, 
  ShieldCheck, 
  X,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Link2,
  Lock
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export interface AccountCredentials {
  fullName: string;
  role: string;
  poste?: string;
  username: string; // Email or Login identifier
  password?: string;
  matricule?: string;
  schoolId?: number | string;
  schoolCode?: string;
  schoolName?: string;
  schoolLoginUrl?: string;
  otp?: string;
  setupLink?: string;
}

interface AccountCreatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentials: AccountCredentials | null;
}

export const AccountCreatedModal: React.FC<AccountCreatedModalProps> = ({
  isOpen,
  onClose,
  credentials
}) => {
  const [showPassword, setShowPassword] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen || !credentials) return null;

  const currentSchoolName = credentials.schoolName || 'Votre Établissement';
  
  // Construct exclusive school login URL
  const schoolLoginUrl = credentials.schoolLoginUrl 
    ? (credentials.schoolLoginUrl.startsWith('http') ? credentials.schoolLoginUrl : `${window.location.origin}${credentials.schoolLoginUrl}`)
    : (credentials.schoolId 
        ? `${window.location.origin}/login?school_id=${credentials.schoolId}`
        : (credentials.schoolCode 
            ? `${window.location.origin}/login?code=${encodeURIComponent(credentials.schoolCode)}`
            : `${window.location.origin}/login`));

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copié dans le presse-papier !`);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const getFullShareText = () => {
    return `🏫 ÉTABLISSEMENT : ${currentSchoolName}
━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 COLLABORATEUR : ${credentials.fullName}
💼 POSTE / RÔLE : ${credentials.poste || credentials.role.toUpperCase()}
${credentials.matricule ? `📋 MATRICULE : ${credentials.matricule}\n` : ''}━━━━━━━━━━━━━━━━━━━━━━━━━━
🔐 IDENTIFIANTS D'ACCÈS :
📧 Identifiant : ${credentials.username}
🔑 Mot de passe : ${credentials.password || 'Défini par l\'administrateur'}
${credentials.otp ? `🔢 Code d'activation OTP : ${credentials.otp}\n` : ''}━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 LIEN DE CONNEXION EXCLUSIF DE L'ÉCOLE :
${schoolLoginUrl}

⚠️ Remarque : Ce lien ouvre directement la page de connexion sécurisée et dédiée à ${currentSchoolName}. Conservez ces accès en lieu sûr.`;
  };

  const handleCopyAll = () => {
    copyToClipboard(getFullShareText(), 'Fiche complète de connexion');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Impossible d\'ouvrir la fenêtre d\'impression');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Fiche de Connexion - ${credentials.fullName} (${currentSchoolName})</title>
          <style>
            @page { size: A5 landscape; margin: 12mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 16px;
              background: #ffffff;
            }
            .card {
              border: 2px solid #0284c7;
              border-radius: 16px;
              padding: 22px;
              max-width: 620px;
              margin: 0 auto;
              background: #ffffff;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 14px;
              margin-bottom: 16px;
            }
            .school-name {
              font-size: 19px;
              font-weight: 800;
              color: #0369a1;
            }
            .badge {
              background: #e0f2fe;
              color: #0369a1;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .user-info {
              margin-bottom: 16px;
              background: #f8fafc;
              padding: 10px 14px;
              border-radius: 10px;
              border: 1px solid #e2e8f0;
            }
            .user-name {
              font-size: 16px;
              font-weight: 800;
              margin: 0 0 2px 0;
              color: #0f172a;
            }
            .user-role {
              font-size: 13px;
              color: #475569;
            }
            .creds-box {
              background: #f0fdf4;
              border: 1.5px solid #86efac;
              border-radius: 12px;
              padding: 14px 16px;
              margin-bottom: 14px;
            }
            .cred-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 7px 0;
              border-bottom: 1px dashed #bbf7d0;
            }
            .cred-row:last-child {
              border-bottom: none;
            }
            .cred-label {
              font-weight: 700;
              color: #166534;
              font-size: 13px;
            }
            .cred-val {
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              font-size: 15px;
              font-weight: 800;
              color: #0f172a;
            }
            .link-box {
              background: #f0f9ff;
              border: 1.5px solid #7dd3fc;
              border-radius: 10px;
              padding: 10px 14px;
              margin-bottom: 12px;
            }
            .link-title {
              font-size: 11px;
              font-weight: 800;
              color: #0369a1;
              text-transform: uppercase;
              margin-bottom: 3px;
            }
            .link-url {
              font-family: monospace;
              font-size: 12px;
              font-weight: 700;
              color: #0284c7;
              word-break: break-all;
            }
            .footer {
              text-align: center;
              font-size: 11px;
              color: #64748b;
              margin-top: 12px;
              border-top: 1px solid #f1f5f9;
              padding-top: 8px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div>
                <div class="school-name">🏛️ ${currentSchoolName}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Plateforme Scolaire MégafixaEduc Pro</div>
              </div>
              <span class="badge">Accès Professionnel</span>
            </div>

            <div class="user-info">
              <div class="user-name">👤 ${credentials.fullName}</div>
              <div class="user-role">Poste / Rôle : <strong>${credentials.poste || credentials.role.toUpperCase()}</strong> ${credentials.matricule ? `• Matricule : <strong>${credentials.matricule}</strong>` : ''}</div>
            </div>

            <div class="creds-box">
              <div class="cred-row">
                <span class="cred-label">Identifiant / Email :</span>
                <span class="cred-val">${credentials.username}</span>
              </div>
              <div class="cred-row">
                <span class="cred-label">Mot de passe temporaire :</span>
                <span class="cred-val">${credentials.password || '••••••••'}</span>
              </div>
              ${credentials.otp ? `
              <div class="cred-row">
                <span class="cred-label">Code d'activation OTP :</span>
                <span class="cred-val">${credentials.otp}</span>
              </div>` : ''}
            </div>

            <div class="link-box">
              <div class="link-title">🔗 Lien de connexion exclusif à l'établissement :</div>
              <div class="link-url">${schoolLoginUrl}</div>
            </div>

            <div class="footer">
              Ce compte et ce lien sont strictement rattachés à <strong>${currentSchoolName}</strong>. Conservez ces informations en lieu sûr.
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden my-6"
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                <KeyRound className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-black uppercase tracking-wider text-emerald-100">
                  <Sparkles size={12} className="text-amber-300" />
                  Compte créé & rattaché
                </span>
                <h3 className="text-xl font-black text-white tracking-tight">
                  Identifiants de Connexion
                </h3>
              </div>
            </div>
            <p className="text-xs text-emerald-100 mt-1 leading-relaxed">
              Le compte utilisateur a été généré et rattaché de manière exclusive à votre établissement.
            </p>
          </div>

          <div className="p-6 space-y-4">
            {/* School & User Info Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800">
                  <Building2 size={16} className="text-primary-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-600">Établissement rattaché :</span>
                </div>
                <span className="text-xs font-extrabold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-200">
                  {currentSchoolName}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800">
                  <UserCheck size={16} className="text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-600">Collaborateur :</span>
                </div>
                <span className="text-xs font-black text-slate-900">
                  {credentials.fullName}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800">
                  <ShieldCheck size={16} className="text-indigo-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-600">Poste & Rôle :</span>
                </div>
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200 uppercase">
                  {credentials.poste || credentials.role}
                </span>
              </div>

              {credentials.matricule && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-xs text-slate-500 font-medium">Matricule :</span>
                  <span className="text-xs font-mono font-bold text-slate-700">
                    {credentials.matricule}
                  </span>
                </div>
              )}
            </div>

            {/* Exclusive School Login Link Banner */}
            <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black text-sky-900">
                  <Link2 className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>Lien de connexion direct de l'école :</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                  <Lock size={10} />
                  Réservé à l'école
                </span>
              </div>

              <div className="flex items-center justify-between bg-white border border-sky-200 rounded-xl px-3 py-2">
                <span className="font-mono text-xs font-bold text-sky-900 select-all truncate mr-2">
                  {schoolLoginUrl}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(schoolLoginUrl, 'Lien de l\'école')}
                    className="p-1.5 hover:bg-sky-100 rounded-lg text-sky-700 transition-colors"
                    title="Copier le lien direct de l'établissement"
                  >
                    {copiedField === 'Lien de l\'école' ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  </button>
                  <a
                    href={schoolLoginUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-sky-100 rounded-lg text-sky-700 transition-colors"
                    title="Ouvrir la page de connexion exclusive de l'école"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>

              <p className="text-[11px] text-sky-700 leading-tight">
                Ce lien ouvre la page de connexion verrouillée sur le compte de <strong>{currentSchoolName}</strong>.
              </p>
            </div>

            {/* Credentials Card */}
            <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/70 border-2 border-emerald-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <KeyRound size={14} className="text-emerald-600" />
                  Identifiants du compte
                </span>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  Actif
                </span>
              </div>

              {/* Username / Email */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-600">Identifiant (Email / Login) :</label>
                  <span className="text-[10px] text-slate-400">Pour se connecter</span>
                </div>
                <div className="flex items-center justify-between bg-white border border-emerald-200 rounded-xl px-3 py-2">
                  <span className="font-mono text-sm font-black text-slate-900 select-all break-all">
                    {credentials.username}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(credentials.username, 'Identifiant')}
                    className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-700 transition-colors shrink-0 ml-2"
                    title="Copier l'identifiant"
                  >
                    {copiedField === 'Identifiant' ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* Password */}
              {credentials.password && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-600">Mot de passe temporaire :</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1"
                    >
                      {showPassword ? (
                        <>
                          <EyeOff size={13} />
                          <span>Masquer</span>
                        </>
                      ) : (
                        <>
                          <Eye size={13} />
                          <span>Afficher</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-between bg-white border border-emerald-200 rounded-xl px-3 py-2">
                    <span className="font-mono text-sm font-black text-slate-900 tracking-wider">
                      {showPassword ? credentials.password : '••••••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(credentials.password || '', 'Mot de passe')}
                      className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-700 transition-colors shrink-0 ml-2"
                      title="Copier le mot de passe"
                    >
                      {copiedField === 'Mot de passe' ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {/* OTP (if provided) */}
              {credentials.otp && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-600">Code d'activation OTP :</label>
                    <span className="text-[10px] text-amber-700 font-bold">Valable 24h</span>
                  </div>
                  <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <span className="font-mono text-sm font-black text-amber-900 tracking-widest">
                      {credentials.otp}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(credentials.otp || '', 'Code OTP')}
                      className="p-1.5 hover:bg-amber-100 rounded-lg text-amber-700 transition-colors shrink-0 ml-2"
                      title="Copier le code OTP"
                    >
                      {copiedField === 'Code OTP' ? <Check size={16} className="text-amber-600" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleCopyAll}
                className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                {copiedField === 'Fiche complète de connexion' ? (
                  <>
                    <Check size={16} />
                    <span>Fiche copiée !</span>
                  </>
                ) : (
                  <>
                    <MessageSquare size={16} />
                    <span>Copier (WhatsApp / SMS)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Printer size={16} />
                <span>Imprimer la fiche</span>
              </button>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl font-bold text-xs transition-colors"
              >
                Fermer et continuer
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

