import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  ExternalLink, 
  RefreshCw, 
  AlertCircle, 
  Calendar, 
  CheckCircle,
  FileSpreadsheet,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { 
  listGoogleDocs, 
  createGoogleDocWithTemplate, 
  GoogleDriveDocFile,
  getWorkspaceAccessToken 
} from '../../lib/google-workspace';
import { WorkspaceConfirmDialog } from './WorkspaceConfirmDialog';
import { toast } from 'react-hot-toast';

const DOC_TEMPLATES = [
  {
    id: 'pv_conseil',
    name: 'Procès-Verbal de Conseil de Classe',
    desc: 'Bilan trimestriel, décisions d\'orientation et tableau d\'honneur.',
    defaultTitle: 'PV - Conseil de Classe Trimestre 2 - 2025/2026',
    content: `RÉPUBLIQUE DU BÉNIN
MINISTÈRE DES ENSEIGNEMENTS SECONDAIRE, TECHNIQUE ET DE LA FORMATION PROFESSIONNELLE
COMPLEXE SCOLAIRE MONT SINAÏ

============================================================
PROCÈS-VERBAL DU CONSEIL DE CLASSE
============================================================

Année Scolaire : 2025 - 2026
Trimestre : Deuxième Trimestre
Classe : 3ème A
Date et Heure : ${new Date().toLocaleDateString('fr-FR')} à 15h00
Lieu : Salle des délibérations

Membres Présents :
- Président de séance : Le Censeur / La Direction
- Professeur Principal : M. / Mme ...
- Représentants des professeurs des matières fondamentales
- Délégués des élèves et représentants des parents d'élèves

ORDRE DU JOUR :
1. Bilan général des résultats du trimestre
2. Analyse de la discipline et de l'assiduité
3. Attribution des distinctions (Tableau d'honneur, encouragements, félicitations)
4. Mesures de remédiation et sanctions éventuelles

SYNTHÈSE DES RÉSULTATS :
- Effectif total : ... élèves (Filles : ..., Garçons : ...)
- Moyenne générale de la classe : ... / 20
- Plus forte moyenne : ... / 20
- Plus faible moyenne : ... / 20
- Taux de réussite (moyenne >= 10) : ... %

DÉCISIONS ET RECOMMANDATIONS :
...

Fait à Cotonou, le ${new Date().toLocaleDateString('fr-FR')}
Le Professeur Principal                       Le Chef d'Établissement`
  },
  {
    id: 'convocation_parent',
    name: 'Convocation Officielle d\'un Parent',
    desc: 'Courrier formel d\'entretien pour motif disciplinaire ou pédagogique.',
    defaultTitle: 'Convocation Parent d\'Élève - Direction Pédagogique',
    content: `COMPLEXE SCOLAIRE MONT SINAÏ
Direction des Études & Vie Scolaire
Cotonou, République du Bénin

CONVOCATION OFFICIELLE

Destinataire : Monsieur / Madame le Parent ou Tuteur de l'élève ...
Classe : ...
Matricule : ...

Madame, Monsieur,

La Direction du Complexe Scolaire vous prie de bien vouloir vous présenter au bureau de la Direction le :
Date : ...
Heure : ...

Objet de l'entretien :
[ ] Bilan disciplinaire et conduite
[ ] Suivi du travail scolaire et difficultés d'apprentissage
[ ] Situation administrative et financière
[ ] Autre motif : ...

Votre présence est indispensable pour la bonne poursuite de la scolarité de votre enfant.

Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.

La Direction du Complexe Scolaire`
  },
  {
    id: 'reglement_interieur',
    name: 'Règlement Intérieur Scolaire',
    desc: 'Cadre officiel de discipline, assiduité et tenue des élèves.',
    defaultTitle: 'Règlement Intérieur - Complexe Scolaire Mont Sinaï',
    content: `COMPLEXE SCOLAIRE MONT SINAÏ
DISCIPLINE - TRAVAIL - SUCCÈS

RÈGLEMENT INTÉRIEUR GÉNÉRAL DE L'ÉTABLISSEMENT

ARTICLE 1 : HORAIRES ET ASSIDUITÉ
- Les cours débutent strictement à 07h30 le matin et à 15h00 l'après-midi.
- Toute absence non justifiée par un certificat médical ou un mot officiel des parents dans les 48h sera sanctionnée.

ARTICLE 2 : TENUE VESTIMENTAIRE ET COMPORTEMENT
- Le port de l'uniforme officiel complet est obligatoire du lundi au vendredi.
- Les téléphones portables sont strictement interdits dans les salles de classe sauf instruction pédagogique expresse.

ARTICLE 3 : ÉVALUATIONS ET DEVOIRS
- La présence aux devoirs surveillés et compositions trimestrielles est obligatoire.
- Toute fraude entraîne automatiquement la note zéro (00/20) et comparution en conseil de discipline.

Fait pour servir et valoir ce que de droit.`
  },
  {
    id: 'rapport_incident',
    name: 'Rapport d\'Incident Disciplinaire',
    desc: 'Fiche d\'incident formelle pour le dossier scolaire de l\'élève.',
    defaultTitle: 'Rapport d\'Incident Disciplinaire - Année Scolaire 2025/2026',
    content: `COMPLEXE SCOLAIRE MONT SINAÏ
FICHE D'INCIDENT DISCIPLINAIRE

Date de l'incident : ${new Date().toLocaleDateString('fr-FR')}
Heure : ...
Lieu : [ ] En classe  [ ] Cour de récréation  [ ] Autre : ...

Élève(s) impliqué(s) :
- Nom et Prénom : ... | Classe : ...
- Nom et Prénom : ... | Classe : ...

Rapporteur de l'incident :
Nom : ... | Fonction : [ ] Enseignant  [ ] Surveillant général  [ ] Autre

DESCRIPTION PRÉCISE DES FAITS :
...

MESURES IMMÉDIATES PRISES :
[ ] Exclusion temporaire de cours
[ ] Saisie d'objet interdit
[ ] Notification à la Direction

Signature du déclarant :                      Visa du Censeur :`
  }
];

