import React from 'react';
import { 
  X, Upload, Image as ImageIcon, CheckCircle, AlertCircle, 
  Trash2, RefreshCw, UserCheck, Search, Users, ArrowRight, Check, Eye
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiFetch } from '../utils/api';

export interface ImportEntity {
  id: number;
  nom: string;
  prenom: string;
  matricule?: string;
  photo?: string;
  subtitle?: string; // e.g. "Classe : 6ème A", "Matière : Mathématiques", "Poste : Secrétaire"
}

export interface MatchedPhotoItem {
  id: string; // internal unique key
  file: File;
  previewUrl: string;
  compressedBase64?: string;
  matchedEntity: ImportEntity | null;
  matchType: 'exact' | 'matricule' | 'name' | 'selected' | 'manual' | 'none';
  matchConfidenceText: string;
}

interface BatchPhotoImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'eleves' | 'enseignants' | 'personnel';
  title: string;
  description?: string;
  entities: ImportEntity[];
  selectedEntityIds?: number[];
  initialFiles?: FileList | File[] | null;
  onSuccess: () => void;
}

// Helper to normalize strings for robust comparison (strips accents, lowercases, removes punctuation)
function normalizeText(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function cleanBaseFileName(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^/.]+$/, '');
  return withoutExt;
}

// Compress and convert image to standard sized base64 JPEG
async function compressImageFile(file: File, maxWidth = 600, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Erreur de décodage image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Erreur de lecture de fichier'));
    reader.readAsDataURL(file);
  });
}

