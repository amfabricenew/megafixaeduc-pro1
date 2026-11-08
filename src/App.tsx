/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';
import Layout from './components/Layout';
import { ThemeProvider } from './components/ThemeProvider';
import { TranslationProvider } from './contexts/TranslationContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { useAuth } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import { hasPageAccess } from './utils/permissions';
import { isPathAllowedByPlan } from './utils/subscriptions';
import SubscriptionGatedView from './components/SubscriptionGatedView';
import { apiFetch } from './utils/api';
import FloatingNotificationOverlay from './components/FloatingNotificationOverlay';
import AIAssistantWidget from './components/AIAssistantWidget';
import Login from './pages/Login';

// Component that renders system overlays ONLY on non-isolated pages
function GlobalOverlays() {
  const location = useLocation();
  const isIsolatedPage = 
    location.pathname.startsWith('/public/') ||
    location.pathname.startsWith('/formulaire-enseignant') ||
    location.pathname.startsWith('/collecte-enseignant') ||
    location.pathname.startsWith('/f/') ||
    location.pathname.startsWith('/verifier-document') ||
    location.pathname.startsWith('/verify-doc');

  if (isIsolatedPage) {
    return null;
  }

  return (
    <>
      <FloatingNotificationOverlay />
      <AIAssistantWidget />
    </>
  );
}

// Resilient lazy load helper with smooth retry
const lazyWithRetry = <T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) =>
  lazy(async () => {
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      try {
        return await componentImport();
      } catch (error) {
        attempts++;
        console.warn(`[MégafixaEduc] Chargement du module (tentative ${attempts}/${maxAttempts})...`, error);
        if (attempts >= maxAttempts) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, attempts * 500));
      }
    }
    throw new Error('Impossible de charger le module demandé');
  });

// Lazy load pages
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const Students = lazyWithRetry(() => import('./pages/Students'));
const Teachers = lazyWithRetry(() => import('./pages/Teachers'));
const Classes = lazyWithRetry(() => import('./pages/Classes'));
const Grades = lazyWithRetry(() => import('./pages/Grades'));
const Payments = lazyWithRetry(() => import('./pages/Payments'));
const TeacherSalaries = lazyWithRetry(() => import('./pages/TeacherSalaries'));
const FinanceDashboard = lazyWithRetry(() => import('./pages/FinanceDashboard'));
const AdministrativeStaff = lazyWithRetry(() => import('./pages/AdministrativeStaff'));
const Timetable = lazyWithRetry(() => import('./pages/Timetable'));
const Examens = lazyWithRetry(() => import('./pages/Examens'));
const TimetableRequests = lazyWithRetry(() => import('./pages/TimetableRequests'));
const DocumentRequests = lazyWithRetry(() => import('./pages/DocumentRequests'));
const Alerts = lazyWithRetry(() => import('./pages/Alerts'));
const Messaging = lazyWithRetry(() => import('./pages/Messaging'));
const GmailPage = lazyWithRetry(() => import('./pages/GmailPage'));
const WorkspacePage = lazyWithRetry(() => import('./pages/WorkspacePage'));
const Settings = lazyWithRetry(() => import('./pages/Settings'));
const Subjects = lazyWithRetry(() => import('./pages/Subjects'));
const Passages = lazyWithRetry(() => import('./pages/Passages'));
const SchoolInfo = lazyWithRetry(() => import('./pages/Schoolinfo'));
const SchoolCards = lazyWithRetry(() => import('./pages/SchoolCards'));
const AuditLogs = lazyWithRetry(() => import('./pages/AuditLogs'));
const Home = lazyWithRetry(() => import('./pages/Home'));
const ParentGrades = lazyWithRetry(() => import('./pages/ParentGrades'));
const TeacherAccount = lazyWithRetry(() => import('./pages/TeacherAccount'));
const TeacherClasses = lazyWithRetry(() => import('./pages/TeacherClasses'));
const TeacherCourses = lazyWithRetry(() => import('./pages/TeacherCourses'));
const AdminActiveSessions = lazyWithRetry(() => import('./pages/AdminActiveSessions'));
const LandingPage = lazyWithRetry(() => import('./pages/LandingPage'));
const Signup = lazyWithRetry(() => import('./pages/Signup'));
const SchoolCreationRequestPage = lazyWithRetry(() => import('./pages/SchoolCreationRequestPage'));
const SubscriptionPayment = lazyWithRetry(() => import('./pages/SubscriptionPayment'));
const SetupPassword = lazyWithRetry(() => import('./pages/SetupPassword'));
const DocumentVerification = lazyWithRetry(() => import('./pages/DocumentVerification'));
const BatimentsSalles = lazyWithRetry(() => import('./pages/BatimentsSalles'));
const MaterialResources = lazyWithRetry(() => import('./pages/MaterialResources'));
const Bibliotheque = lazyWithRetry(() => import('./pages/Bibliotheque').then(m => ({ default: m.Bibliotheque })));
const BibliothequePhysique = lazyWithRetry(() => import('./pages/BibliothequePhysique'));
const Epreuves = lazyWithRetry(() => import('./pages/Epreuves').then(m => ({ default: m.Epreuves })));
const EpreuvesComposition = lazyWithRetry(() => import('./pages/EpreuvesComposition').then(m => ({ default: m.EpreuvesComposition })));
const RecruitmentManagement = lazyWithRetry(() => import('./pages/RecruitmentManagement'));
const PublicRecruitment = lazyWithRetry(() => import('./pages/PublicRecruitment'));
const PublicEnrollment = lazyWithRetry(() => import('./pages/PublicEnrollment'));
const PublicTracking = lazyWithRetry(() => import('./pages/PublicTracking'));
const TeacherCollectionManagement = lazyWithRetry(() => import('./pages/TeacherCollectionManagement'));
const PublicTeacherForm = lazyWithRetry(() => import('./pages/PublicTeacherForm'));
const AILab = lazyWithRetry(() => import('./pages/AILab'));

