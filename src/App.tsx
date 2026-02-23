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

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
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
          <MainLayout />
        </ProtectedRoute>
      }
    >
      <Route path="/" element={<Dashboard />} />
      <Route path="/carrera" element={<CareerPlan />} />
      <Route path="/calendario" element={<Calendar />} />
      <Route path="/pomodoro" element={<Pomodoro />} />
      <Route path="/metricas" element={<Metrics />} />
      <Route path="/asistente" element={<AIAssistant />} />
      <Route path="/flashcards" element={<Flashcards />} />
      <Route path="/cuestionarios" element={<Quizzes />} />
      <Route path="/marketplace" element={<Marketplace />} />
      <Route path="/biblioteca" element={<Library />} />
      <Route path="/logros" element={<Achievements />} />
      <Route path="/notion" element={<Notion />} />
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
            </DiscordVoiceProvider>
          </BrowserRouter>
        </PomodoroProvider>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
