import { Toaster } from "@/components/ui/toaster";
import Forest from "./pages/Forest";
import Discord from "./pages/Discord";
import { DiscordVoiceProvider } from "@/contexts/DiscordVoiceContext";
import { GlobalDiscordVoiceWidget } from "@/components/discord/GlobalDiscordVoiceWidget";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Dashboard from "@/pages/Dashboard";
import CareerPlan from "@/pages/CareerPlan";
import Calendar from "@/pages/Calendar";
import Pomodoro from "@/pages/Pomodoro";
import Metrics from "@/pages/Metrics";
import AIAssistant from "@/pages/AIAssistant";
import Settings from "@/pages/Settings";
import Auth from "@/pages/Auth";
import Flashcards from "@/pages/Flashcards";
import Quizzes from "@/pages/Quizzes";
import Library from "@/pages/Library";
import Achievements from "@/pages/Achievements";
import Notion from "@/pages/Notion";
import AdminPanel from "@/pages/AdminPanel";
import NotFound from "@/pages/NotFound";
import Friends from "@/pages/Friends";
import Marketplace from "@/pages/Marketplace";
import CorrelativityMap from "@/pages/CorrelativityMap";
import Landing from "@/pages/Landing";
import { PremiumGate } from "@/components/premium/PremiumGate";
import { TutorialTour } from "@/components/onboarding/TutorialTour";
import { PWAInstallBanner } from "@/components/ui/PWAInstallBanner";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isGuest } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center animate-pulse">
            <span className="font-display font-bold text-white text-lg">T</span>
          </div>
          <p className="text-muted-foreground text-sm">Cargando T.A.B.E...</p>
        </div>
      </div>
    );
  }

  if (!user && !isGuest) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isGuest } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center animate-pulse">
          <span className="font-display font-bold text-white text-lg">T</span>
        </div>
      </div>
    );
  }

  if (user || isGuest) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route
      path="/"
      element={<Landing />}
    />
    <Route
      path="/auth"
      element={
        <PublicRoute>
          <Auth />
        </PublicRoute>
      }
    />
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
      <Route path="/asistente" element={<PremiumGate feature="Asistente IA"><AIAssistant /></PremiumGate>} />
      <Route path="/flashcards" element={<PremiumGate feature="Flashcards"><Flashcards /></PremiumGate>} />
      <Route path="/cuestionarios" element={<PremiumGate feature="Cuestionarios"><Quizzes /></PremiumGate>} />
      <Route path="/marketplace" element={<PremiumGate feature="Marketplace"><Marketplace /></PremiumGate>} />
      <Route path="/biblioteca" element={<PremiumGate feature="Biblioteca"><Library /></PremiumGate>} />
      <Route path="/logros" element={<Achievements />} />
      <Route path="/notion" element={<PremiumGate feature="Apuntes"><Notion /></PremiumGate>} />
      <Route path="/amigos" element={<Friends />} />
      <Route path="/configuracion" element={<Settings />} />
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="/bosque" element={<Forest />} />
      <Route path="/discord" element={<Discord />} />
      <Route path="/mapa" element={<CorrelativityMap />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
);

import { PomodoroProvider } from "@/contexts/PomodoroContext";
import { GlobalPomodoroWidget } from "@/components/pomodoro/GlobalPomodoroWidget";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <PomodoroProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <DiscordVoiceProvider>
              <AppRoutes />
              <GlobalDiscordVoiceWidget />
              <PWAInstallBanner />
            </DiscordVoiceProvider>
          </BrowserRouter>
        </PomodoroProvider>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
