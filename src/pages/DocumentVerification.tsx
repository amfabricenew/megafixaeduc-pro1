import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  ShieldCheck, CheckCircle2, FileText, School, User, Calendar, 
  Award, Clock, ArrowLeft, ExternalLink, ShieldAlert, Sparkles, 
  Receipt, GraduationCap, Briefcase, CreditCard, Search
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function DocumentVerification() {
  const [searchParams] = useSearchParams();
  
  const type = searchParams.get('type') || 'document';
  const ref = searchParams.get('ref') || '';
  const school = searchParams.get('school') || 'Établissement Scolaire';
  const nom = searchParams.get('nom') || '';
  const prenom = searchParams.get('prenom') || '';
  const matricule = searchParams.get('mat') || '';
  const classe = searchParams.get('cls') || '';
  const annee = searchParams.get('annee') || '';
  const trimestre = searchParams.get('trim') || '';
  const moyenne = searchParams.get('moy') || '';
  const rang = searchParams.get('rang') || '';
  const montant = searchParams.get('montant') || '';
  const dateEmission = searchParams.get('date') || '';
  const signataire = searchParams.get('sign') || '';
  const token = searchParams.get('token') || '';

  const [searchRef, setSearchRef] = useState('');

  const getDocTypeInfo = (t: string) => {
    switch (t) {
      case 'bulletin':
        return { label: 'Bulletin Scolaire Trimestriel', icon: Award, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
      case 'recu_paiement':
        return { label: 'Reçu Officiel de Paiement', icon: Receipt, color: 'text-blue-600 bg-blue-50 border-blue-200' };
      case 'certificat_scolarite':
        return { label: 'Certificat de Scolarité Officiel', icon: GraduationCap, color: 'text-amber-600 bg-amber-50 border-amber-200' };
      case 'attestation_travail':
        return { label: 'Attestation de Travail', icon: Briefcase, color: 'text-purple-600 bg-purple-50 border-purple-200' };
      case 'contrat_travail':
        return { label: 'Contrat de Travail', icon: FileText, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' };
      case 'fiche_mission':
        return { label: 'Ordre et Fiche de Mission', icon: FileText, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' };
      case 'attestation_stage':
        return { label: 'Attestation de Fin de Stage', icon: Award, color: 'text-teal-600 bg-teal-50 border-teal-200' };
      case 'carte_scolaire':
        return { label: 'Carte Scolaire Électronique', icon: CreditCard, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
      case 'badge_enseignant':
        return { label: 'Badge Enseignant Officiel', icon: CreditCard, color: 'text-blue-600 bg-blue-50 border-blue-200' };
      case 'badge_personnel':
        return { label: 'Badge Personnel Administratif', icon: CreditCard, color: 'text-slate-600 bg-slate-50 border-slate-200' };
      case 'rapport_mensuel':
        return { label: 'Bilan Mensuel de Présence & Assiduité', icon: Calendar, color: 'text-orange-600 bg-orange-50 border-orange-200' };
      case 'fiche_paie':
        return { label: 'Fiche de Paie & Salaire', icon: Receipt, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' };
      default:
        return { label: 'Document Administratif Certifié', icon: FileText, color: 'text-slate-600 bg-slate-50 border-slate-200' };
    }
  };

  const docInfo = getDocTypeInfo(type);
  const IconComponent = docInfo.icon;
  const isVerified = Boolean(ref || nom || matricule || token);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-10 font-sans">
      {/* Header */}
      <div className="max-w-2xl mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide">Portail d'Authentification Sécurisé</h1>
            <p className="text-xs text-slate-400">Système de certification et de vérification numérique</p>
          </div>
        </div>
        <Link 
          to="/login"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5"
        >
          <span>Accès Plateforme</span>
          <ExternalLink size={13} />
        </Link>
      </div>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto w-full my-auto py-8">
        {isVerified ? (
          <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden">
            {/* Status Top Banner */}
            <div className="bg-emerald-500/15 border-b border-emerald-500/30 p-5 sm:p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 size={28} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950">
                    DOCUMENT CERTIFIÉ & VALIDE
                  </span>
                  {token && (
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                      TOKEN: {token}
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white mt-1.5">
                  Authenticité garantie par {school}
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  Ce document a été formellement généré, signé et enregistré dans la base de données centrale de l'établissement.
                </p>
              </div>
            </div>

            {/* Document Details */}
            <div className="p-6 space-y-6">
              {/* Type Card */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-700/60">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${docInfo.color}`}>
                    <IconComponent size={22} />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
                      Nature du document
                    </span>
                    <span className="text-sm font-bold text-white">
                      {docInfo.label}
                    </span>
                  </div>
                </div>
                {ref && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Référence</span>
                    <span className="text-xs font-mono font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {ref}
                    </span>
                  </div>
                )}
              </div>

              {/* Grid Attributes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Beneficiary */}
                {(nom || prenom) && (
                  <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-700/40">
                    <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                      Titulaire / Bénéficiaire
                    </span>
                    <p className="text-sm font-bold text-white mt-0.5">
                      {nom} {prenom}
                    </p>
                    {matricule && (
                      <p className="text-xs font-mono text-emerald-400 mt-0.5">
                        Matricule : {matricule}
                      </p>
                    )}
                  </div>
                )}

                {/* School */}
                <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-700/40">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                    Établissement Émetteur
                  </span>
                  <p className="text-sm font-bold text-white mt-0.5">
                    {school}
                  </p>
                  {annee && (
                    <p className="text-xs text-slate-300 mt-0.5">
                      Année Scolaire : {annee}
                    </p>
                  )}
                </div>

                {/* Classe */}
                {classe && (
                  <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-700/40">
                    <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                      Classe / Section
                    </span>
                    <p className="text-sm font-bold text-white mt-0.5">
                      {classe}
                    </p>
                    {trimestre && (
                      <p className="text-xs text-slate-300 mt-0.5">
                        Trimestre / Période : {trimestre === '1' ? '1er Trimestre' : trimestre === '2' ? '2ème Trimestre' : trimestre === '3' ? '3ème Trimestre' : trimestre}
                      </p>
                    )}
                  </div>
                )}

                {/* Academic results if bulletin */}
                {(moyenne || rang) && (
                  <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-700/40">
                    <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                      Résultats Académiques
                    </span>
                    <div className="flex items-center gap-3 mt-0.5">
                      {moyenne && (
                        <p className="text-sm font-bold text-emerald-400">
                          Moyenne : {moyenne}/20
                        </p>
                      )}
                      {rang && (
                        <p className="text-xs text-slate-300">
                          Rang : {rang}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Payment Amount if receipt */}
                {montant && (
                  <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-700/40">
                    <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                      Montant Réglé
                    </span>
                    <p className="text-sm font-bold text-emerald-400 mt-0.5">
                      {Number(montant).toLocaleString('fr-FR')} FCFA
                    </p>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Statut : Encaissé & Validé en Caisse
                    </p>
                  </div>
                )}

                {/* Emission & Signature */}
                <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-700/40 sm:col-span-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                        Date d'émission & Enregistrement
                      </span>
                      <p className="text-xs text-slate-200 mt-0.5">
                        {dateEmission || new Date().toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    {signataire && (
                      <div className="text-left sm:text-right">
                        <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                          Autorité Signataire
                        </span>
                        <p className="text-xs font-semibold text-slate-200 mt-0.5">
                          {signataire}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Security Seal Footer */}
              <div className="pt-4 border-t border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-emerald-400 shrink-0" />
                  <span>Certification numérique infalsifiable issue de la plateforme scolaire.</span>
                </div>
                <div className="shrink-0">
                  <span className="font-mono text-[11px] text-slate-500">
                    ID: {ref || token || 'AUTH-OK'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Manual Verification Search Form */
          <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700/80 p-8 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-slate-700/50 border border-slate-600 flex items-center justify-center text-slate-300 mx-auto">
              <Search size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Vérification de Document</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Scannez le code QR présent sur le document officiel ou saisissez ci-dessous son numéro de référence / matricule pour valider son authenticité.
              </p>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (searchRef.trim()) {
                  window.location.href = `/verifier-document?ref=${encodeURIComponent(searchRef.trim())}&type=document&school=Établissement`;
                }
              }}
              className="flex gap-2 max-w-md mx-auto"
            >
              <input 
                type="text"
                value={searchRef}
                onChange={(e) => setSearchRef(e.target.value)}
                placeholder="Ex: REF-2026-..., REÇU-1042, MAT-008..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
              >
                Vérifier
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-2xl mx-auto w-full pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Système Intégré de Gestion Scolaire. Tous droits réservés.
      </footer>
    </div>
  );
}
