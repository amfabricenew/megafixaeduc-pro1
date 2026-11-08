import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  DollarSign, 
  Users, 
  TrendingDown, 
  Search, 
  ChevronRight, 
  Phone, 
  Download, 
  Filter, 
  ArrowUpRight,
  CreditCard,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import toast from 'react-hot-toast';

interface ArrieresStatsProps {
  cycle?: 'all' | 'primaire' | 'secondaire';
  onEncaisserArriere?: (eleve: any) => void;
}

export default function ArrieresAnterieursStats({
  cycle = 'all',
  onEncaisserArriere
}: ArrieresStatsProps) {
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<any>({
    total_arrieres: 0,
    nb_eleves_avec_arrieres: 0,
    total_eleves: 0,
    taux_eleves_endettes: 0,
    repartition_par_classe: [],
    eleves_avec_arrieres: []
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClasseFilter, setSelectedClasseFilter] = useState('all');

  const fetchStats = async () => {
    setLoading(true);
    try {
      const cycleQuery = cycle !== 'all' ? `?cycle=${cycle}` : '';
      const res = await apiFetch(`/api/stats/arrieres-anterieurs${cycleQuery}`);
      const data = await res.json();
      if (data.success) {
        setStatsData(data);
      }
    } catch (err) {
      console.error("Erreur récupération statistiques arriérés:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [cycle]);

  const filteredEleves = (statsData.eleves_avec_arrieres || []).filter((el: any) => {
    const matchesSearch = 
      `${el.nom} ${el.prenom}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (el.matricule || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (el.classe_nom || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClass = selectedClasseFilter === 'all' || el.classe_id?.toString() === selectedClasseFilter;

    return matchesSearch && matchesClass;
  });

  const exportToCSV = () => {
    if (!statsData.eleves_avec_arrieres?.length) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    const headers = ["Matricule", "Nom", "Prénom", "Classe Actuelle", "Classe Antérieure", "Année Antérieure", "Arriérés (FCFA)", "Téléphone Parent"];
    const rows = filteredEleves.map((e: any) => [
      `"${e.matricule || ''}"`,
      `"${e.nom || ''}"`,
      `"${e.prenom || ''}"`,
      `"${e.classe_nom || ''}"`,
      `"${e.classe_precedente_nom || ''}"`,
      `"${e.annee_precedente_libelle || ''}"`,
      e.arrieres_scolarite || 0,
      `"${e.tel_parent || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Arrieres_Annees_Anterieures_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Fichier CSV exporté avec succès !");
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header section */}
      <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/5 via-rose-500/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-inner shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Statistiques des Arriérés d'Années Antérieures
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Report de dettes
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Suivi consolidé des restes de scolarité non soldés reportés lors des passages de classe
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            title="Rafraîchir les statistiques"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={exportToCSV}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
          >
            <Download size={15} />
            Exporter CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="p-5 sm:p-6 grid grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50/50 border-b border-slate-100">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
            Total Arriérés Déclarés
          </span>
          <p className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
            {Number(statsData.total_arrieres || 0).toLocaleString('fr-FR')} <span className="text-xs font-bold text-slate-400">FCFA</span>
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Créances antérieures à recouvrer</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
            Élèves Débiteurs
          </span>
          <p className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
            {statsData.nb_eleves_avec_arrieres || 0} <span className="text-xs font-bold text-slate-400">élève(s)</span>
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Sur {statsData.total_eleves || 0} élèves inscrits
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
            Taux d'Élèves Concernés
          </span>
          <p className="text-xl sm:text-2xl font-black text-indigo-600 mt-1">
            {statsData.taux_eleves_endettes || 0}%
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">De l'effectif total</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
            Arriéré Moyen / Élève
          </span>
          <p className="text-xl sm:text-2xl font-black text-slate-800 mt-1">
            {statsData.nb_eleves_avec_arrieres > 0 
              ? Math.round(statsData.total_arrieres / statsData.nb_eleves_avec_arrieres).toLocaleString('fr-FR')
              : 0} <span className="text-xs font-bold text-slate-400">FCFA</span>
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Par élève endetté</span>
        </div>
      </div>

      {/* Class distribution progress bars */}
      {statsData.repartition_par_classe?.length > 0 && (
        <div className="p-5 sm:p-6 border-b border-slate-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Répartition des Arriérés par Classe Actuelle
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {statsData.repartition_par_classe.map((c: any) => {
              const maxArriere = Math.max(...statsData.repartition_par_classe.map((x: any) => x.total_arrieres), 1);
              const percentage = Math.round((c.total_arrieres / maxArriere) * 100);
              return (
                <div key={c.classe_nom} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{c.classe_nom}</span>
                    <span className="font-black text-rose-600">{Number(c.total_arrieres).toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{c.nb_eleves} élève(s) avec dette</span>
                    <span>{percentage}% du max</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter and Student table */}
      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute inset-y-0 left-3 my-auto text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par élève, matricule, classe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedClasseFilter}
              onChange={(e) => setSelectedClasseFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="all">Toutes les classes</option>
              {statsData.repartition_par_classe?.map((c: any) => (
                <option key={c.classe_id} value={c.classe_id?.toString() || c.classe_nom}>
                  {c.classe_nom} ({c.nb_eleves})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Student Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Élève</th>
                <th className="py-3 px-3">Classe Actuelle</th>
                <th className="py-3 px-3">Origine Dette (Passage)</th>
                <th className="py-3 px-3 text-right">Montant Arriéré</th>
                <th className="py-3 px-3">Contact Tuteur</th>
                <th className="py-3 px-4 text-center">Action Recouvrement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredEleves.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                    {loading ? "Chargement des arriérés..." : "Aucun élève trouvé avec des arriérés antérieurs."}
                  </td>
                </tr>
              ) : (
                filteredEleves.map((el: any) => (
                  <tr key={el.eleve_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                          {el.nom?.charAt(0) || 'E'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">
                            {el.nom} {el.prenom}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {el.matricule || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="inline-block px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px]">
                        {el.classe_nom}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="text-[11px]">
                        <span className="font-semibold text-slate-800">
                          {el.classe_precedente_nom || 'Année précédente'}
                        </span>
                        {el.annee_precedente_libelle && (
                          <span className="text-slate-400 block text-[10px]">
                            ({el.annee_precedente_libelle})
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <span className="font-black text-rose-600 text-sm">
                        {Number(el.arrieres_scolarite).toLocaleString('fr-FR')} FCFA
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      {el.tel_parent ? (
                        <a 
                          href={`tel:${el.tel_parent}`}
                          className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-semibold"
                        >
                          <Phone size={13} />
                          {el.tel_parent}
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Non renseigné</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {onEncaisserArriere && (
                        <button
                          type="button"
                          onClick={() => onEncaisserArriere(el)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs inline-flex items-center gap-1.5 transition-colors border border-emerald-200"
                        >
                          <CreditCard size={14} />
                          Encaisser
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
