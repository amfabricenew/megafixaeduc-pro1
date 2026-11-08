import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  FileText, Plus, CheckCircle, XCircle, Clock, Download, Settings, RefreshCw, 
  X, Search, Filter, Printer, ExternalLink, UserCheck, Briefcase, GraduationCap,
  Sparkles, Trash2, Eye, Award, Calendar, Check, Send
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { generateDocumentPdf, downloadDocumentPdfDirectly, DocumentData, formatClasseDisplay } from '../utils/documentPdfTemplates';

interface DocumentRequest {
  id: number;
  school_id: number;
  requester_id: number;
  nom: string;
  prenom: string;
  role: string;
  email: string;
  document_type: string;
  motif: string;
  status: string;
  request_date: string;
  processed_date: string;
  processed_by_nom?: string;
  document_data: string;
}

const DOCUMENT_TYPES = [
  { id: 'certificat_travail', label: 'Certificat de Travail', icon: Briefcase, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'contrat_travail', label: 'Contrat de Travail', icon: Award, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { id: 'attestation_travail', label: 'Attestation de Travail', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'certificat_scolarite', label: 'Certificat de Scolarité', icon: GraduationCap, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'fiche_mission', label: 'Fiche & Ordre de Mission', icon: Send, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { id: 'attestation_stage', label: 'Attestation de Fin de Stage', icon: Award, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  { id: 'autorisation_absence', label: 'Autorisation d\'Absence / Congé', icon: Calendar, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  { id: 'autre', label: 'Document Administratif Libre', icon: FileText, color: 'text-slate-600 bg-slate-50 border-slate-200' }
];

const DocumentRequests = ({ isTeacherAdministrativePage }: { isTeacherAdministrativePage?: boolean }) => {
  const { years } = useAuth();
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showNewModal, setShowNewModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showDirectIssueModal, setShowDirectIssueModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState<DocumentRequest | null>(null);
  
  // PDF Preview Modal State
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [activeDocData, setActiveDocData] = useState<DocumentData | null>(null);
  
  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedYearId, setSelectedYearId] = useState<string | number>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');

  // New Request Form State
  const [newDocType, setNewDocType] = useState('certificat_travail');
  const [newMotif, setNewMotif] = useState('');
  
  // Processing Form State
  const [processStatus, setProcessStatus] = useState('completed');
  const [editFields, setEditFields] = useState<any>({
    nom: '',
    prenom: '',
    matricule: '',
    poste: '',
    startDate: '',
    endDate: '',
    typeContrat: 'CDD',
    salaire: '',
    volumeHoraire: 'Temps plein (40h/semaine)',
    classe: '',
    dateNaissance: '',
    lieuNaissance: '',
    anneeScolaire: `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`,
    anneeInscription: `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`,
    nomPere: '',
    nomMere: '',
    classeInscription: '',
    mentionSpeciale: '',
    assiduite: '',
    discipline: '',
    travail: '',
    objet: '',
    lieu: '',
    frais: 'oui',
    moyenTransport: 'Véhicule / Transport commun',
    motifAbsence: '',
    service: 'Service Pédagogique',
    contenu: '',
    titrePerso: 'DOCUMENT OFFICIEL',
    signataireTitre: "Le Chef d'Établissement",
    signataireNom: '',
    headerLines: ''
  });

  // Beneficiaries data
  const [beneficiaries, setBeneficiaries] = useState<{ teachers: any[]; staff: any[]; students: any[] }>({
    teachers: [],
    staff: [],
    students: []
  });
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [loadingClassStudents, setLoadingClassStudents] = useState<boolean>(false);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [selectedYearId]);

  // Automatically load students for the selected class
  useEffect(() => {
    if (!selectedClassId) {
      setClassStudents([]);
      return;
    }
    setLoadingClassStudents(true);
    // Fetch students using primary and fallback endpoints
    Promise.allSettled([
      apiFetch(`/api/classes/${selectedClassId}/details`).then(r => r.ok ? r.json() : null),
      apiFetch(`/api/classes/${selectedClassId}`).then(r => r.ok ? r.json() : null),
      apiFetch(`/api/eleves?classeId=${selectedClassId}`).then(r => r.ok ? r.json() : null)
    ]).then(([detailsRes, classRes, elevesRes]) => {
      let combined: any[] = [];
      const clsName = classes.find(c => String(c.id) === String(selectedClassId))?.nom || '';

      if (detailsRes.status === 'fulfilled' && detailsRes.value) {
        const list = Array.isArray(detailsRes.value?.eleves) ? detailsRes.value.eleves : [];
        combined.push(...list);
      }
      if (classRes.status === 'fulfilled' && classRes.value) {
        const list = Array.isArray(classRes.value?.eleves) ? classRes.value.eleves : [];
        combined.push(...list);
      }
      if (elevesRes.status === 'fulfilled' && Array.isArray(elevesRes.value)) {
        combined.push(...elevesRes.value);
      }

      // Deduplicate by ID
      const unique = combined
        .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
        .map(st => ({
          ...st,
          classe_id: Number(selectedClassId),
          classe_nom: st.classe_nom || clsName
        }));

      setClassStudents(unique);
    }).catch(err => {
      console.error("Erreur chargement élèves:", err);
    }).finally(() => {
      setLoadingClassStudents(false);
    });
  }, [selectedClassId, classes]);

  // Combined and deduplicated student list for currently selected class
  const currentClassStudents = [
    ...(classStudents || []),
    ...(beneficiaries?.students?.filter(st => String(st.classe_id) === String(selectedClassId)) || [])
  ].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
   .sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr', { sensitivity: 'base' }));

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqRes, userRes, schoolRes, benRes, classesRes] = await Promise.all([
        apiFetch(`/api/document-requests?annee_id=${selectedYearId}`).then(r => r.json()),
        apiFetch('/api/auth/me').then(r => r.json()),
        apiFetch('/api/school-info').then(r => r.json()),
        apiFetch('/api/document-beneficiaries').then(r => r.json()).catch(() => ({ teachers: [], staff: [], students: [] })),
        apiFetch('/api/classes').then(r => r.json()).catch(() => [])
      ]);
      setRequests(Array.isArray(reqRes) ? reqRes : []);
      setCurrentUser(userRes);
      setSchoolInfo(schoolRes);
      if (benRes) setBeneficiaries(prev => ({ ...prev, ...benRes }));
      setClasses(Array.isArray(classesRes) ? classesRes : []);

      const userIsAdmin = userRes && ['super_admin', 'admin', 'direction', 'secretariat', 'secretaire', 'censeur'].includes(userRes.role);
      if (!userIsAdmin) {
        setActiveTab('my');
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la récupération des données");
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = currentUser && ['super_admin', 'admin', 'direction', 'secretariat', 'secretaire', 'censeur'].includes(currentUser.role);
  
  // Accès complet autorisé pour toutes les formules
  const isExcellence = true;

  if (!isExcellence && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6">
          <Sparkles className="w-10 h-10 text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Fonctionnalité Premium</h1>
        <p className="text-slate-500 max-w-md mb-8">
          Le module <strong>"Documents & Demandes"</strong> est exclusivement réservé aux établissements abonnés à la <strong>Formule Excellence</strong>.
        </p>
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8 max-w-lg text-left">
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            Inclus dans la Formule Excellence :
          </h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>• Génération illimitée de certificats de travail et contrats</li>
            <li>• Édition automatisée d'attestations de scolarité</li>
            <li>• Workflow complet de validation des demandes administratives</li>
            <li>• Signature numérique et archivage des documents émis</li>
            <li>• Notifications en temps réel dès émission du document</li>
          </ul>
        </div>
        <button 
          onClick={() => window.location.href = '/parametres?tab=subscription'}
          className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95"
        >
          Découvrir nos Formules
        </button>
      </div>
    );
  }

  // Submit User Request
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/document-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_type: newDocType, motif: newMotif })
      });
      if (res.ok) {
        toast.success("Demande soumise avec succès aux administrateurs !");
        setShowNewModal(false);
        setNewDocType('certificat_travail');
        setNewMotif('');
        fetchData();
      } else {
        toast.error("Erreur lors de la soumission");
      }
    } catch (e) {
      toast.error("Erreur de connexion au serveur");
    }
  };

  // Open Process Modal & Prepopulate
  const handleOpenProcessModal = (req: DocumentRequest) => {
    setSelectedReq(req);
    setProcessStatus(req.status === 'pending' ? 'completed' : req.status);
    
    let existingData: any = {};
    try {
      if (req.document_data) {
        existingData = JSON.parse(req.document_data);
      }
    } catch (e) {}

    // Find beneficiary if matching in teachers or staff
    const teacherMatch = beneficiaries?.teachers?.find(t => `${t.nom} ${t.prenom}`.toLowerCase() === `${req.nom} ${req.prenom}`.toLowerCase());
    const staffMatch = beneficiaries?.staff?.find(s => `${s.nom} ${s.prenom}`.toLowerCase() === `${req.nom} ${req.prenom}`.toLowerCase());

    // Auto-detect class for school certificate or student
    if (req.document_type === 'certificat_scolarite' || req.role === 'eleve') {
      const clsName = existingData.classe || (req as any).classe || '';
      const foundCls = classes.find(c => 
        (clsName && c.nom && c.nom.toLowerCase().trim() === clsName.toLowerCase().trim()) || 
        c.id === existingData.classe_id || 
        c.id === (req as any).classe_id
      );
      if (foundCls) {
        setSelectedClassId(String(foundCls.id));
      } else {
        const foundSt = beneficiaries?.students?.find(st => 
          (st.matricule && (st.matricule === (req as any).matricule || st.matricule === existingData.matricule)) || 
          `${st.nom} ${st.prenom}`.toLowerCase() === `${req.nom} ${req.prenom}`.toLowerCase()
        );
        if (foundSt?.classe_id) {
          setSelectedClassId(String(foundSt.classe_id));
        } else if (classes.length > 0 && !selectedClassId) {
          setSelectedClassId(String(classes[0].id));
        }
      }
    }

    setEditFields({
      nom: req.nom || existingData.nom || '',
      prenom: req.prenom || existingData.prenom || '',
      matricule: teacherMatch?.matricule || staffMatch?.matricule || existingData.matricule || '',
      poste: staffMatch?.poste || (req.role === 'enseignant' ? 'Enseignant' : 'Personnel Administratif'),
      startDate: existingData.startDate || staffMatch?.date_embauche || '2024-09-01',
      endDate: existingData.endDate || '',
      typeContrat: existingData.typeContrat || 'CDD',
      salaire: existingData.salaire || '',
      volumeHoraire: existingData.volumeHoraire || 'Temps plein',
      classe: existingData.classe || '',
      dateNaissance: existingData.dateNaissance || '',
      lieuNaissance: existingData.lieuNaissance || '',
      anneeScolaire: existingData.anneeScolaire || '2025 - 2026',
      anneeInscription: existingData.anneeInscription || '2025 - 2026',
      nomPere: existingData.nomPere || '',
      nomMere: existingData.nomMere || '',
      classeInscription: existingData.classeInscription || '',
      mentionSpeciale: existingData.mentionSpeciale || '',
      assiduite: existingData.assiduite || '',
      discipline: existingData.discipline || '',
      travail: existingData.travail || '',
      objet: existingData.objet || 'Mission institutionnelle et pédagogique',
      lieu: existingData.lieu || 'Cotonou',
      frais: existingData.frais || 'oui',
      moyenTransport: existingData.moyenTransport || 'Véhicule de service',
      motifAbsence: existingData.motifAbsence || req.motif || '',
      service: existingData.service || 'Direction des Études',
      contenu: existingData.contenu || '',
      titrePerso: existingData.titrePerso || 'DOCUMENT ADMINISTRATIF',
      signataireTitre: existingData.signataireTitre || "Le Chef d'Établissement",
      signataireNom: existingData.signataireNom || schoolInfo?.nom_directeur || '',
      headerLines: existingData.headerLines || ''
    });

    setShowProcessModal(true);
  };

  // Submit Processing
  const handleSaveProcessing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    try {
      const res = await apiFetch(`/api/document-requests/${selectedReq.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: processStatus,
          document_data: editFields
        })
      });

      if (res.ok) {
        toast.success(processStatus === 'completed' ? "Document validé et émis avec succès !" : "Statut mis à jour");
        setShowProcessModal(false);
        fetchData();
      } else {
        toast.error("Erreur lors de la mise à jour");
      }
    } catch (e) {
      toast.error("Erreur réseau");
    }
  };

  // Direct Issue by Admin
  const handleDirectIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/document-requests/direct-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_type: editFields.document_type || 'certificat_travail',
          motif: 'Émission directe par l\'administration',
          document_data: editFields
        })
      });

      if (res.ok) {
        toast.success("Document émis et archivé avec succès !");
        setShowDirectIssueModal(false);
        fetchData();
      } else {
        toast.error("Erreur lors de l'émission");
      }
    } catch (e) {
      toast.error("Erreur serveur");
    }
  };

  // Delete Request
  const handleDeleteRequest = async (id: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette demande ?")) return;
    try {
      const res = await apiFetch(`/api/document-requests/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Demande supprimée");
        fetchData();
      } else {
        toast.error("Suppression impossible");
      }
    } catch (e) {
      toast.error("Erreur réseau");
    }
  };

  // Construct DocumentData from Request & Fields
  const buildDocumentData = (req: DocumentRequest, customFields?: any): DocumentData => {
    let parsedData = customFields || {};
    if (!customFields && req.document_data) {
      try {
        parsedData = JSON.parse(req.document_data);
      } catch (e) {}
    }

    const isVierge = Boolean(parsedData.isVierge);

    return {
      schoolInfo: {
        ...(schoolInfo || {}),
        nom_directeur: parsedData.signataireNom || schoolInfo?.nom_directeur || '',
        headerLines: parsedData.headerLines ? parsedData.headerLines.split('\n').filter((l: string) => l.trim()) : undefined
      },
      nom: isVierge ? '' : (parsedData.nom || req.nom || 'NOM'),
      prenom: isVierge ? '' : (parsedData.prenom || req.prenom || 'Prénom'),
      role: req.role,
      type: parsedData.document_type || req.document_type || 'certificat_scolarite',
      issueDate: req.processed_date || req.request_date || new Date().toISOString(),
      isVierge,
      specificData: {
        ...parsedData,
        isVierge,
        signataireTitre: parsedData.signataireTitre || "Le Chef d'Établissement",
        signataireNom: parsedData.signataireNom || schoolInfo?.nom_directeur || '',
        lieuSignature: parsedData.lieuSignature || schoolInfo?.adresse?.split(',')[0] || 'Cotonou'
      }
    };
  };

  // Trigger Preview
  const handleOpenPdfPreview = async (req: DocumentRequest) => {
    try {
      const docData = buildDocumentData(req);
      setActiveDocData(docData);

      const doc = await generateDocumentPdf(docData);
      const fileName = `${docData.type}_${(docData.nom || 'Document').replace(/\s+/g, '_')}_${(docData.prenom || '').replace(/\s+/g, '_')}.pdf`;

      // Revoke old URL if exists
      if (pdfPreviewUrl && pdfPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }

      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
      setPdfFileName(fileName);
    } catch (e) {
      console.error("Error generating preview:", e);
      toast.error("Erreur lors de la génération de l'aperçu");
    }
  };

  // Close Preview
  const closePdfPreview = () => {
    if (pdfPreviewUrl && pdfPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(pdfPreviewUrl);
    }
    setPdfPreviewUrl(null);
    setPdfFileName('');
    setActiveDocData(null);
  };

  // Filter requests
  const filteredRequests = requests.filter(req => {
    if (activeTab === 'my' && req.requester_id !== currentUser?.id) return false;
    if (statusFilter !== 'all' && req.status !== statusFilter) return false;
    if (typeFilter !== 'all' && req.document_type !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = `${req.nom} ${req.prenom}`.toLowerCase().includes(q);
      const matchType = req.document_type.toLowerCase().includes(q);
      const matchMotif = (req.motif || '').toLowerCase().includes(q);
      if (!matchName && !matchType && !matchMotif) return false;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
            <CheckCircle size={14} className="text-emerald-500" /> Émis & Disponible
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
            <Clock size={14} className="text-blue-500 animate-spin" /> En cours
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-semibold">
            <XCircle size={14} className="text-rose-500" /> Refusé
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
            <Clock size={14} className="text-amber-500" /> En attente
          </span>
        );
    }
  };

  const getDocTypeMeta = (typeId: string) => {
    return DOCUMENT_TYPES.find(d => d.id === typeId) || {
      id: typeId,
      label: typeId.replace(/_/g, ' '),
      icon: FileText,
      color: 'text-slate-600 bg-slate-50 border-slate-200'
    };
  };

  const totalCompleted = requests.filter(r => r.status === 'completed').length;
  const totalPending = requests.filter(r => r.status === 'pending').length;
  const totalProcessing = requests.filter(r => r.status === 'processing').length;

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 rounded-3xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 text-sm font-medium mb-1">
            <Sparkles size={16} />
            <span>{isAdmin ? "Secrétariat & Direction Administrative" : "Documents Administratifs"}</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold">
            {isAdmin ? "Documents & Demandes Administratives" : "Documents administratifs"}
          </h1>
          <p className="text-indigo-200 text-sm mt-1">
            {isAdmin 
              ? "Génération, traitement et émission officielle des attestations, certificats et contrats." 
              : "Effectuez vos demandes de documents administratifs (attestation de travail, certificat, autorisation d'absence...), suivez leur validation et téléchargez vos documents certifiés."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => fetchData()}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
            title="Actualiser"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => setShowNewModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-indigo-950/30 transition-all active:scale-95"
          >
            <Plus size={18} />
            {isAdmin ? "Faire une Demande" : "Nouvelle Demande de Document"}
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                setEditFields({
                  document_type: 'certificat_travail',
                  nom: '',
                  prenom: '',
                  matricule: '',
                  poste: 'Enseignant',
                  startDate: '2024-09-01',
                  endDate: '',
                  typeContrat: 'CDD',
                  salaire: '',
                  volumeHoraire: 'Temps plein (40h/semaine)',
                  classe: '',
                  dateNaissance: '',
                  lieuNaissance: '',
                  anneeScolaire: '2025 - 2026',
                  objet: 'Mission officielle',
                  lieu: 'Cotonou',
                  frais: 'oui',
                  moyenTransport: 'Véhicule de service',
                  service: 'Direction des Études',
                  contenu: '',
                  titrePerso: 'DOCUMENT OFFICIEL',
                  signataireTitre: "Le Chef d'Établissement",
                  signataireNom: schoolInfo?.nom_directeur || '',
                  lieuSignature: schoolInfo?.adresse?.split(',')[0] || 'Cotonou',
                  isVierge: false
                });
                setShowDirectIssueModal(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-emerald-950/30 transition-all active:scale-95"
            >
              <Award size={18} />
              Émettre Directement
            </button>
          )}
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <FileText size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Demandes</p>
            <p className="text-xl font-bold text-slate-800">{requests.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">En Attente</p>
            <p className="text-xl font-bold text-amber-600">{totalPending}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Settings size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">En Traitement</p>
            <p className="text-xl font-bold text-blue-600">{totalProcessing}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Émis & Prêts</p>
            <p className="text-xl font-bold text-emerald-600">{totalCompleted}</p>
          </div>
        </div>
      </div>

      {/* FILTER & TABS BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* TAB SELECTOR */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
            {isAdmin && (
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Toutes les demandes ({requests.length})
              </button>
            )}
            <button
              onClick={() => setActiveTab('my')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'my' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mes Demandes ({requests.filter(r => r.requester_id === currentUser?.id).length})
            </button>
          </div>

          {/* SEARCH BOX */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher par nom, prénom, motif..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
        </div>

        {/* STATUS & TYPE FILTERS */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mr-2">
            <Filter size={14} /> Filtres :
          </div>

          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">Toutes les années</option>
            {years.map((y: any) => (
              <option key={y.id} value={y.id}>Année {y.libelle} {y.est_active ? '(Active)' : ''}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Tous les Statuts</option>
            <option value="pending">En attente</option>
            <option value="processing">En traitement</option>
            <option value="completed">Émis & Validé</option>
            <option value="rejected">Refusé</option>
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Tous les Types de Documents</option>
            {DOCUMENT_TYPES.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>

          {(statusFilter !== 'all' || typeFilter !== 'all' || selectedYearId !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setTypeFilter('all');
                setSelectedYearId('all');
                setSearchQuery('');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium ml-auto"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      </div>

      {/* REQUESTS LIST TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="animate-spin mx-auto mb-2 text-indigo-500" size={28} />
            <p>Chargement des demandes...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="mx-auto mb-3 text-slate-300" size={48} />
            <h3 className="text-base font-bold text-slate-700 mb-1">Aucune demande trouvée</h3>
            <p className="text-xs text-slate-500 mb-4">
              {searchQuery || statusFilter !== 'all'
                ? "Aucune demande ne correspond à vos critères de recherche."
                : "Commencez par soumettre votre première demande de document."}
            </p>
            <button
              onClick={() => setShowNewModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
            >
              + Faire une demande
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-medium text-xs border-b border-slate-200">
                <tr>
                  <th className="p-4">Demandeur / Bénéficiaire</th>
                  <th className="p-4">Type de Document</th>
                  <th className="p-4">Motif / Détails</th>
                  <th className="p-4">Date de Demande</th>
                  <th className="p-4">Statut</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((req) => {
                  const docMeta = getDocTypeMeta(req.document_type);
                  const Icon = docMeta.icon;
                  const canProcess = isAdmin;
                  const isReady = req.status === 'completed';

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/75 transition-colors group">
                      {/* Requester */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs">
                            {req.prenom?.[0] || ''}{req.nom?.[0] || 'U'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">
                              {req.prenom} {req.nom}
                            </p>
                            <p className="text-xs text-slate-400 capitalize">
                              {req.role === 'enseignant' ? 'Enseignant' : req.role === 'eleve' ? 'Élève' : 'Personnel'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${docMeta.color}`}>
                          <Icon size={14} />
                          {docMeta.label}
                        </span>
                      </td>

                      {/* Motif */}
                      <td className="p-4 max-w-xs">
                        <p className="text-xs text-slate-600 truncate" title={req.motif || 'Aucun motif précisé'}>
                          {req.motif || <span className="text-slate-400 italic">Non précisé</span>}
                        </p>
                      </td>

                      {/* Date */}
                      <td className="p-4 text-xs text-slate-500 whitespace-nowrap">
                        <p>{format(new Date(req.request_date), 'dd/MM/yyyy', { locale: fr })}</p>
                        <p className="text-[10px] text-slate-400">{format(new Date(req.request_date), 'HH:mm', { locale: fr })}</p>
                      </td>

                      {/* Status */}
                      <td className="p-4 whitespace-nowrap">
                        {getStatusBadge(req.status)}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* When Completed: Direct Download and Visual Preview */}
                          {isReady && (
                            <>
                              <button
                                onClick={() => handleOpenPdfPreview(req)}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-200 flex items-center gap-1 text-xs font-semibold shadow-sm"
                                title="Aperçu du document"
                              >
                                <Eye size={15} />
                                <span className="hidden sm:inline">Aperçu</span>
                              </button>

                              <button
                                onClick={() => {
                                  const dData = buildDocumentData(req);
                                  downloadDocumentPdfDirectly(dData);
                                  toast.success("Téléchargement du PDF lancé !");
                                }}
                                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold shadow-sm shadow-indigo-600/20"
                                title="Télécharger le PDF"
                              >
                                <Download size={15} />
                                <span className="hidden sm:inline">PDF</span>
                              </button>
                            </>
                          )}

                          {/* Process / Edit Button for Admin */}
                          {canProcess && (
                            <button
                              onClick={() => handleOpenProcessModal(req)}
                              className={`p-2 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1 border ${
                                req.status === 'pending'
                                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600'
                                  : 'text-slate-600 hover:bg-slate-100 border-slate-200'
                              }`}
                              title="Traiter / Éditer le document"
                            >
                              <Settings size={15} />
                              <span className="hidden sm:inline">{req.status === 'completed' ? 'Modifier' : 'Traiter'}</span>
                            </button>
                          )}

                          {/* Delete Button */}
                          {(isAdmin || req.requester_id === currentUser?.id) && (
                            <button
                              onClick={() => handleDeleteRequest(req.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Supprimer la demande"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL: NOUVELLE DEMANDE (USER) ================= */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Faire une demande de document</h2>
                  <p className="text-xs text-slate-500">Transmise directement à la direction</p>
                </div>
              </div>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Type de pièce souhaitée
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                  {DOCUMENT_TYPES.map(t => {
                    const Icon = t.icon;
                    const isSelected = newDocType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setNewDocType(t.id)}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                          isSelected 
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/20' 
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg border ${t.color}`}>
                          <Icon size={16} />
                        </div>
                        <span className="flex-1">{t.label}</span>
                        {isSelected && <Check size={16} className="text-indigo-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Motif ou précisions (Optionnel)
                </label>
                <textarea
                  value={newMotif}
                  onChange={e => setNewMotif(e.target.value)}
                  rows={3}
                  placeholder="Ex : Pour démarche consulaire, organisme bancaire, inscription..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all"
                >
                  Envoyer la Demande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: TRAITEMENT & ÉDITION (ADMIN) ================= */}
      {showProcessModal && selectedReq && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl my-8 p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Traitement & Émission Officielle</span>
                <h2 className="text-lg font-bold text-slate-800">
                  {DOCUMENT_TYPES.find(t => t.id === selectedReq.document_type)?.label || selectedReq.document_type}
                </h2>
                <p className="text-xs text-slate-500">
                  Demandeur : <strong className="text-slate-700">{selectedReq.prenom} {selectedReq.nom}</strong> ({selectedReq.role})
                </p>
              </div>
              <button onClick={() => setShowProcessModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProcessing} className="space-y-4 mt-4 overflow-y-auto flex-1 pr-1">
              {/* STATUS SELECTOR */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Décision administrative
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setProcessStatus('completed')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      processStatus === 'completed' 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle size={15} /> Valider & Émettre
                  </button>

                  <button
                    type="button"
                    onClick={() => setProcessStatus('processing')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      processStatus === 'processing' 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Clock size={15} /> En cours
                  </button>

                  <button
                    type="button"
                    onClick={() => setProcessStatus('rejected')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      processStatus === 'rejected' 
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <XCircle size={15} /> Rejeter
                  </button>
                </div>
              </div>

              {/* EDITABLE FIELDS */}
              {processStatus === 'completed' && (
                <div className="space-y-3 p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Settings size={14} /> Données de personnalisation du PDF
                    </h3>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const tempDocData = buildDocumentData(selectedReq, editFields);
                          setActiveDocData(tempDocData);
                          const doc = await generateDocumentPdf(tempDocData);
                          const base64String = doc.output('datauristring');
                          setPdfPreviewUrl(base64String);
                          setPdfFileName(`Apercu_${tempDocData.type}.pdf`);
                        } catch (e) {
                          console.error("Preview error:", e);
                          toast.error("Erreur lors de la prévisualisation");
                        }
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                    >
                      <Eye size={13} /> Prévisualiser
                    </button>
                  </div>

                  {/* Beneficiary Selector - Multi-category */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-indigo-100 shadow-sm">
                    {selectedReq.document_type === 'certificat_scolarite' ? (
                      <>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">1. Choisir la Classe</label>
                          <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="">Sélectionner une classe...</option>
                            {classes?.map(c => (
                              <option key={c.id} value={c.id}>{c.nom}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                            2. Choisir l'Élève {loadingClassStudents ? '(Chargement...)' : `(${currentClassStudents.length})`}
                          </label>
                          <select
                            disabled={!selectedClassId || loadingClassStudents}
                            onChange={(e) => {
                              const id = Number(e.target.value);
                              const st = currentClassStudents.find(x => x.id === id);
                              if (st) {
                                const clsName = formatClasseDisplay(st.classe_nom || classes?.find(c => String(c.id) === selectedClassId)?.nom || '');
                                setEditFields({
                                  ...editFields,
                                  nom: st.nom,
                                  prenom: st.prenom,
                                  matricule: st.matricule || '',
                                  classe: clsName,
                                  classeInscription: clsName,
                                  dateNaissance: st.date_naissance || '',
                                  lieuNaissance: st.lieu_naissance || '',
                                  nomPere: st.nom_parent || editFields.nomPere || '',
                                  nomMere: editFields.nomMere || ''
                                });
                              }
                            }}
                            className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="">
                              {loadingClassStudents 
                                ? '-- Chargement des élèves en cours... --' 
                                : currentClassStudents.length === 0 
                                  ? (!selectedClassId ? '-- Sélectionnez d\'abord une classe --' : '-- Aucun élève inscrit dans cette classe --')
                                  : `-- Sélectionner l'élève (${currentClassStudents.length} élèves trouvés) --`}
                            </option>
                            {currentClassStudents.map(st => (
                              <option key={st.id} value={st.id}>
                                {st.nom} {st.prenom} {st.matricule ? `• Matr: ${st.matricule}` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    ) : (
                      <div className="col-span-2">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Charger un profil existant</label>
                        <select
                          onChange={(e) => {
                            if (!e.target.value) return;
                            const [type, id] = e.target.value.split(':');
                            if (type === 'teacher') {
                              const t = beneficiaries?.teachers?.find(x => String(x.id) === id);
                              if (t) {
                                setEditFields({
                                  ...editFields,
                                  nom: t.nom,
                                  prenom: t.prenom,
                                  matricule: t.matricule || '',
                                  poste: t.role === 'enseignant' ? 'Enseignant' : t.poste || 'Enseignant',
                                  startDate: t.date_embauche || editFields.startDate
                                });
                              }
                            } else if (type === 'staff') {
                              const s = beneficiaries?.staff?.find(x => String(x.id) === id);
                              if (s) {
                                setEditFields({
                                  ...editFields,
                                  nom: s.nom,
                                  prenom: s.prenom,
                                  matricule: s.matricule || '',
                                  poste: s.poste || 'Personnel Administratif',
                                  startDate: s.date_embauche || editFields.startDate
                                });
                              }
                            }
                          }}
                          className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">-- Rechercher un personnel / enseignant --</option>
                          <optgroup label="Enseignants">
                            {beneficiaries?.teachers?.map(t => (
                              <option key={`t-${t.id}`} value={`teacher:${t.id}`}>{t.nom} {t.prenom} {t.matricule ? `(${t.matricule})` : ''}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Personnel Administratif">
                            {beneficiaries?.staff?.map(s => (
                              <option key={`s-${s.id}`} value={`staff:${s.id}`}>{s.nom} {s.prenom} {s.matricule ? `(${s.matricule})` : ''}</option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 mt-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">En-tête personnalisé (Optionnel - Un par ligne)</label>
                      <textarea
                        value={editFields.headerLines}
                        onChange={e => setEditFields({ ...editFields, headerLines: e.target.value })}
                        rows={3}
                        placeholder="Ex: RÉPUBLIQUE DU BÉNIN\nMINISTÈRE DE L'ÉDUCATION\nDIRECTION DÉPARTEMENTALE..."
                        className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                      <p className="text-[10px] text-slate-400 mt-1 italic">Si vide, l'en-tête par défaut de l'établissement sera utilisé. Les lignes seront centrées.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nom du bénéficiaire</label>
                      <input
                        type="text"
                        value={editFields.nom}
                        onChange={e => setEditFields({ ...editFields, nom: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Prénom</label>
                      <input
                        type="text"
                        value={editFields.prenom}
                        onChange={e => setEditFields({ ...editFields, prenom: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                        required
                      />
                    </div>
                  </div>

                  {/* Certificat / Attestation Travail Fields */}
                  {(selectedReq.document_type === 'certificat_travail' || selectedReq.document_type === 'attestation_travail' || selectedReq.document_type === 'contrat_travail') && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Fonction / Poste officiel</label>
                          <input
                            type="text"
                            value={editFields.poste}
                            onChange={e => setEditFields({ ...editFields, poste: e.target.value })}
                            placeholder="Ex : Professeur de Mathématiques"
                            className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Matricule</label>
                          <input
                            type="text"
                            value={editFields.matricule}
                            onChange={e => setEditFields({ ...editFields, matricule: e.target.value })}
                            placeholder="Ex : ENS-2025-012"
                            className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Date d'embauche / Début</label>
                          <input
                            type="date"
                            value={editFields.startDate}
                            onChange={e => setEditFields({ ...editFields, startDate: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Date de fin (Laisser vide si en poste)</label>
                          <input
                            type="date"
                            value={editFields.endDate}
                            onChange={e => setEditFields({ ...editFields, endDate: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                          />
                        </div>
                      </div>

                      {selectedReq.document_type === 'contrat_travail' && (
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Type de Contrat</label>
                            <select
                              value={editFields.typeContrat}
                              onChange={e => setEditFields({ ...editFields, typeContrat: e.target.value })}
                              className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                            >
                              <option value="CDD">CDD</option>
                              <option value="CDI">CDI</option>
                              <option value="Vacataire">Vacataire</option>
                              <option value="Prestation">Prestation</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Rémunération</label>
                            <input
                              type="text"
                              value={editFields.salaire}
                              onChange={e => setEditFields({ ...editFields, salaire: e.target.value })}
                              placeholder="Ex : 250 000 FCFA / mois"
                              className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Volume Horaire</label>
                            <input
                              type="text"
                              value={editFields.volumeHoraire}
                              onChange={e => setEditFields({ ...editFields, volumeHoraire: e.target.value })}
                              className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Certificat Scolarité Fields */}
                  {selectedReq.document_type === 'certificat_scolarite' && (
                    <div className="space-y-3 p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nom du Père</label>
                          <input
                            type="text"
                            value={editFields.nomPere || ''}
                            onChange={e => setEditFields({ ...editFields, nomPere: e.target.value })}
                            placeholder="Nom et prénoms du père"
                            className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nom de la Mère</label>
                          <input
                            type="text"
                            value={editFields.nomMere || ''}
                            onChange={e => setEditFields({ ...editFields, nomMere: e.target.value })}
                            placeholder="Nom et prénoms de la mère"
                            className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Date de naissance</label>
                          <input
                            type="date"
                            value={editFields.dateNaissance || ''}
                            onChange={e => setEditFields({ ...editFields, dateNaissance: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Lieu de naissance</label>
                          <input
                            type="text"
                            value={editFields.lieuNaissance || ''}
                            onChange={e => setEditFields({ ...editFields, lieuNaissance: e.target.value })}
                            placeholder="Ex : Cotonou, Porto-Novo..."
                            className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Classe à l'inscription</label>
                          <input
                            type="text"
                            value={editFields.classeInscription || ''}
                            onChange={e => setEditFields({ ...editFields, classeInscription: e.target.value })}
                            placeholder="Ex : 6ème A"
                            className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Année d'inscription</label>
                          <input
                            type="text"
                            value={editFields.anneeInscription || ''}
                            onChange={e => setEditFields({ ...editFields, anneeInscription: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Classe actuelle</label>
                          <input
                            type="text"
                            value={editFields.classe || ''}
                            onChange={e => setEditFields({ ...editFields, classe: e.target.value })}
                            placeholder="Ex : 6ème A"
                            className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Année Scolaire</label>
                          <input
                            type="text"
                            value={editFields.anneeScolaire || ''}
                            onChange={e => setEditFields({ ...editFields, anneeScolaire: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mention Spéciale</label>
                        <textarea
                          rows={2}
                          value={editFields.mentionSpeciale || ''}
                          onChange={e => setEditFields({ ...editFields, mentionSpeciale: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                          placeholder="Félicitations, Encouragements, etc."
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-3 pt-2 border-t border-indigo-100/50 mt-2">
                        <label className="block text-[11px] font-bold text-indigo-600 uppercase tracking-wider">APPRÉCIATIONS</label>
                        <div className="grid grid-cols-1 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1">ASSIDUITÉ</label>
                            <input
                              type="text"
                              value={editFields.assiduite || ''}
                              onChange={e => setEditFields({ ...editFields, assiduite: e.target.value })}
                              placeholder="Ex: Régulière, Ponctuelle..."
                              className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1">DISCIPLINE</label>
                            <input
                              type="text"
                              value={editFields.discipline || ''}
                              onChange={e => setEditFields({ ...editFields, discipline: e.target.value })}
                              placeholder="Ex: Exemplaire, Très bonne..."
                              className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1">TRAVAIL</label>
                            <input
                              type="text"
                              value={editFields.travail || ''}
                              onChange={e => setEditFields({ ...editFields, travail: e.target.value })}
                              placeholder="Ex: Très satisfaisant, En progrès..."
                              className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fiche de mission Fields */}
                  {selectedReq.document_type === 'fiche_mission' && (
                    <>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Objet de la mission</label>
                        <input
                          type="text"
                          value={editFields.objet}
                          onChange={e => setEditFields({ ...editFields, objet: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Lieu de destination</label>
                          <input
                            type="text"
                            value={editFields.lieu}
                            onChange={e => setEditFields({ ...editFields, lieu: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Moyen de transport</label>
                          <input
                            type="text"
                            value={editFields.moyenTransport}
                            onChange={e => setEditFields({ ...editFields, moyenTransport: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Date début</label>
                          <input
                            type="date"
                            value={editFields.startDate}
                            onChange={e => setEditFields({ ...editFields, startDate: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Date fin</label>
                          <input
                            type="date"
                            value={editFields.endDate}
                            onChange={e => setEditFields({ ...editFields, endDate: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Signataire */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-indigo-100">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Titre du signataire officiel</label>
                      <input
                        type="text"
                        value={editFields.signataireTitre || ''}
                        onChange={e => setEditFields({ ...editFields, signataireTitre: e.target.value })}
                        placeholder="Le Chef d'Établissement"
                        className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nom du Directeur / Signataire</label>
                      <input
                        type="text"
                        value={editFields.signataireNom || ''}
                        onChange={e => setEditFields({ ...editFields, signataireNom: e.target.value })}
                        placeholder="Ex : Dr. Paul KOFFI"
                        className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Lieu de signature (Fait à)</label>
                      <input
                        type="text"
                        value={editFields.lieuSignature || ''}
                        onChange={e => setEditFields({ ...editFields, lieuSignature: e.target.value })}
                        placeholder="Ex : Cotonou"
                        className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProcessModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all"
                >
                  Enregistrer et Émettre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ÉMISSION DIRECTE PAR L'ADMIN ================= */}
      {showDirectIssueModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl my-8 p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Award size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Émettre un document officiel</h2>
                  <p className="text-xs text-slate-500">Création et émission directe sans demande préalable</p>
                </div>
              </div>
              <button onClick={() => setShowDirectIssueModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleDirectIssueSubmit} className="space-y-4 mt-4 overflow-y-auto flex-1 pr-1 text-left">
              {/* Blank Document Option */}
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                    <FileText size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-950">Générer un Document Vierge</p>
                    <p className="text-[11px] text-amber-700">En-tête et signature officiels, avec des pointillés pour remplissage manuscrit ultérieur</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                  <input
                    type="checkbox"
                    checked={Boolean(editFields.isVierge)}
                    onChange={e => {
                      const checked = e.target.checked;
                      setEditFields({
                        ...editFields,
                        isVierge: checked,
                        nom: checked ? '' : editFields.nom,
                        prenom: checked ? '' : editFields.prenom
                      });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-800 uppercase mb-1">En-tête personnalisé (Optionnel)</label>
                  <textarea
                    value={editFields.headerLines}
                    onChange={e => setEditFields({ ...editFields, headerLines: e.target.value })}
                    rows={2}
                    placeholder="Ex: RÉPUBLIQUE DU BÉNIN\nMINISTÈRE DE L'ÉDUCATION..."
                    className="w-full rounded-xl border border-emerald-200 p-2 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                  <p className="text-[10px] text-emerald-600 mt-1 italic">L'en-tête sera centré ligne par ligne.</p>
                </div>

                {/* Beneficiary Selector for Direct Issue */}
                {!editFields.isVierge && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-emerald-100 mt-2">
                    {editFields.document_type === 'certificat_scolarite' ? (
                      <>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">1. Choisir la Classe</label>
                          <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="">Sélectionner une classe...</option>
                            {classes?.map(c => (
                              <option key={c.id} value={c.id}>{c.nom}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                            2. Choisir l'Élève {loadingClassStudents ? '(Chargement...)' : `(${currentClassStudents.length})`}
                          </label>
                          <select
                            disabled={!selectedClassId || loadingClassStudents}
                            onChange={(e) => {
                              const id = Number(e.target.value);
                              const st = currentClassStudents.find(x => x.id === id);
                              if (st) {
                                const clsName = formatClasseDisplay(st.classe_nom || classes?.find(c => String(c.id) === selectedClassId)?.nom || '');
                                setEditFields({
                                  ...editFields,
                                  isVierge: false,
                                  nom: st.nom,
                                  prenom: st.prenom,
                                  matricule: st.matricule || '',
                                  classe: clsName,
                                  classeInscription: clsName,
                                  dateNaissance: st.date_naissance || '',
                                  lieuNaissance: st.lieu_naissance || '',
                                  nomPere: st.nom_parent || editFields.nomPere || '',
                                  nomMere: editFields.nomMere || ''
                                });
                              }
                            }}
                            className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="">
                              {loadingClassStudents 
                                ? '-- Chargement des élèves en cours... --' 
                                : currentClassStudents.length === 0 
                                  ? (!selectedClassId ? '-- Sélectionnez d\'abord une classe --' : '-- Aucun élève inscrit dans cette classe --')
                                  : `-- Sélectionner l'élève (${currentClassStudents.length} élèves trouvés) --`}
                            </option>
                            {currentClassStudents.map(st => (
                              <option key={st.id} value={st.id}>
                                {st.nom} {st.prenom} {st.matricule ? `• Matr: ${st.matricule}` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    ) : (
                      <div className="col-span-2">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Charger un profil existant</label>
                        <select
                          onChange={(e) => {
                            if (!e.target.value) return;
                            const [type, id] = e.target.value.split(':');
                            if (type === 'teacher') {
                              const t = beneficiaries?.teachers?.find(x => String(x.id) === id);
                              if (t) {
                                setEditFields({
                                  ...editFields,
                                  nom: t.nom,
                                  prenom: t.prenom,
                                  matricule: t.matricule || '',
                                  poste: t.role === 'enseignant' ? 'Enseignant' : t.poste || 'Enseignant',
                                  startDate: t.date_embauche || editFields.startDate
                                });
                              }
                            } else if (type === 'staff') {
                              const s = beneficiaries?.staff?.find(x => String(x.id) === id);
                              if (s) {
                                setEditFields({
                                  ...editFields,
                                  nom: s.nom,
                                  prenom: s.prenom,
                                  matricule: s.matricule || '',
                                  poste: s.poste || 'Personnel Administratif',
                                  startDate: s.date_embauche || editFields.startDate
                                });
                              }
                            }
                          }}
                          className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="">-- Rechercher un personnel / enseignant --</option>
                          <optgroup label="Enseignants">
                            {beneficiaries?.teachers?.map(t => (
                              <option key={`t-${t.id}`} value={`teacher:${t.id}`}>{t.nom} {t.prenom} {t.matricule ? `(${t.matricule})` : ''}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Personnel Administratif">
                            {beneficiaries?.staff?.map(s => (
                              <option key={`s-${s.id}`} value={`staff:${s.id}`}>{s.nom} {s.prenom} {s.matricule ? `(${s.matricule})` : ''}</option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Type de document
                  </label>
                  <select
                    value={editFields.document_type || 'certificat_travail'}
                    onChange={e => setEditFields({ ...editFields, document_type: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {DOCUMENT_TYPES.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* BENEFICIARY DETAILS */}
              {!editFields.isVierge && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nom</label>
                    <input
                      type="text"
                      value={editFields.nom || ''}
                      onChange={e => setEditFields({ ...editFields, nom: e.target.value })}
                      placeholder="Nom officiel"
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                      required={!editFields.isVierge}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Prénom</label>
                    <input
                      type="text"
                      value={editFields.prenom || ''}
                      onChange={e => setEditFields({ ...editFields, prenom: e.target.value })}
                      placeholder="Prénom"
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                      required={!editFields.isVierge}
                    />
                  </div>
                </div>
              )}

              {/* SPECIFIC FIELDS ACCORDING TO DOC TYPE */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                {editFields.document_type === 'certificat_scolarite' ? (
                  <div className="grid grid-cols-1 gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nom du Père</label>
                        <input
                          type="text"
                          value={editFields.nomPere || ''}
                          onChange={e => setEditFields({ ...editFields, nomPere: e.target.value })}
                          placeholder="Nom et prénoms du père"
                          className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nom de la Mère</label>
                        <input
                          type="text"
                          value={editFields.nomMere || ''}
                          onChange={e => setEditFields({ ...editFields, nomMere: e.target.value })}
                          placeholder="Nom et prénoms de la mère"
                          className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Classe à l'inscription</label>
                        <input
                          type="text"
                          value={editFields.classeInscription || ''}
                          onChange={e => setEditFields({ ...editFields, classeInscription: e.target.value })}
                          placeholder="Ex: 6ème A"
                          className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Année d'inscription</label>
                        <input
                          type="text"
                          value={editFields.anneeInscription || ''}
                          onChange={e => setEditFields({ ...editFields, anneeInscription: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Classe Actuelle</label>
                        <input
                          type="text"
                          value={editFields.classe || ''}
                          onChange={e => setEditFields({ ...editFields, classe: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Matricule</label>
                        <input
                          type="text"
                          value={editFields.matricule || ''}
                          onChange={e => setEditFields({ ...editFields, matricule: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Date Naissance</label>
                        <input
                          type="date"
                          value={editFields.dateNaissance || ''}
                          onChange={e => setEditFields({ ...editFields, dateNaissance: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Lieu Naissance</label>
                        <input
                          type="text"
                          value={editFields.lieuNaissance || ''}
                          onChange={e => setEditFields({ ...editFields, lieuNaissance: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mention Spéciale</label>
                      <textarea
                        rows={2}
                        value={editFields.mentionSpeciale || ''}
                        onChange={e => setEditFields({ ...editFields, mentionSpeciale: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Fonction / Classe</label>
                        <input
                          type="text"
                          value={editFields.poste || editFields.classe || ''}
                          onChange={e => setEditFields({ ...editFields, poste: e.target.value, classe: e.target.value })}
                          placeholder="Ex : Enseignant, 6ème A..."
                          className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Matricule</label>
                        <input
                          type="text"
                          value={editFields.matricule || ''}
                          onChange={e => setEditFields({ ...editFields, matricule: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Date début / Prise de fonction</label>
                        <input
                          type="date"
                          value={editFields.startDate || ''}
                          onChange={e => setEditFields({ ...editFields, startDate: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Date fin</label>
                        <input
                          type="date"
                          value={editFields.endDate || ''}
                          onChange={e => setEditFields({ ...editFields, endDate: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                        />
                      </div>
                    </div>
                  </>
                )}

                {editFields.document_type === 'contrat_travail' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Rémunération</label>
                      <input
                        type="text"
                        value={editFields.salaire}
                        onChange={e => setEditFields({ ...editFields, salaire: e.target.value })}
                        placeholder="Ex : 250 000 FCFA"
                        className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Type de Contrat</label>
                      <select
                        value={editFields.typeContrat}
                        onChange={e => setEditFields({ ...editFields, typeContrat: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                      >
                        <option value="CDD">CDD</option>
                        <option value="CDI">CDI</option>
                        <option value="Vacataire">Vacataire</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Signatory Customization */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-200">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Titre du signataire</label>
                    <input
                      type="text"
                      value={editFields.signataireTitre || ''}
                      onChange={e => setEditFields({ ...editFields, signataireTitre: e.target.value })}
                      placeholder="Le Chef d'Établissement"
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nom du signataire</label>
                    <input
                      type="text"
                      value={editFields.signataireNom || ''}
                      onChange={e => setEditFields({ ...editFields, signataireNom: e.target.value })}
                      placeholder="Ex : Dr. Paul KOFFI"
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Lieu de signature (Fait à)</label>
                    <input
                      type="text"
                      value={editFields.lieuSignature || ''}
                      onChange={e => setEditFields({ ...editFields, lieuSignature: e.target.value })}
                      placeholder="Ex : Cotonou"
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const tempDocData = buildDocumentData({ 
                        id: 0, school_id: 0, requester_id: 0, nom: '', prenom: '', role: '', email: '', 
                        document_type: editFields.document_type || 'certificat_travail', 
                        motif: '', status: '', request_date: '', processed_date: '', document_data: '' 
                      } as any, editFields);
                      setActiveDocData(tempDocData);
                      const doc = await generateDocumentPdf(tempDocData);
                      const fileName = `Apercu_Direct_${tempDocData.type}.pdf`;
                      
                      if (pdfPreviewUrl && pdfPreviewUrl.startsWith('blob:')) {
                        URL.revokeObjectURL(pdfPreviewUrl);
                      }
                      const blob = doc.output('blob');
                      const url = URL.createObjectURL(blob);
                      setPdfPreviewUrl(url);
                      setPdfFileName(fileName);
                    } catch (e) {
                      console.error("Direct preview error:", e);
                      toast.error("Erreur lors de la génération de l'aperçu");
                    }
                  }}
                  className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                >
                  <Eye size={16} /> Aperçu PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowDirectIssueModal(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all"
                >
                  Émettre et Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: APERÇU ET IMPRESSION DU PDF ================= */}
      {pdfPreviewUrl && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Top Bar */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Visualisation du Document Officiel</h3>
                  <p className="text-xs text-slate-500">{pdfFileName}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => {
                    if (activeDocData) {
                      downloadDocumentPdfDirectly(activeDocData, pdfFileName);
                      toast.success("Téléchargement réussi !");
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all active:scale-95"
                >
                  <Download size={15} /> Télécharger PDF
                </button>

                <button
                  onClick={closePdfPreview}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="bg-amber-50 px-4 py-2 text-xs text-amber-800 border-b border-amber-200 flex items-center justify-between">
              <span>
                💡 Si votre navigateur bloque la prévisualisation dans la fenêtre ci-dessous, utilisez le bouton <strong>"Télécharger PDF"</strong> en haut à droite.
              </span>
            </div>

              {/* PDF Viewer */}
            <div className="flex-1 bg-slate-200 p-4 md:p-6 overflow-hidden flex items-center justify-center relative">
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                <FileText size={48} className="text-slate-400 mb-4" />
                <p className="text-slate-600 font-semibold text-sm">Génération de l'aperçu...</p>
                <p className="text-slate-500 text-[10px] mt-1">Si l'aperçu ne s'affiche pas, votre navigateur peut être configuré pour bloquer les prévisualisations PDF directes. Utilisez le bouton Télécharger en haut.</p>
              </div>
              {pdfPreviewUrl && (
                <iframe
                  key={pdfPreviewUrl}
                  src={pdfPreviewUrl}
                  className="w-full h-full rounded-2xl shadow-xl bg-white border border-slate-300 relative z-10"
                  title="Aperçu du PDF"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentRequests;
