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
import FloatingNotificationOverlay from './components/FloatingNotificationOverlay';
import AIAssistantWidget from './components/AIAssistantWidget';
import Login from './pages/Login';
import SuperAdminLayout from './components/super-admin/SuperAdminLayout';

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

const LoadingFallback = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-500 font-medium animate-pulse">Chargement...</p>
    </div>
  </div>
);

const ProtectedRoute = ({ children, user, path, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[], user?: any, path?: string }) => {
  const { schoolPlan } = useAuth();
  const [isChecking, setIsChecking] = React.useState(true);

  React.useEffect(() => {
    if (schoolPlan !== null) {
      setIsChecking(false);
    }
    const timer = setTimeout(() => setIsChecking(false), 3000);
    return () => clearTimeout(timer);
  }, [schoolPlan]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'super_admin') return <Navigate to="/super-admin" replace />;
    return <Navigate to="/accueil" replace />;
  }

  // If super admin tries to access non super admin routes
  if (!allowedRoles && user.role === 'super_admin') {
    return <Navigate to="/super-admin" replace />;
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
                  {/* Public Routes */}
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
                  <Route 
                    path="/super-admin" 
                    element={
                      <ProtectedRoute user={user} allowedRoles={['super_admin']}>
                        <SuperAdminLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<SuperAdminDashboard />} />
                    <Route path="stats" element={<SuperAdminDashboard />} />
                    <Route path="revenus" element={<SuperAdminDashboard />} />
                    <Route path="activite" element={<SuperAdminDashboard />} />
                    <Route path="users" element={<SuperAdminUsers />} />
                    <Route path="users/:filter" element={<SuperAdminUsers />} />
                    <Route path="clients" element={<SuperAdminSchools />} />
                    <Route path="admins" element={<SuperAdminUsers />} />
                    <Route path="subscriptions" element={<SuperAdminSubscriptions />} />
                    <Route path="subscriptions/:filter" element={<SuperAdminSubscriptions />} />
                    <Route path="history" element={<SuperAdminSubscriptions />} />
                    <Route path="plans" element={<SuperAdminPlans />} />
                    <Route path="plans/new" element={<SuperAdminPlans />} />
                    <Route path="plans/coupons" element={<SuperAdminPlans />} />
                    <Route path="analytics" element={<SuperAdminAnalytics />} />
                    <Route path="analytics/*" element={<SuperAdminAnalytics />} />
                    <Route path="logs" element={<AuditLogsManagement />} />
                    <Route path="logs/*" element={<AuditLogsManagement />} />
                    <Route path="billing/transactions" element={<TransactionsManagement />} />
                    <Route path="billing/payments" element={<TransactionsManagement />} />
                    <Route path="product" element={<SuperAdminProduct />} />
                    <Route path="product/*" element={<SuperAdminProduct />} />
                    <Route path="catalog" element={<SuperAdminPlansCatalog />} />
                    <Route path="support" element={<SuperAdminSupport />} />
                    <Route path="support/*" element={<SuperAdminSupport />} />
                    <Route path="marketing" element={<SuperAdminMarketing />} />
                    <Route path="marketing/*" element={<SuperAdminMarketing />} />
                    <Route path="security" element={<SuperAdminSecurity />} />
                    <Route path="security/*" element={<SuperAdminSecurity />} />
                    <Route path="team" element={<SuperAdminTeam />} />
                    <Route path="team/*" element={<SuperAdminTeam />} />
                    <Route path="profile" element={<SuperAdminProfile />} />
                    <Route path="settings" element={<SuperAdminSettings />} />
                    <Route path="settings/:tab" element={<SuperAdminSettings />} />
                    <Route path="*" element={<Navigate to="/super-admin" replace />} />
                  </Route>

                  {/* Main App Routes (Schools/Parents/Teachers) */}
                  <Route 
                    element={
                      <ProtectedRoute user={user}>
                        <Layout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/accueil" element={<Home cycle="all" />} />
                    <Route path="/mon-compte" element={<TeacherAccount />} />
                    <Route path="/mes-classes" element={<TeacherClasses />} />
                    <Route path="/ma-classe" element={<TeacherClasses />} />
                    <Route path="/mes-cours" element={<TeacherCourses />} />
                    <Route path="/admin/sessions-actives" element={<AdminActiveSessions />} />
                    <Route path="/tableau-de-bord" element={<Dashboard cycle="all" />} />
                    <Route path="/eleves" element={<Students cycle="all" />} />
                    <Route path="/promotions" element={<Passages cycle="all" />} />
                    <Route path="/enseignants" element={<Teachers cycle="all" />} />
                    <Route path="/classes" element={<Classes cycle="all" />} />
                    <Route path="/batiments-salles" element={<BatimentsSalles />} />
                    <Route path="/ressources-materielles" element={<MaterialResources />} />
                    <Route path="/materiels" element={<Navigate to="/ressources-materielles" replace />} />
                    <Route path="/matieres" element={<Subjects cycle="all" />} />
                    <Route path="/notes" element={<Grades cycle="all" />} />
                    <Route path="/emploi-du-temps" element={<Timetable cycle="all" />} />
                    <Route path="/bibliotheque" element={<Bibliotheque cycleProp="tous" />} />
                    <Route path="/bibliotheque-physique" element={<BibliothequePhysique cycleProp="tous" />} />
                    <Route path="/epreuves" element={<Epreuves cycleProp="tous" />} />
                    <Route path="/epreuves-composition" element={<EpreuvesComposition />} />
                    <Route path="/recrutement-inscriptions" element={<RecruitmentManagement />} />
                    <Route path="/collecte-enseignants" element={<TeacherCollectionManagement />} />

                    <Route path="/accueil-primaire" element={<Home cycle="primaire" />} />
                    <Route path="/tableau-de-bord-primaire" element={<Dashboard cycle="primaire" />} />
                    <Route path="/classes-primaire" element={<Classes cycle="primaire" />} />
                    <Route path="/eleves-primaire" element={<Students cycle="primaire" />} />
                    <Route path="/promotions-primaire" element={<Passages cycle="primaire" />} />
                    <Route path="/enseignants-primaire" element={<Teachers cycle="primaire" />} />
                    <Route path="/matieres-primaire" element={<Subjects cycle="primaire" />} />
                    <Route path="/notes-primaire" element={<Grades cycle="primaire" />} />
                    <Route path="/epreuves-primaire" element={<Epreuves cycleProp="primaire" />} />
                    <Route path="/bibliotheque-primaire" element={<Bibliotheque cycleProp="primaire" />} />
                    <Route path="/bibliotheque-physique-primaire" element={<BibliothequePhysique cycleProp="primaire" />} />
                    <Route path="/paiements-primaire" element={<Payments cycle="primaire" />} />
                    <Route path="/finances-primaire" element={<FinanceDashboard cycleProp="primaire" />} />
                    <Route path="/emploi-du-temps-primaire" element={<Timetable cycle="primaire" />} />
                    <Route path="/examens-primaire" element={<Examens cycle="primaire" />} />

                    <Route path="/accueil-secondaire" element={<Home cycle="secondaire" />} />
                    <Route path="/tableau-de-bord-secondaire" element={<Dashboard cycle="secondaire" />} />
                    <Route path="/classes-secondaire" element={<Classes cycle="secondaire" />} />
                    <Route path="/eleves-secondaire" element={<Students cycle="secondaire" />} />
                    <Route path="/promotions-secondaire" element={<Passages cycle="secondaire" />} />
                    <Route path="/enseignants-secondaire" element={<Teachers cycle="secondaire" />} />
                    <Route path="/matieres-secondaire" element={<Subjects cycle="secondaire" />} />
                    <Route path="/notes-secondaire" element={<Grades cycle="secondaire" />} />
                    <Route path="/epreuves-secondaire" element={<Epreuves cycleProp="secondaire" />} />
                    <Route path="/bibliotheque-secondaire" element={<Bibliotheque cycleProp="secondaire" />} />
                    <Route path="/bibliotheque-physique-secondaire" element={<BibliothequePhysique cycleProp="secondaire" />} />
                    <Route path="/paiements-secondaire" element={<Payments cycle="secondaire" />} />
                    <Route path="/finances-secondaire" element={<FinanceDashboard cycleProp="secondaire" />} />
                    <Route path="/emploi-du-temps-secondaire" element={<Timetable cycle="secondaire" />} />
                    <Route path="/examens-secondaire" element={<Examens cycle="secondaire" />} />
                    <Route path="/collecte-enseignants-secondaire" element={<TeacherCollectionManagement />} />

                    <Route path="/mon-enfant" element={<ParentGrades />} />
                    <Route path="/paiements" element={<Payments cycle="all" />} />
                    <Route path="/finances" element={<FinanceDashboard cycleProp="all" />} />
                    <Route path="/tresorerie" element={<Navigate to="/finances" replace />} />
                    <Route path="/personnel-administratif" element={<AdministrativeStaff />} />
                    <Route path="/cartes-et-badges" element={<SchoolCards />} />
                    <Route path="/salaires-enseignants" element={<TeacherSalaries />} />
                    <Route path="/salaires" element={<TeacherSalaries />} />
                    <Route path="/emploi-du-temps-requests" element={<TimetableRequests />} />
                    <Route path="/demandes-emploi-du-temps" element={<Navigate to="/emploi-du-temps-requests" replace />} />
                    <Route path="/documents-demandes" element={<DocumentRequests />} />
                    <Route path="/documents-administratifs" element={<DocumentRequests isTeacherAdministrativePage={true} />} />
                    <Route path="/demandes" element={<Navigate to="/documents-demandes" replace />} />
                    <Route path="/alertes" element={<Alerts />} />
                    <Route path="/messagerie" element={<Messaging />} />
                    <Route path="/gmail" element={<GmailPage />} />
                    <Route path="/workspace" element={<WorkspacePage />} />
                    <Route path="/google-workspace" element={<Navigate to="/workspace" replace />} />
                    <Route path="/ecole" element={<SchoolInfo />} />
                    <Route path="/audit-logs" element={<AuditLogs />} />
                    <Route path="/parametres" element={<Settings />} />
                    <Route path="/annees-scolaires" element={<Navigate to="/parametres" replace />} />
                    <Route path="/annees" element={<Navigate to="/parametres" replace />} />
                    <Route path="/settings" element={<Navigate to="/parametres" replace />} />
                    <Route path="/lab-ia" element={<AILab />} />
                    
                    <Route path="/" element={<Navigate to="/accueil" replace />} />
                  </Route>

                  {/* Catch all */}
                  <Route path="*" element={<Navigate to="/accueil" replace />} />
                </Routes>
              </Suspense>
            </NotificationProvider>
          </Router>
        </ConfirmProvider>
      </ThemeProvider>
    </TranslationProvider>
  );
}