export default function BatchPhotoImportModal({
  isOpen,
  onClose,
  targetType,
  title,
  entities,
  selectedEntityIds = [],
  initialFiles,
  onSuccess
}: BatchPhotoImportModalProps) {
  const [photoItems, setPhotoItems] = React.useState<MatchedPhotoItem[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveProgress, setSaveProgress] = React.useState(0);
  const [activeFilter, setActiveFilter] = React.useState<'all' | 'matched' | 'unmatched'>('all');
  const [previewZoomUrl, setPreviewZoomUrl] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Entities prioritized by selection if any
  const prioritizedEntities = React.useMemo(() => {
    if (selectedEntityIds && selectedEntityIds.length > 0) {
      const selectedSet = new Set(selectedEntityIds);
      const selected = entities.filter(e => selectedSet.has(e.id));
      const others = entities.filter(e => !selectedSet.has(e.id));
      return [...selected, ...others];
    }
    return entities;
  }, [entities, selectedEntityIds]);

  // Match a single file to best candidate entity
  const matchFileToEntity = React.useCallback((
    fileName: string, 
    candidates: ImportEntity[], 
    totalFilesCount = 1
  ): { entity: ImportEntity | null; matchType: MatchedPhotoItem['matchType']; confidence: string } => {
    const rawBase = cleanBaseFileName(fileName);
    const normFile = normalizeText(rawBase);

    // If single entity selected and single file dropped
    if (selectedEntityIds && selectedEntityIds.length === 1 && totalFilesCount === 1) {
      const target = candidates.find(c => c.id === selectedEntityIds[0]);
      if (target) {
        return {
          entity: target,
          matchType: 'selected',
          confidence: 'Personne sélectionnée'
        };
      }
    }

    // Try candidates (selected ones are first in array)
    for (const ent of candidates) {
      const normNom = normalizeText(ent.nom || '');
      const normPrenom = normalizeText(ent.prenom || '');
      const normMatricule = normalizeText(ent.matricule || '');

      // 1. Check exact nom_prenom_matricule pattern
      if (normNom && normPrenom && normMatricule && normMatricule.length >= 2) {
        const fullCombo = `${normNom}${normPrenom}${normMatricule}`;
        const altCombo = `${normPrenom}${normNom}${normMatricule}`;
        if (normFile.includes(fullCombo) || normFile.includes(altCombo) || 
           (normFile.includes(normNom) && normFile.includes(normPrenom) && normFile.includes(normMatricule))) {
          return {
            entity: ent,
            matchType: 'exact',
            confidence: 'Correspondance exacte (Nom + Prénoms + Matricule)'
          };
        }
      }

      // 2. Check matricule match (if matricule is distinctive >= 3 chars or exactly in string)
      if (normMatricule && normMatricule.length >= 3 && normFile.includes(normMatricule)) {
        return {
          entity: ent,
          matchType: 'matricule',
          confidence: `Correspondance par matricule (${ent.matricule})`
        };
      }

      // 3. Check nom + prenom match
      if (normNom && normPrenom && normNom.length >= 2 && normPrenom.length >= 2) {
        if ((normFile.includes(normNom) && normFile.includes(normPrenom)) || 
            normFile.includes(`${normNom}${normPrenom}`) || 
            normFile.includes(`${normPrenom}${normNom}`)) {
          return {
            entity: ent,
            matchType: 'name',
            confidence: 'Correspondance par Nom et Prénom'
          };
        }
      }
    }

    return {
      entity: null,
      matchType: 'none',
      confidence: 'Aucune correspondance automatique'
    };
  }, [selectedEntityIds]);

  // Process incoming files
  const handleFiles = React.useCallback(async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsProcessingFiles(true);

    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileArray.length === 0) {
      toast.error("Veuillez sélectionner des fichiers images valides (JPG, PNG, WEBP).");
      setIsProcessingFiles(false);
      return;
    }

    try {
      const newItems: MatchedPhotoItem[] = [];
      const alreadyAssignedIds = new Set<number>();

      // Keep previously matched entity IDs to avoid double assignment if possible
      photoItems.forEach(item => {
        if (item.matchedEntity) alreadyAssignedIds.add(item.matchedEntity.id);
      });

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const previewUrl = URL.createObjectURL(file);
        
        // Find best match among unassigned or all
        const availableCandidates = prioritizedEntities.filter(e => !alreadyAssignedIds.has(e.id));
        let matchResult = matchFileToEntity(file.name, availableCandidates, fileArray.length);

        // Fallback to all entities if no unassigned match found
        if (!matchResult.entity) {
          matchResult = matchFileToEntity(file.name, prioritizedEntities, fileArray.length);
        }

        if (matchResult.entity) {
          alreadyAssignedIds.add(matchResult.entity.id);
        }

        newItems.push({
          id: `photo_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`,
          file,
          previewUrl,
          matchedEntity: matchResult.entity,
          matchType: matchResult.matchType,
          matchConfidenceText: matchResult.confidence
        });
      }

      setPhotoItems(prev => [...prev, ...newItems]);
      toast.success(`${newItems.length} photo(s) chargée(s) avec succès`);
    } catch (err) {
      console.error("Error processing photos:", err);
      toast.error("Erreur lors du traitement des images");
    } finally {
      setIsProcessingFiles(false);
    }
  }, [prioritizedEntities, matchFileToEntity, photoItems]);

  // Initial files trigger
  React.useEffect(() => {
    if (isOpen && initialFiles) {
      handleFiles(initialFiles);
    }
  }, [isOpen, initialFiles, handleFiles]);

  // Reset state when closed
  const handleClose = () => {
    photoItems.forEach(item => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setPhotoItems([]);
    setSaveProgress(0);
    setIsSaving(false);
    onClose();
  };

  const handleEntityChange = (photoItemId: string, newEntityId: string) => {
    const selectedEnt = entities.find(e => String(e.id) === newEntityId) || null;
    setPhotoItems(prev => prev.map(item => {
      if (item.id === photoItemId) {
        return {
          ...item,
          matchedEntity: selectedEnt,
          matchType: selectedEnt ? 'manual' : 'none',
          matchConfidenceText: selectedEnt ? 'Association manuelle' : 'Aucune correspondance'
        };
      }
      return item;
    }));
  };

  const handleRemovePhoto = (photoItemId: string) => {
    setPhotoItems(prev => {
      const item = prev.find(p => p.id === photoItemId);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(p => p.id !== photoItemId);
    });
  };

  const handleSaveAll = async () => {
    const validItems = photoItems.filter(item => item.matchedEntity !== null);
    if (validItems.length === 0) {
      toast.error("Aucune photo associée à une personne. Veuillez associer au moins une photo.");
      return;
    }

    setIsSaving(true);
    setSaveProgress(10);

    try {
      // Compress each image to lightweight high-quality format
      const updates: Array<{ id: number; photo: string }> = [];
      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];
        const compressed = await compressImageFile(item.file, 600, 0.85);
        updates.push({
          id: item.matchedEntity!.id,
          photo: compressed
        });
        setSaveProgress(10 + Math.round(((i + 1) / validItems.length) * 60));
      }

      // Send to server
      const res = await apiFetch('/api/photos/batch-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: targetType,
          updates
        })
      });

      const data = await res.json();
      if (data.success) {
        setSaveProgress(100);
        toast.success(`Succès ! ${data.count || updates.length} photo(s) ont été enregistrées avec succès.`);
        onSuccess();
        handleClose();
      } else {
        toast.error(data.error || "Erreur lors de l'enregistrement des photos.");
      }
    } catch (err: any) {
      console.error("Save photos error:", err);
      toast.error("Erreur de connexion lors de la sauvegarde.");
    } finally {
      setIsSaving(false);
    }
  };

  const matchedCount = photoItems.filter(p => p.matchedEntity !== null).length;
  const unmatchedCount = photoItems.filter(p => p.matchedEntity === null).length;

  const filteredItems = photoItems.filter(item => {
    if (activeFilter === 'matched') return item.matchedEntity !== null;
    if (activeFilter === 'unmatched') return item.matchedEntity === null;
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
              <ImageIcon size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{title}</h2>
              <p className="text-xs text-slate-500">
                Format attendu : <span className="font-mono bg-slate-200 px-1.5 py-0.5 rounded text-slate-800 font-bold">nom_prenoms_matricule.jpg</span>
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            disabled={isSaving}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action bar / Upload Trigger */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <input 
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/jpg"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingFiles || isSaving}
              className="px-3.5 py-2 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-primary-200"
            >
              <Upload size={16} />
              Ajouter d'autres photos
            </button>

            {photoItems.length > 0 && (
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-medium text-slate-600">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${activeFilter === 'all' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'hover:text-slate-900'}`}
                >
                  Toutes ({photoItems.length})
                </button>
                <button
                  onClick={() => setActiveFilter('matched')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${activeFilter === 'matched' ? 'bg-white text-emerald-700 font-bold shadow-2xs' : 'hover:text-slate-900'}`}
                >
                  <CheckCircle size={13} className="text-emerald-600" />
                  Associées ({matchedCount})
                </button>
                {unmatchedCount > 0 && (
                  <button
                    onClick={() => setActiveFilter('unmatched')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${activeFilter === 'unmatched' ? 'bg-white text-amber-700 font-bold shadow-2xs' : 'hover:text-slate-900'}`}
                  >
                    <AlertCircle size={13} className="text-amber-600" />
                    À vérifier ({unmatchedCount})
                  </button>
                )}
              </div>
            )}
          </div>

          {selectedEntityIds && selectedEntityIds.length > 0 && (
            <div className="text-xs text-primary-800 bg-primary-50 border border-primary-100 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5">
              <Users size={14} />
              <span>{selectedEntityIds.length} personne(s) sélectionnée(s) au préalable</span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {photoItems.length === 0 ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-primary-400 bg-slate-50/60 hover:bg-primary-50/30 rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[260px]"
            >
              <div className="w-16 h-16 rounded-3xl bg-primary-100 text-primary-600 flex items-center justify-center mb-4 shadow-sm">
                <Upload size={32} />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">
                Glissez-déposez ou cliquez pour sélectionner vos photos
              </h3>
              <p className="text-xs text-slate-500 max-w-md mb-4 leading-relaxed">
                Vous pouvez importer une seule photo ou plusieurs photos d'un coup. Le système vérifiera automatiquement les correspondances avec le matricule et le nom de chaque personne.
              </p>
              <span className="px-4 py-2 bg-primary-600 text-white text-xs font-bold rounded-xl hover:bg-primary-700 shadow-sm transition-all">
                Parcourir les photos...
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item, index) => {
                const isMatched = item.matchedEntity !== null;

                return (
                  <div 
                    key={item.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                      isMatched 
                        ? 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs' 
                        : 'bg-amber-50/40 border-amber-200'
                    }`}
                  >
                    {/* Left: Photo preview & file info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative group/zoom shrink-0">
                        <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shadow-2xs flex items-center justify-center">
                          <img 
                            src={item.previewUrl} 
                            alt={item.file.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setPreviewZoomUrl(item.previewUrl)}
                          className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover/zoom:opacity-100 flex items-center justify-center rounded-xl transition-opacity"
                          title="Agrandir la photo"
                        >
                          <Eye size={16} />
                        </button>
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate max-w-[200px]" title={item.file.name}>
                          {item.file.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {(item.file.size / 1024).toFixed(1)} KB
                        </p>
                        <div className="mt-1">
                          {item.matchType === 'exact' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              <Check size={11} /> Nom + Matricule
                            </span>
                          )}
                          {item.matchType === 'matricule' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                              <Check size={11} /> Par matricule
                            </span>
                          )}
                          {item.matchType === 'name' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                              <Check size={11} /> Par nom
                            </span>
                          )}
                          {item.matchType === 'selected' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                              <UserCheck size={11} /> Sélection directe
                            </span>
                          )}
                          {item.matchType === 'manual' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                              Association manuelle
                            </span>
                          )}
                          {item.matchType === 'none' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                              <AlertCircle size={11} /> À associer manuellement
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Arrow indicator */}
                    <div className="hidden md:flex items-center text-slate-300">
                      <ArrowRight size={18} />
                    </div>

                    {/* Right: Target Person Selector / Details */}
                    <div className="flex-1 min-w-[260px] w-full md:w-auto">
                      <div className="flex items-center gap-2">
                        <select
                          value={item.matchedEntity ? String(item.matchedEntity.id) : ''}
                          onChange={(e) => handleEntityChange(item.id, e.target.value)}
                          className={`w-full text-xs rounded-xl px-3 py-2 border font-medium outline-none transition-all ${
                            isMatched
                              ? 'bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-primary-500'
                              : 'bg-white border-amber-300 text-amber-900 focus:ring-2 focus:ring-amber-500'
                          }`}
                        >
                          <option value="">-- Choisir la personne correspondante --</option>
                          {prioritizedEntities.map(ent => (
                            <option key={ent.id} value={ent.id}>
                              {ent.nom} {ent.prenom} {ent.matricule ? `[${ent.matricule}]` : ''} {ent.subtitle ? `(${ent.subtitle})` : ''}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(item.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                          title="Retirer cette photo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {item.matchedEntity && (
                        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-600 px-1">
                          <span className="font-bold text-slate-800">
                            {item.matchedEntity.nom} {item.matchedEntity.prenom}
                          </span>
                          {item.matchedEntity.matricule && (
                            <span className="font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                              {item.matchedEntity.matricule}
                            </span>
                          )}
                          {item.matchedEntity.subtitle && (
                            <span className="text-slate-400 font-medium">
                              • {item.matchedEntity.subtitle}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 text-center sm:text-left">
            {photoItems.length > 0 ? (
              <span>
                <strong className="text-slate-900">{matchedCount}</strong> sur <strong className="text-slate-900">{photoItems.length}</strong> photo(s) prêtes à être appliquées.
              </span>
            ) : (
              <span>Aucune photo sélectionnée pour le moment.</span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving || matchedCount === 0}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-primary-200 flex items-center justify-center gap-2 transition-all"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Enregistrement ({saveProgress}%)...
                </>
              ) : (
                <>
                  <CheckCircle size={15} />
                  Enregistrer les photos ({matchedCount})
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Full Photo Zoom Modal */}
      {previewZoomUrl && (
        <div 
          className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewZoomUrl(null)}
        >
          <div className="relative max-w-xl max-h-[85vh] p-2 bg-white rounded-3xl shadow-2xl overflow-hidden">
            <img src={previewZoomUrl} alt="Aperçu zoom" className="w-full h-full object-contain max-h-[75vh] rounded-2xl" />
            <button 
              onClick={() => setPreviewZoomUrl(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full hover:bg-black"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