// Super Admin Pages
const SuperAdminDashboard = lazyWithRetry(() => import('./pages/super-admin/Dashboard'));
const SuperAdminUsers = lazyWithRetry(() => import('./pages/super-admin/UsersManagement'));
const SuperAdminSubscriptions = lazyWithRetry(() => import('./pages/super-admin/SubscriptionsManagement'));
const SuperAdminPlans = lazyWithRetry(() => import('./pages/super-admin/PlansManagement'));
const SuperAdminSchools = lazyWithRetry(() => import('./pages/super-admin/SchoolsManagement'));
const SuperAdminSettings = lazyWithRetry(() => import('./pages/super-admin/SuperAdminSettings'));
const AuditLogsManagement = lazyWithRetry(() => import('./pages/super-admin/AuditLogsManagement'));
const TransactionsManagement = lazyWithRetry(() => import('./pages/super-admin/TransactionsManagement'));

const SuperAdminAnalytics = lazyWithRetry(() => import('./pages/super-admin/Analytics'));
const SuperAdminProduct = lazyWithRetry(() => import('./pages/super-admin/Product'));
const SuperAdminPlansCatalog = lazyWithRetry(() => import('./pages/super-admin/PlansCatalog'));
const SuperAdminSupport = lazyWithRetry(() => import('./pages/super-admin/Support'));
const SuperAdminMarketing = lazyWithRetry(() => import('./pages/super-admin/Marketing'));
const SuperAdminSecurity = lazyWithRetry(() => import('./pages/super-admin/Security'));
const SuperAdminTeam = lazyWithRetry(() => import('./pages/super-admin/Team'));
const SuperAdminProfile = lazyWithRetry(() => import('./pages/super-admin/SuperAdminProfile'));

const SuperAdminPlaceholder = lazyWithRetry(() => import('./pages/super-admin/Placeholder'));
const SuperAdminLayout = lazyWithRetry(() => import('./components/super-admin/SuperAdminLayout'));

const LoadingFallback = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-500 font-medium animate-pulse">Chargement...</p>
    </div>
  </div>
);

