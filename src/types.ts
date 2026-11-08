export interface User {
  id: number;
  nom: string;
  email: string;
  role: 'admin' | 'direction' | 'censeur' | 'surveillant' | 'secretariat' | 'comptable' | 'enseignant' | 'parent';
  permissions?: string;
  enseignant_id?: number;
  personnel_id?: number;
  eleve_id?: number;
  school_id?: number;
  photo?: string;
  telephone?: string;
}

export interface InternalMessage {
  id: number;
  school_id: number;
  sender_id: number;
  recipient_type: 'user' | 'role' | 'all_teachers' | 'all_parents' | 'class_parents';
  recipient_id?: number | null;
  recipient_role?: string | null;
  classe_id?: number | null;
  subject?: string;
  content: string;
  audio_url?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  parent_message_id?: number | null;
  is_sms_sent?: number;
  sms_status?: string;
  created_at: string;
  sender_name?: string;
  sender_role?: string;
  sender_email?: string;
  recipient_name?: string;
  classe_nom?: string;
  is_read?: number;
}

export interface ConversationParticipant {
  id: number;
  name: string;
  role: string;
  email?: string;
  telephone?: string;
  type: 'user' | 'group' | 'parent';
  unreadCount?: number;
  lastMessage?: string;
  lastMessageDate?: string;
}

export interface SmsLog {
  id: number;
  school_id: number;
  sender_id: number;
  recipient_phone: string;
  recipient_name: string;
  recipient_type: string;
  message: string;
  status: 'sent' | 'delivered' | 'failed' | 'simulated';
  provider: string;
  sms_count: number;
  cost_estimate?: number;
  created_at: string;
  sender_name?: string;
}

export interface SmsConfig {
  id?: number;
  school_id: number;
  provider: 'twilio' | 'orange_sms' | 'mtn_sms' | 'custom_gateway' | 'simulation';
  is_active: number;
  account_sid?: string;
  auth_token?: string;
  sender_number_or_name?: string;
  api_url?: string;
  api_key?: string;
  custom_headers?: string;
  credit_balance?: number;
}

export interface BackupConfig {
  id?: number;
  school_id: number;
  auto_backup_enabled: number;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  backup_time: string;
  retention_count: number;
  include_users: number;
  include_students: number;
  include_grades: number;
  include_financials: number;
  include_documents: number;
  include_audit_logs: number;
  encryption_enabled: number;
  storage_location: 'local' | 'cloud' | 'local_and_cloud';
  cloud_provider: 'firestore_snapshot' | 'cloud_storage' | 's3' | 'webhook';
  cloud_endpoint?: string;
  cloud_api_key?: string;
  notification_email?: string;
  notify_on_success: number;
  notify_on_failure: number;
  last_backup_at?: string;
  last_backup_status?: string;
  last_backup_size?: string;
  updated_at?: string;
}

export interface BackupSnapshot {
  id: number;
  school_id: number;
  filename: string;
  label?: string;
  backup_type: 'manual' | 'automated' | 'users_only' | 'full' | 'pre_upgrade';
  format: 'sql' | 'json' | 'sqlite';
  size_bytes: number;
  entities_count?: string;
  status: 'completed' | 'failed' | 'restoring';
  checksum_sha256?: string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  restored_at?: string;
  notes?: string;
}

export interface Matiere {
  id: number;
  nom: string;
  code?: string;
  sigle?: string;
  categorie?: string;
  coefficient?: number;
  parent_id?: number | null;
  parent_nom?: string;
  school_id?: number;
  description?: string;
  cycle?: 'primaire' | 'secondaire' | 'technique' | 'tous';
  color?: string;
  est_disciplinaire?: boolean;
  heures_hebdo?: number;
  subSubjects?: Matiere[];
}

export interface Batiment {
  id: number;
  nom: string;
  code?: string;
  description?: string;
  nombre_etages: number;
  couleur?: string;
  school_id?: number;
  created_at?: string;
  total_salles?: number;
  total_capacite?: number;
  classes_attribuees?: number;
}

export interface Salle {
  id: number;
  nom: string;
  code?: string;
  batiment_id?: number | null;
  batiment_nom?: string;
  batiment_code?: string;
  batiment_couleur?: string;
  batiment_etages?: number;
  etage?: string;
  capacite: number;
  type_salle: 'cours' | 'laboratoire' | 'informatique' | 'polyvalente' | 'sport' | 'bibliotheque' | 'autre';
  statut: 'disponible' | 'occupee' | 'maintenance' | 'reservee';
  equipements?: string | string[];
  description?: string;
  school_id?: number;
  created_at?: string;
  classe_attribuee_id?: number | null;
  classe_attribuee_nom?: string;
  classe_attribuee_niveau?: string;
  classe_effectif?: number;
  upcoming_events_count?: number;
}

export interface EvenementSalle {
  id: number;
  titre: string;
  type_evenement: 'reunion' | 'examen' | 'conseil_classe' | 'formation' | 'activite' | 'autre';
  salle_id: number;
  salle_nom?: string;
  salle_code?: string;
  salle_capacite?: number;
  type_salle?: string;
  salle_etage?: string;
  batiment_id?: number;
  batiment_nom?: string;
  batiment_code?: string;
  batiment_couleur?: string;
  date_evenement: string;
  heure_debut: string;
  heure_fin: string;
  responsable?: string;
  description?: string;
  statut: 'confirme' | 'en_attente' | 'annule' | 'termine';
  annee_id?: number;
  school_id?: number;
  created_at?: string;
}

