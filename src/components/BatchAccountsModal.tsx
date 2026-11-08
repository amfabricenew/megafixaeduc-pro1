import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  KeyRound, 
  Copy, 
  Check, 
  Download, 
  Eye, 
  EyeOff, 
  Building2, 
  X,
  ExternalLink,
  Sparkles,
  Link2,
  Lock,
  Search,
  FileText,
  UserCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  TeacherAccountData, 
  generateSingleTeacherAccessPdf, 
  generateBatchTeachersAccessPdf 
} from '../utils/teacherAccountPdf';

export type { TeacherAccountData };

interface BatchAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: TeacherAccountData[];
  schoolInfo?: any;
}

export const BatchAccountsModal: React.FC<BatchAccountsModalProps> = ({
  isOpen,
  onClose,
  accounts,
  schoolInfo
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  if (!isOpen || !accounts || accounts.length === 0) return null;

  const currentSchoolName = schoolInfo?.nom || accounts[0]?.schoolName || 'Votre Établissement';
  const currentSchoolCode = schoolInfo?.code_ecole || accounts[0]?.schoolCode || `SCH-${schoolInfo?.id || '0001'}`;
  
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const schoolLoginUrl = accounts[0]?.schoolLoginUrl 
    ? (accounts[0].schoolLoginUrl.startsWith('http') ? accounts[0].schoolLoginUrl : `${origin}${accounts[0].schoolLoginUrl}`)
    : `${origin}/login?code=${encodeURIComponent(currentSchoolCode)}`;

  const togglePasswordVisibility = (id: string | number) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const copyToClipboard = (text: string, fieldKey: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    toast.success(`${label} copié !`);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleCopyAll = () => {
    const textLines = [
      `🏫 ÉTABLISSEMENT : ${currentSchoolName} (Code: ${currentSchoolCode})`,
      `🌐 LIEN DE CONNEXION DE L'ÉCOLE : ${schoolLoginUrl}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `COMPTES ET IDENTIFIANTS DES ENSEIGNANTS (${accounts.length}) :`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ...accounts.map((acc, index) => {
        const iden = acc.identifiant || acc.username || `${acc.prenom}.${acc.nom}`;
        const pass = acc.password || acc.mot_de_passe_initial || 'Non défini';
        return `${index + 1}. ${acc.nom.toUpperCase()} ${acc.prenom}${acc.matricule ? ` (Matricule: ${acc.matricule})` : ''}\n   - Identifiant : ${iden}\n   - Mot de passe : ${pass}\n   - Matière : ${acc.matieres_noms || acc.matiere || 'Polyvalent'}`;
      }),
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `⚠️ Remarque : Chaque enseignant peut modifier son mot de passe dès sa première connexion.`
    ].join('\n');

    navigator.clipboard.writeText(textLines);
    toast.success('Tous les identifiants ont été copiés dans le presse-papier !');
  };

  const filteredAccounts = accounts.filter(acc => {
    const q = searchTerm.toLowerCase();
    const fullName = `${acc.nom} ${acc.prenom}`.toLowerCase();
    const iden = (acc.identifiant || acc.username || '').toLowerCase();
    const mat = (acc.matricule || '').toLowerCase();
    return fullName.includes(q) || iden.includes(q) || mat.includes(q);
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden my-6 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 text-white relative shrink-0">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 backdrop-blur-md flex items-center justify-center border border-amber-400/30 text-amber-400">
                <KeyRound size={26} />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black uppercase tracking-wider border border-emerald-500/30">
                  <Sparkles size={12} className="text-amber-300" />
                  {accounts.length} Compte{accounts.length > 1 ? 's' : ''} Généré{accounts.length > 1 ? 's' : ''} avec Succès
                </div>
                <h2 className="text-xl font-black text-white tracking-tight mt-1">
                  Planche d'Identifiants & Accès Enseignants
                </h2>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              Les identifiants et mots de passe ont été générés automatiquement pour vos enseignants sous le compte de l'établissement.
            </p>
          </div>

          {/* School login link banner */}
          <div className="p-4 bg-gradient-to-r from-sky-50 to-blue-50 border-b border-sky-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                <Link2 size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-sky-900">Lien de connexion commun pour les enseignants :</span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-sky-200/70 text-sky-800">
                    {currentSchoolName}
                  </span>
                </div>
                <div className="text-xs font-mono font-bold text-sky-700 select-all truncate max-w-md sm:max-w-xl">
                  {schoolLoginUrl}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => copyToClipboard(schoolLoginUrl, 'school_link', 'Lien de l\'école')}
                className="px-3 py-1.5 bg-white hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                {copiedField === 'school_link' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>Copier le lien</span>
              </button>
              <a
                href={schoolLoginUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <ExternalLink size={14} />
                <span>Tester</span>
              </a>
            </div>
          </div>

          {/* Action bar: Search, Copy All, PDF Batch */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Filtrer un enseignant ou identifiant..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              <button
                type="button"
                onClick={handleCopyAll}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
              >
                <Copy size={14} className="text-slate-500" />
                <span>Copier toute la liste</span>
              </button>

              <button
                type="button"
                onClick={() => generateBatchTeachersAccessPdf(accounts, schoolInfo)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md"
              >
                <Download size={14} />
                <span>Télécharger Planche PDF Complète</span>
              </button>
            </div>
          </div>

          {/* Accounts list */}
          <div className="p-6 overflow-y-auto space-y-3 flex-1">
            {filteredAccounts.map((acc, index) => {
              const accKey = acc.id || index;
              const isPassVisible = visiblePasswords[accKey] ?? false;
              const identifiant = acc.identifiant || acc.username || `${acc.prenom}.${acc.nom}`;
              const password = acc.password || acc.mot_de_passe_initial || '••••••••';

              return (
                <div 
                  key={accKey}
                  className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-4 transition-all shadow-2xs hover:shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  {/* Teacher Info */}
                  <div className="flex items-center gap-3 min-w-[200px] flex-1">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0 border border-indigo-100">
                      {acc.nom?.[0] || 'E'}{acc.prenom?.[0] || 'N'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 truncate">
                          {acc.nom} {acc.prenom}
                        </span>
                        {acc.matricule && (
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                            {acc.matricule}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {acc.matieres_noms || acc.matiere || 'Enseignant polyvalent'}
                      </p>
                    </div>
                  </div>

                  {/* Credentials Box */}
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    {/* Identifiant */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400">ID :</span>
                      <span className="font-mono font-bold text-xs text-slate-800">{identifiant}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(identifiant, `id_${accKey}`, 'Identifiant')}
                        className="text-slate-400 hover:text-slate-700 p-0.5"
                        title="Copier l'identifiant"
                      >
                        {copiedField === `id_${accKey}` ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      </button>
                    </div>

                    {/* Mot de passe */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-emerald-600">MDP :</span>
                      <span className="font-mono font-bold text-xs text-slate-900">
                        {isPassVisible ? password : '••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(accKey)}
                        className="text-slate-400 hover:text-slate-700 p-0.5"
                        title={isPassVisible ? 'Masquer' : 'Afficher'}
                      >
                        {isPassVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(password, `pass_${accKey}`, 'Mot de passe')}
                        className="text-slate-400 hover:text-slate-700 p-0.5"
                        title="Copier le mot de passe"
                      >
                        {copiedField === `pass_${accKey}` ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>

                  {/* Individual PDF Button */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => generateSingleTeacherAccessPdf(acc, schoolInfo)}
                      className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                      title="Télécharger la fiche individuelle d'accès (PDF)"
                    >
                      <FileText size={14} />
                      <span>Fiche PDF</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredAccounts.length === 0 && (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-sm font-semibold text-slate-600">Aucun enseignant ne correspond à votre recherche.</p>
              </div>
            )}
          </div>

          {/* Footer Notice */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500 shrink-0">
            <span>💡 Chaque enseignant pourra modifier son mot de passe après sa première connexion dans son espace personnel.</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BatchAccountsModal;