export const GoogleDocsView: React.FC = () => {
  const [docs, setDocs] = useState<GoogleDriveDocFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Doc Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(DOC_TEMPLATES[0]);
  const [docTitle, setDocTitle] = useState(DOC_TEMPLATES[0].defaultTitle);
  const [docBody, setDocBody] = useState(DOC_TEMPLATES[0].content);

  // Confirmation state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    action: async () => {},
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchDocs = async () => {
    if (!getWorkspaceAccessToken()) return;
    setIsLoading(true);
    setError(null);
    try {
      const items = await listGoogleDocs();
      setDocs(items);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Impossible de charger vos documents Google Docs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleSelectTemplate = (template: typeof DOC_TEMPLATES[0]) => {
    setSelectedTemplate(template);
    setDocTitle(template.defaultTitle);
    setDocBody(template.content);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) {
      toast.error('Veuillez spécifier le titre du document.');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Créer ce document dans Google Docs ?',
      description: `Un nouveau document "${docTitle}" sera créé sur votre Google Drive avec le texte pré-formaté du modèle "${selectedTemplate.name}".`,
      confirmLabel: 'Créer dans Google Docs',
      action: async () => {
        setIsProcessing(true);
        try {
          const created = await createGoogleDocWithTemplate(docTitle, docBody);
          toast.success('Document Google Docs créé avec succès !');
          setIsModalOpen(false);
          fetchDocs();
          if (created.webViewLink) {
            window.open(created.webViewLink, '_blank');
          }
        } catch (err: any) {
          toast.error(err.message || 'Erreur lors de la création');
        } finally {
          setIsProcessing(false);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <FileText size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Documents & Rapports Google Docs</h2>
            <p className="text-xs text-slate-500">Générez et rédigez vos procès-verbaux et rapports officiels</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={fetchDocs}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Rafraîchir"
          >
            <RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <a
            href="https://docs.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <ExternalLink size={14} />
            <span>Ouvrir Google Docs</span>
          </a>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-100 flex items-center gap-1.5 transition-all"
          >
            <Plus size={16} />
            <span>Nouveau Document</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Docs List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Documents Google Docs récents ({docs.length})
          </span>
          <span className="text-xs text-slate-400">Accès direct sur Google Drive</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">Chargement de vos documents Google Docs...</p>
          </div>
        ) : docs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <FileText size={38} className="mx-auto text-slate-300" />
            <p className="text-sm font-medium text-slate-600">Aucun document Google Docs trouvé récemment</p>
            <p className="text-xs text-slate-400">Cliquez sur « Nouveau Document » pour générer un PV ou rapport à partir d'un modèle scolaire.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {docs.map(doc => (
              <div 
                key={doc.id} 
                className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-800 truncate">{doc.name}</h4>
                    <p className="text-xs text-slate-400">
                      Modifié le {doc.modifiedTime ? new Date(doc.modifiedTime).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'récemment'}
                    </p>
                  </div>
                </div>

                <a
                  href={doc.webViewLink || `https://docs.google.com/document/d/${doc.id}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors flex items-center gap-1.5 flex-shrink-0"
                >
                  <ExternalLink size={13} />
                  <span>Éditer dans Docs</span>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: New Google Doc with Template */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-bold text-base">Créer un Document Google Docs Officiel</h3>
                <p className="text-xs text-indigo-100">Modèles pré-rédigés pour la gestion scolaire</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 overflow-y-auto">
              {/* Template Picker */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Choisissez un modèle de document :
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DOC_TEMPLATES.map(t => {
                    const isSelected = selectedTemplate.id === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleSelectTemplate(t)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <FileText size={15} className={isSelected ? 'text-indigo-600' : 'text-slate-400'} />
                          <h4 className={`text-xs font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                            {t.name}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {t.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nom du document Google Docs *
                </label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={e => setDocTitle(e.target.value)}
                  placeholder="Titre du document..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Aperçu du contenu initial à injecter :
                </label>
                <textarea
                  rows={8}
                  value={docBody}
                  onChange={e => setDocBody(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center gap-1.5"
                >
                  <Sparkles size={15} />
                  <span>Générer dans Google Docs</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <WorkspaceConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        isProcessing={isProcessing}
        onConfirm={confirmDialog.action}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
