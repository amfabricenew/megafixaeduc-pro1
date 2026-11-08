import React from 'react';
import { 
  Calendar, CheckCircle2, XCircle, AlertCircle, Clock, Save, 
  RefreshCw, CheckCheck, UserX, UserCheck, Search, Filter, ShieldCheck,
  Award, TrendingUp, Users
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { toast } from 'react-hot-toast';
import StudentAbandonModal from './StudentAbandonModal';

interface StudentDailyTrackingProps {
  classes: any[];
  cycle?: 'all' | 'primaire' | 'secondaire';
}

interface StudentTrackingItem {
  eleve_id: number;
  nom: string;
  prenom: string;
  matricule: string;
  sexe: string;
  photo?: string;
  statut_scolaire?: string;
  statut: 'present' | 'absent' | 'retard';
  justifie: boolean;
  motif: string;
  remarque: string;
}

export default function StudentDailyTracking({ classes, cycle = 'all' }: StudentDailyTrackingProps) {
  const [selectedClasseId, setSelectedClasseId] = React.useState<string>('');
  const [selectedDate, setSelectedDate] = React.useState<string>(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = React.useState<StudentTrackingItem[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [abandonModalStudent, setAbandonModalStudent] = React.useState<any>(null);

  // Filter classes according to cycle safely
  const availableClasses = React.useMemo(() => {
    return (Array.isArray(classes) ? classes : []).filter((c: any) => {
      if (!c) return false;
      const niveau = (c.niveau || '').toLowerCase();
      const nom = (c.nom || '').toLowerCase();
      const isPrimaire = (
        niveau.includes('maternelle') ||
        niveau.includes('primaire') ||
        nom.includes('maternelle') ||
        nom.includes('ci') || nom.includes('cp') ||
        nom.includes('ce1') || nom.includes('ce2') ||
        nom.includes('cm1') || nom.includes('cm2')
      );
      if (cycle === 'primaire') return isPrimaire;
      if (cycle === 'secondaire') return !isPrimaire;
      return true;
    });
  }, [classes, cycle]);

  // Set default class if available
  React.useEffect(() => {
    if (availableClasses.length > 0 && !selectedClasseId) {
      setSelectedClasseId(String(availableClasses[0].id));
    }
  }, [availableClasses, selectedClasseId]);

  // Load tracking records and students for the selected class and date
  const loadTrackingData = React.useCallback(async () => {
    if (!selectedClasseId || !selectedDate) return;
    setIsLoading(true);

    try {
      // 1. Fetch class students
      const detailsRes = await apiFetch(`/api/classes/${selectedClasseId}/details`);
      const detailsData = await detailsRes.json();
      const classStudents = detailsData.eleves || [];

      // 2. Fetch existing daily records for that date
      const suiviRes = await apiFetch(`/api/suivi-eleves?classe_id=${selectedClasseId}&date=${selectedDate}`);
      const existingRecords = await suiviRes.json();
      const recordsMap = new Map();
      if (Array.isArray(existingRecords)) {
        existingRecords.forEach(r => recordsMap.set(r.eleve_id, r));
      }

      // 3. Map students into tracking state
      const mapped: StudentTrackingItem[] = classStudents.map((st: any) => {
        const existing = recordsMap.get(st.id);
        const isAbandoned = st.statut_scolaire === 'Abandon';

        return {
          id: st.id,
          eleve_id: st.id,
          nom: st.nom,
          prenom: st.prenom,
          matricule: st.matricule,
          sexe: st.sexe || 'M',
          photo: st.photo,
          statut_scolaire: st.statut_scolaire || 'Actif',
          statut: isAbandoned ? 'absent' : (existing ? existing.statut : 'present'),
          justifie: existing ? Boolean(existing.justifie) : false,
          motif: existing ? (existing.motif || '') : (isAbandoned ? "Élève ayant abandonné" : ''),
          remarque: existing ? (existing.remarque || '') : ''
        };
      });

      setStudents(mapped);
    } catch (err) {
      console.error("Error loading daily tracking:", err);
      toast.error("Erreur lors du chargement des élèves");
    } finally {
      setIsLoading(false);
    }
  }, [selectedClasseId, selectedDate]);

  React.useEffect(() => {
    loadTrackingData();
  }, [loadTrackingData]);

  // Update a student tracking field
  const updateStudentField = (eleve_id: number, field: keyof StudentTrackingItem, value: any) => {
    setStudents(prev => prev.map(s => {
      if (s.eleve_id === eleve_id) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  // Mark all students as present
  const handleMarkAllPresent = () => {
    setStudents(prev => prev.map(s => {
      if (s.statut_scolaire === 'Abandon') return s; // Keep abandon intact
      return {
        ...s,
        statut: 'present',
        justifie: false,
        motif: ''
      };
    }));
    toast.success("Tous les élèves actifs marqués comme présents");
  };

  // Save all daily records
  const handleSaveTracking = async () => {
    if (!selectedClasseId || !selectedDate) return;
    setIsSaving(true);

    try {
      const recordsToSave = students.map(s => ({
        eleve_id: s.eleve_id,
        statut: s.statut,
        justifie: s.justifie ? 1 : 0,
        motif: s.motif,
        remarque: s.remarque
      }));

      const res = await apiFetch('/api/suivi-eleves/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classe_id: selectedClasseId,
          date_suivi: selectedDate,
          records: recordsToSave
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Suivi journalier enregistré avec succès !");
      } else {
        toast.error(data.error || "Erreur lors de l'enregistrement");
      }
    } catch (err: any) {
      console.error("Save tracking error:", err);
      toast.error("Erreur de connexion au serveur");
    } finally {
      setIsSaving(false);
    }
  };

  // Stats calculation
  const stats = React.useMemo(() => {
    const total = students.length;
    let presentCount = 0;
    let absentJustifieCount = 0;
    let absentInjustifieCount = 0;
    let retardCount = 0;
    let abandonCount = 0;

    students.forEach(s => {
      if (s.statut_scolaire === 'Abandon') {
        abandonCount++;
      } else if (s.statut === 'present') {
        presentCount++;
      } else if (s.statut === 'retard') {
        retardCount++;
      } else if (s.statut === 'absent') {
        if (s.justifie) absentJustifieCount++;
        else absentInjustifieCount++;
      }
    });

    const activeCount = total - abandonCount;
    const rate = activeCount > 0 
      ? Math.round(((presentCount + retardCount) / activeCount) * 100) 
      : 100;

    return {
      total,
      activeCount,
      presentCount,
      absentJustifieCount,
      absentInjustifieCount,
      retardCount,
      abandonCount,
      rate
    };
  }, [students]);

  const filteredStudents = React.useMemo(() => {
    if (!searchTerm.trim()) return students;
    const q = searchTerm.toLowerCase();
    return students.filter(s => 
      s.nom.toLowerCase().includes(q) || 
      s.prenom.toLowerCase().includes(q) || 
      s.matricule.toLowerCase().includes(q)
    );
  }, [students, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Top Header & Selectors */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Class Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Classe
              </label>
              <select
                value={selectedClasseId}
                onChange={(e) => setSelectedClasseId(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary-500 min-w-[200px]"
              >
                {availableClasses.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} ({c.niveau})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar size={13} />
                Date du suivi
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary-500"
              >
              </input>
            </div>

            <button
              onClick={loadTrackingData}
              disabled={isLoading}
              className="mt-5 p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              title="Rafraîchir"
            >
              <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleMarkAllPresent}
              className="px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
            >
              <CheckCheck size={16} />
              Tout Marquer Présent
            </button>
            <button
              type="button"
              onClick={handleSaveTracking}
              disabled={isSaving || students.length === 0}
              className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-primary-200 disabled:opacity-50"
            >
              <Save size={16} />
              {isSaving ? "Enregistrement..." : "Enregistrer le Suivi"}
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Effectif Total</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-bold text-slate-800">{stats.total}</span>
              <span className="text-[10px] text-slate-500 font-medium">({stats.activeCount} actifs)</span>
            </div>
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Présents</span>
            <span className="text-xl font-bold text-emerald-700 mt-0.5 block">{stats.presentCount}</span>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Abs. Justifiées</span>
            <span className="text-xl font-bold text-amber-700 mt-0.5 block">{stats.absentJustifieCount}</span>
          </div>

          <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-xl">
            <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Abs. Non Justifiées</span>
            <span className="text-xl font-bold text-rose-700 mt-0.5 block">{stats.absentInjustifieCount}</span>
          </div>

          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Retards</span>
            <span className="text-xl font-bold text-indigo-700 mt-0.5 block">{stats.retardCount}</span>
          </div>

          <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl">
            <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">Abandons</span>
            <span className="text-xl font-bold text-red-700 mt-0.5 block">{stats.abandonCount}</span>
          </div>
        </div>
      </div>

      {/* Search Filter */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrer les élèves par nom, prénom ou matricule..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
        <div className="text-xs font-bold text-slate-500">
          Taux de présence du jour : <span className="text-primary-700 font-extrabold text-sm">{stats.rate}%</span>
        </div>
      </div>

      {/* Tracking Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="animate-spin text-primary-600" size={24} />
            <p className="text-xs font-medium">Chargement du registre de suivi...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 italic text-xs">
            Aucun élève trouvé pour cette classe ou selon ce filtre.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3.5 w-12 text-center">N°</th>
                  <th className="px-4 py-3.5">Élève</th>
                  <th className="px-4 py-3.5">Statut de Présence</th>
                  <th className="px-4 py-3.5">Justification / Motif</th>
                  <th className="px-4 py-3.5">Remarque</th>
                  <th className="px-4 py-3.5 text-right">Action Abandon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStudents.map((st, idx) => {
                  const isAbandoned = st.statut_scolaire === 'Abandon';

                  return (
                    <tr 
                      key={st.eleve_id} 
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isAbandoned ? 'bg-red-50/40 opacity-75' : ''
                      }`}
                    >
                      {/* Row Index */}
                      <td className="px-4 py-3 text-center font-mono text-slate-400 text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Student Info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                            {st.photo ? (
                              <img src={st.photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <span className="text-[10px] font-bold text-slate-600">{st.nom[0]}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              {st.nom} {st.prenom}
                              {isAbandoned && (
                                <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[9px] font-extrabold uppercase">
                                  Abandon
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-slate-400">
                              {st.matricule} • {st.sexe}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Presence Status Selector */}
                      <td className="px-4 py-3">
                        {isAbandoned ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-100 text-red-700 text-xs font-bold">
                            <UserX size={14} />
                            En Abandon Scolaire
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {/* Présent */}
                            <button
                              type="button"
                              onClick={() => updateStudentField(st.eleve_id, 'statut', 'present')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                st.statut === 'present'
                                  ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/20'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              <CheckCircle2 size={13} />
                              Présent
                            </button>

                            {/* Absent */}
                            <button
                              type="button"
                              onClick={() => updateStudentField(st.eleve_id, 'statut', 'absent')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                st.statut === 'absent'
                                  ? st.justifie
                                    ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/20'
                                    : 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/20'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              <XCircle size={13} />
                              Absent
                            </button>

                            {/* Retard */}
                            <button
                              type="button"
                              onClick={() => updateStudentField(st.eleve_id, 'statut', 'retard')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                st.statut === 'retard'
                                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/20'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              <Clock size={13} />
                              Retard
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Justification / Motif */}
                      <td className="px-4 py-3">
                        {st.statut === 'absent' && !isAbandoned ? (
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1 text-[11px] font-bold text-amber-700 cursor-pointer select-none shrink-0">
                              <input
                                type="checkbox"
                                checked={st.justifie}
                                onChange={(e) => updateStudentField(st.eleve_id, 'justifie', e.target.checked)}
                                className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500"
                              />
                              Justifié
                            </label>
                            <input
                              type="text"
                              placeholder="Motif (ex: Maladie, Voyage)..."
                              value={st.motif}
                              onChange={(e) => updateStudentField(st.eleve_id, 'motif', e.target.value)}
                              className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary-500"
                            />
                          </div>
                        ) : st.statut === 'retard' ? (
                          <input
                            type="text"
                            placeholder="Motif du retard (ex: 15 min)..."
                            value={st.motif}
                            onChange={(e) => updateStudentField(st.eleve_id, 'motif', e.target.value)}
                            className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        ) : isAbandoned ? (
                          <span className="text-[11px] text-red-600 italic">Dossier abandonné</span>
                        ) : (
                          <span className="text-[11px] text-slate-400">R.A.S</span>
                        )}
                      </td>

                      {/* Remarque */}
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          placeholder="Note / Observation..."
                          value={st.remarque}
                          onChange={(e) => updateStudentField(st.eleve_id, 'remarque', e.target.value)}
                          className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </td>

                      {/* Abandon / Repris Button */}
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setAbandonModalStudent(st)}
                          className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors inline-flex items-center gap-1 ${
                            isAbandoned
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          {isAbandoned ? (
                            <>
                              <UserCheck size={13} />
                              Marquer Reprise
                            </>
                          ) : (
                            <>
                              <UserX size={13} />
                              Déclarer Abandon
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Abandon / Reprise Modal */}
      {abandonModalStudent && (
        <StudentAbandonModal
          student={abandonModalStudent}
          isOpen={Boolean(abandonModalStudent)}
          onClose={() => setAbandonModalStudent(null)}
          onSuccess={() => {
            loadTrackingData();
          }}
        />
      )}
    </div>
  );
}