const ProtectedRoute = ({ children, user, path }: { children: React.ReactNode, allowedRoles?: string[], user?: any, path?: string }) => {
  const { schoolPlan } = useAuth();
  const [isChecking, setIsChecking] = React.useState(true);

  React.useEffect(() => {
    if (schoolPlan !== null) {
      setIsChecking(false);
    }
    // If it's still null after 3s, default to standard to avoid infinite spin
    const timer = setTimeout(() => setIsChecking(false), 3000);
    return () => clearTimeout(timer);
  }, [schoolPlan]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (path && !hasPageAccess(user.permissions, path, user.role)) {
    return <Navigate to="/accueil" replace />;
  }

  const effectivePlan = schoolPlan || 'standard';

  if (path && !isChecking && effectivePlan && !user?.is_test_account && !isPathAllowedByPlan(effectivePlan, path)) {
    return <SubscriptionGatedView path={path} currentPlan={effectivePlan} />;
  }

  return <>{children}</>;
};

export default function App() {
  const { user } = useAuth();

  return (
    <TranslationProvider>
      <ThemeProvider>
        <ConfirmProvider>
          <Router>
            <NotificationProvider>
              <Toaster position="top-right" />
              <GlobalOverlays />
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/welcome" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/parent-login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/demande-compte-ecole" element={<SchoolCreationRequestPage />} />
                <Route path="/demande-ecole" element={<SchoolCreationRequestPage />} />
                <Route path="/school-request" element={<SchoolCreationRequestPage />} />
                <Route path="/paiement-abonnement" element={<SubscriptionPayment />} />
                <Route path="/paiement" element={<SubscriptionPayment />} />
                <Route path="/subscription-payment" element={<SubscriptionPayment />} />
                <Route path="/setup-password" element={<SetupPassword />} />
                <Route path="/verifier-document" element={<DocumentVerification />} />
                <Route path="/verify-doc" element={<DocumentVerification />} />
                <Route path="/public/recrutement/:token" element={<PublicRecruitment />} />
                <Route path="/public/inscription/:token" element={<PublicEnrollment />} />
                <Route path="/public/suivi-candidature" element={<PublicTracking />} />
                <Route path="/public/suivi-inscription" element={<PublicTracking />} />
                <Route path="/formulaire-enseignant/:token" element={<PublicTeacherForm />} />
                <Route path="/public/formulaire-enseignant/:token" element={<PublicTeacherForm />} />
                <Route path="/public/collecte-enseignant/:token" element={<PublicTeacherForm />} />
                <Route path="/public/collecte-enseignants/:token" element={<PublicTeacherForm />} />
                <Route path="/collecte-enseignant/:token" element={<PublicTeacherForm />} />
                <Route path="/f/:token" element={<PublicTeacherForm />} />

                {/* Super Admin Routes */}
                <Route path="/super-admin/*" element={
                  user?.role === 'super_admin' ? (
                    <SuperAdminLayout>
                      <Routes>
                        <Route path="/" element={<SuperAdminDashboard />} />
                        <Route path="/stats" element={<SuperAdminDashboard />} />
                        <Route path="/revenus" element={<SuperAdminDashboard />} />
                        <Route path="/activite" element={<SuperAdminDashboard />} />
                        
                        <Route path="/users" element={<SuperAdminUsers />} />
                        <Route path="/users/:filter" element={<SuperAdminUsers />} />
                        <Route path="/clients" element={<SuperAdminSchools />} />
                        <Route path="/admins" element={<SuperAdminUsers />} />
                        
                        <Route path="/subscriptions" element={<SuperAdminSubscriptions />} />
                        <Route path="/subscriptions/:filter" element={<SuperAdminSubscriptions />} />
                        <Route path="/history" element={<SuperAdminSubscriptions />} />
                        
                        <Route path="/plans" element={<SuperAdminPlans />} />
                        <Route path="/plans/new" element={<SuperAdminPlans />} />
                        <Route path="/plans/coupons" element={<SuperAdminPlans />} />
                        
                        {/* Analytics & Reports */}
                        <Route path="/analytics" element={<SuperAdminAnalytics />} />
                        <Route path="/analytics/*" element={<SuperAdminAnalytics />} />
                        <Route path="/logs" element={<AuditLogsManagement />} />
                        <Route path="/logs/*" element={<AuditLogsManagement />} />
                        
                        {/* Billing */}
                        <Route path="/billing/transactions" element={<TransactionsManagement />} />
                        <Route path="/billing/payments" element={<TransactionsManagement />} />
                        
                        {/* Product & Support */}
                        <Route path="/product" element={<SuperAdminProduct />} />
                        <Route path="/product/*" element={<SuperAdminProduct />} />
                        <Route path="/catalog" element={<SuperAdminPlansCatalog />} />
                        <Route path="/support" element={<SuperAdminSupport />} />
                        <Route path="/support/*" element={<SuperAdminSupport />} />
                        
                        {/* Marketing & Security */}
                        <Route path="/marketing" element={<SuperAdminMarketing />} />
                        <Route path="/marketing/*" element={<SuperAdminMarketing />} />
                        <Route path="/security" element={<SuperAdminSecurity />} />
                        <Route path="/security/*" element={<SuperAdminSecurity />} />
                        
                        {/* Team */}
                        <Route path="/team" element={<SuperAdminTeam />} />
                        <Route path="/team/*" element={<SuperAdminTeam />} />
                        <Route path="/profile" element={<SuperAdminProfile />} />

                        <Route path="/settings" element={<SuperAdminSettings />} />
                        <Route path="/settings/:tab" element={<SuperAdminSettings />} />

                        <Route path="*" element={<Navigate to="/super-admin" replace />} />
                      </Routes>
                    </SuperAdminLayout>
                  ) : (
                    <Navigate to="/login" replace />
                  )
                } />

                <Route path="/*" element={
                  user ? (
                    user.role === 'super_admin' ? (
                      <Navigate to="/super-admin" replace />
                    ) : (
                      <Layout>
                        <Routes>
                          <Route path="/" element={<Navigate to="/accueil" replace />} />
                        
                        {/* General / Main Shared Routes */}
                        <Route path="/accueil" element={<ProtectedRoute user={user} path="/accueil"><Home cycle="all" /></ProtectedRoute>} />
                        <Route path="/mon-compte" element={<ProtectedRoute user={user} path="/mon-compte"><TeacherAccount /></ProtectedRoute>} />
                        <Route path="/mes-classes" element={<ProtectedRoute user={user} path="/mes-classes"><TeacherClasses /></ProtectedRoute>} />
                        <Route path="/ma-classe" element={<ProtectedRoute user={user} path="/ma-classe"><TeacherClasses /></ProtectedRoute>} />
                        <Route path="/mes-cours" element={<ProtectedRoute user={user} path="/mes-cours"><TeacherCourses /></ProtectedRoute>} />
                        <Route path="/admin/sessions-actives" element={<ProtectedRoute user={user} path="/admin/sessions-actives"><AdminActiveSessions /></ProtectedRoute>} />
                        <Route path="/tableau-de-bord" element={<ProtectedRoute user={user} path="/"><Dashboard cycle="all" /></ProtectedRoute>} />
                        <Route path="/eleves" element={<ProtectedRoute user={user} path="/eleves"><Students cycle="all" /></ProtectedRoute>} />
                        <Route path="/promotions" element={<ProtectedRoute user={user} path="/promotions"><Passages cycle="all" /></ProtectedRoute>} />
                        <Route path="/enseignants" element={<ProtectedRoute user={user} path="/enseignants"><Teachers cycle="all" /></ProtectedRoute>} />
                        <Route path="/classes" element={<ProtectedRoute user={user} path="/classes"><Classes cycle="all" /></ProtectedRoute>} />
                        <Route path="/batiments-salles" element={<ProtectedRoute user={user} path="/batiments-salles"><BatimentsSalles /></ProtectedRoute>} />
                        <Route path="/ressources-materielles" element={<ProtectedRoute user={user} path="/ressources-materielles"><MaterialResources /></ProtectedRoute>} />
                        <Route path="/materiels" element={<Navigate to="/ressources-materielles" replace />} />
                        <Route path="/matieres" element={<ProtectedRoute user={user} path="/matieres"><Subjects cycle="all" /></ProtectedRoute>} />
                        <Route path="/notes" element={<ProtectedRoute user={user} path="/notes"><Grades cycle="all" /></ProtectedRoute>} />
                        <Route path="/emploi-du-temps" element={<ProtectedRoute user={user} path="/emploi-du-temps"><Timetable cycle="all" /></ProtectedRoute>} />
                        <Route path="/bibliotheque" element={<ProtectedRoute user={user} path="/bibliotheque"><Bibliotheque cycleProp="tous" /></ProtectedRoute>} />
                        <Route path="/bibliotheque-physique" element={<ProtectedRoute user={user} path="/bibliotheque-physique"><BibliothequePhysique cycleProp="tous" /></ProtectedRoute>} />
                        <Route path="/epreuves" element={<ProtectedRoute user={user} path="/epreuves"><Epreuves cycleProp="tous" /></ProtectedRoute>} />
                        <Route path="/epreuves-composition" element={<ProtectedRoute user={user} path="/epreuves-composition"><EpreuvesComposition /></ProtectedRoute>} />
                        <Route path="/recrutement-inscriptions" element={<ProtectedRoute user={user} path="/recrutement-inscriptions"><RecruitmentManagement /></ProtectedRoute>} />
                        <Route path="/collecte-enseignants" element={<ProtectedRoute user={user} path="/collecte-enseignants"><TeacherCollectionManagement /></ProtectedRoute>} />

                        {/* Maternelle & Primaire Routes */}
                        <Route path="/accueil-primaire" element={<ProtectedRoute user={user} path="/accueil"><Home cycle="primaire" /></ProtectedRoute>} />
                        <Route path="/tableau-de-bord-primaire" element={<ProtectedRoute user={user} path="/tableau-de-bord"><Dashboard cycle="primaire" /></ProtectedRoute>} />
                        <Route path="/classes-primaire" element={<ProtectedRoute user={user} path="/classes"><Classes cycle="primaire" /></ProtectedRoute>} />
                        <Route path="/eleves-primaire" element={<ProtectedRoute user={user} path="/eleves"><Students cycle="primaire" /></ProtectedRoute>} />
                        <Route path="/promotions-primaire" element={<ProtectedRoute user={user} path="/promotions"><Passages cycle="primaire" /></ProtectedRoute>} />
                        <Route path="/enseignants-primaire" element={<ProtectedRoute user={user} path="/enseignants"><Teachers cycle="primaire" /></ProtectedRoute>} />
                        <Route path="/matieres-primaire" element={<ProtectedRoute user={user} path="/matieres"><Subjects cycle="primaire" /></ProtectedRoute>} />
                        <Route path="/notes-primaire" element={<ProtectedRoute user={user} path="/notes"><Grades cycle="primaire" /></ProtectedRoute>} />
                        <Route path="/epreuves-primaire" element={<ProtectedRoute user={user} path="/epreuves"><Epreuves cycleProp="primaire" /></ProtectedRoute>} />
                        <Route path="/bibliotheque-primaire" element={<ProtectedRoute user={user} path="/bibliotheque"><Bibliotheque cycleProp="primaire" /></ProtectedRoute>} />
                        <Route path="/bibliotheque-physique-primaire" element={<ProtectedRoute user={user} path="/bibliotheque-physique"><BibliothequePhysique cycleProp="primaire" /></ProtectedRoute>} />
                        <Route path="/paiements-primaire" element={<ProtectedRoute user={user} path="/paiements"><Payments cycle="primaire" /></ProtectedRoute>} />
                        <Route path="/finances-primaire" element={<ProtectedRoute user={user} path="/finances"><FinanceDashboard cycleProp="primaire" /></ProtectedRoute>} />
                        <Route path="/emploi-du-temps-primaire" element={<ProtectedRoute user={user} path="/emploi-du-temps"><Timetable cycle="primaire" /></ProtectedRoute>} />
                        <Route path="/examens-primaire" element={<ProtectedRoute user={user} path="/notes"><Examens cycle="primaire" /></ProtectedRoute>} />

                        {/* Secondaire Routes */}
                        <Route path="/accueil-secondaire" element={<ProtectedRoute user={user} path="/accueil"><Home cycle="secondaire" /></ProtectedRoute>} />
                        <Route path="/tableau-de-bord-secondaire" element={<ProtectedRoute user={user} path="/tableau-de-bord"><Dashboard cycle="secondaire" /></ProtectedRoute>} />
                        <Route path="/classes-secondaire" element={<ProtectedRoute user={user} path="/classes"><Classes cycle="secondaire" /></ProtectedRoute>} />
                        <Route path="/eleves-secondaire" element={<ProtectedRoute user={user} path="/eleves"><Students cycle="secondaire" /></ProtectedRoute>} />
                        <Route path="/promotions-secondaire" element={<ProtectedRoute user={user} path="/promotions"><Passages cycle="secondaire" /></ProtectedRoute>} />
                        <Route path="/enseignants-secondaire" element={<ProtectedRoute user={user} path="/enseignants"><Teachers cycle="secondaire" /></ProtectedRoute>} />
                        <Route path="/matieres-secondaire" element={<ProtectedRoute user={user} path="/matieres"><Subjects cycle="secondaire" /></ProtectedRoute>} />
                        <Route path="/notes-secondaire" element={<ProtectedRoute user={user} path="/notes"><Grades cycle="secondaire" /></ProtectedRoute>} />
                        <Route path="/epreuves-secondaire" element={<ProtectedRoute user={user} path="/epreuves"><Epreuves cycleProp="secondaire" /></ProtectedRoute>} />
                        <Route path="/bibliotheque-secondaire" element={<ProtectedRoute user={user} path="/bibliotheque"><Bibliotheque cycleProp="secondaire" /></ProtectedRoute>} />
                        <Route path="/bibliotheque-physique-secondaire" element={<ProtectedRoute user={user} path="/bibliotheque-physique"><BibliothequePhysique cycleProp="secondaire" /></ProtectedRoute>} />
                        <Route path="/paiements-secondaire" element={<ProtectedRoute user={user} path="/paiements"><Payments cycle="secondaire" /></ProtectedRoute>} />
                        <Route path="/finances-secondaire" element={<ProtectedRoute user={user} path="/finances"><FinanceDashboard cycleProp="secondaire" /></ProtectedRoute>} />
                        <Route path="/emploi-du-temps-secondaire" element={<ProtectedRoute user={user} path="/emploi-du-temps"><Timetable cycle="secondaire" /></ProtectedRoute>} />
                        <Route path="/examens-secondaire" element={<ProtectedRoute user={user} path="/notes"><Examens cycle="secondaire" /></ProtectedRoute>} />
                        <Route path="/collecte-enseignants-secondaire" element={<ProtectedRoute user={user} path="/collecte-enseignants"><TeacherCollectionManagement /></ProtectedRoute>} />

                        {/* Shared Administrative Pages */}
                        <Route path="/mon-enfant" element={<ProtectedRoute user={user} path="/mon-enfant"><ParentGrades /></ProtectedRoute>} />
                        <Route path="/paiements" element={<ProtectedRoute user={user} path="/paiements"><Payments cycle="all" /></ProtectedRoute>} />
                        <Route path="/finances" element={<ProtectedRoute user={user} path="/finances"><FinanceDashboard cycleProp="all" /></ProtectedRoute>} />
                        <Route path="/tresorerie" element={<Navigate to="/finances" replace />} />
                        <Route path="/personnel-administratif" element={<ProtectedRoute user={user} path="/personnel-administratif"><AdministrativeStaff /></ProtectedRoute>} />
                        <Route path="/cartes-et-badges" element={<ProtectedRoute user={user} path="/cartes-et-badges"><SchoolCards /></ProtectedRoute>} />
                        <Route path="/salaires-enseignants" element={<ProtectedRoute user={user} path="/salaires-enseignants"><TeacherSalaries /></ProtectedRoute>} />
                        <Route path="/salaires" element={<ProtectedRoute user={user} path="/salaires"><TeacherSalaries /></ProtectedRoute>} />
                        <Route path="/emploi-du-temps-requests" element={<ProtectedRoute user={user} path="/emploi-du-temps-requests"><TimetableRequests /></ProtectedRoute>} />
                        <Route path="/demandes-emploi-du-temps" element={<Navigate to="/emploi-du-temps-requests" replace />} />
                        <Route path="/documents-demandes" element={<ProtectedRoute user={user} path="/documents-demandes"><DocumentRequests /></ProtectedRoute>} />
                        <Route path="/documents-administratifs" element={<ProtectedRoute user={user} path="/documents-administratifs"><DocumentRequests isTeacherAdministrativePage={true} /></ProtectedRoute>} />
                        <Route path="/demandes" element={<Navigate to="/documents-demandes" replace />} />
                        <Route path="/alertes" element={<ProtectedRoute user={user} path="/alertes"><Alerts /></ProtectedRoute>} />
                        <Route path="/messagerie" element={<ProtectedRoute user={user} path="/messagerie"><Messaging /></ProtectedRoute>} />
                        <Route path="/gmail" element={<ProtectedRoute user={user}><GmailPage /></ProtectedRoute>} />
                        <Route path="/workspace" element={<ProtectedRoute user={user}><WorkspacePage /></ProtectedRoute>} />
                        <Route path="/google-workspace" element={<Navigate to="/workspace" replace />} />
                        <Route path="/ecole" element={<ProtectedRoute user={user} path="/ecole"><SchoolInfo /></ProtectedRoute>} />
                        <Route path="/audit-logs" element={<ProtectedRoute user={user} path="/audit-logs"><AuditLogs /></ProtectedRoute>} />
                        <Route path="/parametres" element={<ProtectedRoute user={user} path="/parametres"><Settings /></ProtectedRoute>} />
                        <Route path="/annees-scolaires" element={<Navigate to="/parametres" replace />} />
                        <Route path="/annees" element={<Navigate to="/parametres" replace />} />
                        <Route path="/settings" element={<Navigate to="/parametres" replace />} />
                        <Route path="/lab-ia" element={<ProtectedRoute user={user}><AILab /></ProtectedRoute>} />
                      </Routes>
                    </Layout>
                  )
                ) : (
                  <Navigate to="/login" replace />
                )
              } />
              </Routes>
            </Suspense>
            </NotificationProvider>
          </Router>
        </ConfirmProvider>
      </ThemeProvider>
    </TranslationProvider>
  );
}

