import { Toaster } from "@/components/ui/toaster";
import { DiscordVoiceProvider } from "@/contexts/DiscordVoiceContext";
import { GlobalDiscordVoiceWidget } from "@/components/discord/GlobalDiscordVoiceWidget";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { lazy, Suspense } from "react";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

// Eagerly loaded (lightweight pages)
import Dashboard from "@/pages/Dashboard";
import Auth from "@/pages/Auth";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/NotFound";
import EmailVerified from "@/pages/EmailVerified";
import Settings from "@/pages/Settings";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import Careers from "@/pages/Careers";
import CareerDetail from "@/pages/CareerDetail";
import StudyGuides from "@/pages/StudyGuides";
import ResetPassword from "@/pages/ResetPassword";

// Lazy loaded (heavy pages with large dependencies)
const Notion = lazy(() => import("@/pages/Notion"));
const AIAssistant = lazy(() => import("@/pages/AIAssistant"));
const Flashcards = lazy(() => import("@/pages/Flashcards"));
const Quizzes = lazy(() => import("@/pages/Quizzes"));
const Metrics = lazy(() => import("@/pages/Metrics"));
const Library = lazy(() => import("@/pages/Library"));
const Calendar = lazy(() => import("@/pages/Calendar"));
const Pomodoro = lazy(() => import("@/pages/Pomodoro"));
const CareerPlan = lazy(() => import("@/pages/CareerPlan"));
const Forest = lazy(() => import("@/pages/Forest"));
const Discord = lazy(() => import("@/pages/Discord"));
const AdminPanel = lazy(() => import("@/pages/AdminPanel"));
const Friends = lazy(() => import("@/pages/Friends"));
const Marketplace = lazy(() => import("@/pages/Marketplace"));
const CorrelativityMap = lazy(() => import("@/pages/CorrelativityMap"));
const Routines = lazy(() => import("@/pages/Routines"));
const OfficeHours = lazy(() => import("@/pages/OfficeHours"));
const Achievements = lazy(() => import("@/pages/Achievements"));
const Exams = lazy(() => import("@/pages/Exams"));
const Games = lazy(() => import("@/pages/Games"));
const PenaltyGame = lazy(() => import("@/pages/PenaltyGame"));
const KartRaceGame = lazy(() => import("@/pages/KartRaceGame"));
const RPGBattleGame = lazy(() => import("@/pages/RPGBattleGame"));
const BombGame = lazy(() => import("@/pages/BombGame"));
const TicTacToeGame = lazy(() => import("@/pages/TicTacToeGame"));
const ChessGame = lazy(() => import("@/pages/ChessGame"));

import { PremiumGate } from "@/components/premium/PremiumGate";
import { TutorialTour } from "@/components/onboarding/TutorialTour";
import { PWAInstallBanner } from "@/components/ui/PWAInstallBanner";
import { extractAndStoreTokenFromUrl } from "@/lib/googleCalendarSync";

// Automatically capture OAuth provider token from Google redirects globally
if (typeof window !== "undefined") {
  extractAndStoreTokenFromUrl();
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes fresh
      gcTime: 1000 * 60 * 30, // 30 minutes in memory
      refetchOnWindowFocus: false, // Don't trigger refetches on clicking into the tab
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isGuest } = useAuth();

  if (loading) {
    return <LoadingScreen fullScreen message="Cargando T.A.B.E..." submessage="Verificando sesión académica..." />;
  }

  if (!user && !isGuest) {
    return <Navigate to="/registro" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen fullScreen message="Cargando T.A.B.E..." submessage="Iniciando..." />;
  }

  // ONLY redirect if they are a logged-in user. Guests can see /auth to sign up.
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

const LazyFallback = () => (
  <LoadingScreen message="Cargando módulo..." submessage="Preparando vista..." />
);

const AppRoutes = () => (
  <Suspense fallback={<LazyFallback />}>
  <Routes>
    <Route
      path="/"
      element={<Landing />}
    />
    <Route path="/acerca-de" element={<About />} />
    <Route path="/acerca de" element={<Navigate to="/acerca-de" replace />} />
    <Route path="/acerca%20de" element={<Navigate to="/acerca-de" replace />} />
    <Route path="/contacto" element={<Contact />} />
    <Route path="/privacidad" element={<Privacy />} />
    <Route path="/terminos" element={<Terms />} />
    <Route path="/carreras" element={<Careers />} />
    <Route path="/carreras/:id" element={<CareerDetail />} />
    <Route path="/guia-de-estudio" element={<StudyGuides />} />
    <Route path="/email-verificado" element={<EmailVerified />} />
    <Route path="/auth" element={<Navigate to="/registro" replace />} />
    <Route
      path="/registro"
      element={
        <PublicRoute>
          <Auth />
        </PublicRoute>
      }
    />
    <Route path="/restablecer-contrasena" element={<ResetPassword />} />
    <Route
      element={
        <ProtectedRoute>
          <TutorialTour />
          <MainLayout />
        </ProtectedRoute>
      }
    >
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/carrera" element={<CareerPlan />} />
      <Route path="/calendario" element={<Calendar />} />
      <Route path="/pomodoro" element={<Pomodoro />} />
      <Route path="/metricas" element={<Metrics />} />
      <Route path="/asistente" element={<Navigate to="/TABEAI" replace />} />
      <Route path="/TABEAI" element={<AIAssistant />} />
      <Route path="/flashcards" element={<Flashcards />} />
      <Route path="/cuestionarios" element={<Quizzes />} />
      <Route path="/marketplace" element={<PremiumGate feature="Marketplace"><Marketplace /></PremiumGate>} />
      <Route path="/biblioteca" element={<Library />} />
      <Route path="/logros" element={<Achievements />} />
      <Route path="/notion" element={<Navigate to="/apuntes" replace />} />
      <Route path="/apuntes" element={<Notion />} />
      <Route path="/examenes" element={<Exams />} />
      <Route path="/amigos" element={<Friends />} />
      <Route path="/configuracion" element={<Settings />} />
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="/bosque" element={<Forest />} />
      <Route path="/rutinas" element={<Routines />} />
      <Route path="/discord" element={<Discord />} />
      <Route path="/mapa" element={<CorrelativityMap />} />
      <Route path="/consultas" element={<OfficeHours />} />
      <Route path="/juegos" element={<Games />} />
      <Route path="/juegos/penales" element={<PenaltyGame />} />
      <Route path="/juegos/karts" element={<KartRaceGame />} />
      <Route path="/juegos/batalla" element={<RPGBattleGame />} />
      <Route path="/juegos/bomba" element={<BombGame />} />
      <Route path="/juegos/tateti" element={<TicTacToeGame />} />
      <Route path="/juegos/ajedrez" element={<ChessGame />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
  </Suspense>
);


import { PomodoroProvider } from "@/contexts/PomodoroContext";
import { AIChatProvider } from "@/contexts/AIChatContext";
import { GlobalPomodoroWidget } from "@/components/pomodoro/GlobalPomodoroWidget";
import { useTheme } from "@/hooks/useTheme";

const App = () => {
  useTheme();
  console.log("App.tsx initialized v5.1 (Direct Ads Check)");
  return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <PomodoroProvider>
          <AIChatProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <DiscordVoiceProvider>

                <AppRoutes />
                <GlobalDiscordVoiceWidget />
                <PWAInstallBanner />
              </DiscordVoiceProvider>
            </BrowserRouter>
          </AIChatProvider>
        </PomodoroProvider>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

export default App;