export interface ClasseItem {
  id: number;
  nom: string;
  niveau: string;
  frais_scolarite?: number;
  frais_inscription?: number;
  devise?: string;
  annee_id?: number;
  enseignant_id?: number | null;
  enseignant_nom?: string;
  enseignant_prenom?: string;
  professeur_principal_id?: number | null;
  prof_principal_nom?: string;
  prof_principal_prenom?: string;
  salle_id?: number | null;
  salle_nom?: string;
  salle_code?: string;
  salle_capacite?: number;
  salle_etage?: string;
  batiment_id?: number | null;
  batiment_nom?: string;
  batiment_code?: string;
  batiment_couleur?: string;
  nombre_eleves?: number;
}

export interface EleveItem {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  sexe?: 'M' | 'F' | string;
  date_naissance?: string;
  lieu_naissance?: string;
  photo?: string;
  classe_id?: number;
  classe_nom?: string;
  classe_niveau?: string;
  nom_parent?: string;
  tel_parent?: string;
  email_parent?: string;
  adresse?: string;
  statut?: string; // 'Passant', 'Redoublant(e)', etc.
  statut_scolaire?: 'Actif' | 'Abandon';
  regime_inscription?: 'Nouveau' | 'Ancien' | string;
  anciennete?: 'Nouveau' | 'Ancien';
  anciennete_libelle?: string; // 'Nouveau', 'Nouvelle', 'Ancien', 'Ancienne'
  anciennete_motif?: string;
  date_inscription?: string;
  annee_premiere_inscription?: number;
  statut_declare_par_user?: number;
  school_id?: number;
  frais_scolarite?: number;
  frais_inscription?: number;
  total_paye?: number;
  total_paye_scolarite?: number;
  total_paye_inscription?: number;
  devise?: string;
}

export type CategorieMateriel = 
  | 'table_banc' 
  | 'bureau_chaise' 
  | 'tableau' 
  | 'informatique' 
  | 'sport' 
  | 'projecteur_audio' 
  | 'autre';

export type TypeTableau = 'craie' | 'marqueur' | 'numerique';

export type EmplacementType = 'salle' | 'magasin';

export type EtatMateriel = 'neuf' | 'bon' | 'passable' | 'a_reparer' | 'defectueux';

export type UniteMesureMateriel = 'unite' | 'paquet';

export interface RessourceMaterielle {
  id: number;
  nom: string;
  code_inventaire?: string;
  categorie: CategorieMateriel;
  type_tableau?: TypeTableau | null;
  quantite: number;
  unite_mesure?: UniteMesureMateriel; // 'unite' | 'paquet'
  unites_par_paquet?: number; // Nombre d'unités contenues par paquet (ex: 10, 50, etc.)
  emplacement_type: EmplacementType;
  salle_id?: number | null;
  salle_nom_libre?: string;
  magasin_nom?: string;
  emplacement_detail?: string;
  etat: EtatMateriel;
  est_archive_defectueux: number; // 0 = actif, 1 = archivé défectueux
  motif_archivage?: string | null;
  date_archivage?: string | null;
  date_acquisition?: string | null;
  valeur_unitaire?: number;
  fournisseur?: string;
  responsable?: string;
  description?: string;
  cycle?: 'primaire' | 'secondaire' | 'all';
  school_id: number;
  created_at?: string;
  updated_at?: string;
  // Joins
  salle_nom?: string;
  salle_code?: string;
  salle_type?: string;
  batiment_nom?: string;
  batiment_code?: string;
}

export type PlanType = 'trial' | 'standard' | 'premium' | 'enterprise';

export interface SaaSPlan {
  id: string;
  name: string;
  type: PlanType;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  features: string[];
  max_students: number;
  max_users: number;
  is_active: boolean;
  is_recommended?: boolean;
}

export interface SaASubscription {
  id: string;
  school_id: number;
  school_name: string;
  plan_id: string;
  status: 'active' | 'trialing' | 'expired' | 'canceled' | 'past_due';
  start_date: string;
  end_date: string;
  trial_end?: string;
  cancel_at_period_end: boolean;
  payment_method?: string;
  last_payment_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SaASTransaction {
  id: string;
  school_id: number;
  subscription_id: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending' | 'refunded';
  payment_gateway: 'fedapay' | 'stripe' | 'manual';
  gateway_reference?: string;
  customer_name: string;
  customer_email: string;
  invoice_url?: string;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  school_id: number;
  school_name: string;
  user_id: number;
  user_name: string;
  subject: string;
  category: 'technical' | 'billing' | 'feature_request' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export interface AppConfig {
  id: string;
  maintenance_mode: boolean;
  registration_open: boolean;
  default_trial_days: number;
  support_email: string;
  fedapay_public_key: string;
  fedapay_mode: 'sandbox' | 'live';
  announcement_banner?: string;
  announcement_active: boolean;
}


