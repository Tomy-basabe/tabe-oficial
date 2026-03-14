import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { UserPlus, Trash2, Shield, Star, Download, Crown, Ban, CalendarDays, Clock, BookOpen, Loader2, Search, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AVAILABLE_FACULTADES, AVAILABLE_CAREERS } from "@/lib/careerData";
import { generateId } from "@/lib/utils/id";

interface UserReview {
  id: string;
  user_id: string;
  name: string;
  career: string;
  rating: number;
  description: string;
  created_at: string;
}

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  nombre: string | null;
  created_at: string;
  plan?: string;
  plan_expires_at?: string | null;
  plan_activated_at?: string | null;
  plan_type?: string | null;
}

const PLAN_PRICES: Record<string, { label: string; price: string; months: number }> = {
  mensual: { label: "Mensual", price: "$5.000", months: 1 },
  semestral: { label: "Semestral", price: "$25.000", months: 6 },
  anual: { label: "Anual", price: "$45.000", months: 12 },
};

const AdminPanel = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Registered Users state
  const [registeredUsers, setRegisteredUsers] = useState<Profile[]>([]);
  const [loadingRegisteredUsers, setLoadingRegisteredUsers] = useState(false);

  // Subscription modal states
  const [activatingUser, setActivatingUser] = useState<Profile | null>(null);
  const [selectedPlanType, setSelectedPlanType] = useState<string>("mensual");

  // Career template loading
  const [careerUser, setCareerUser] = useState<Profile | null>(null);
  const [careerLoading, setCareerLoading] = useState(false);
  const [selectedFacultad, setSelectedFacultad] = useState<string>("UTN");
  const [selectedCareer, setSelectedCareer] = useState<string>("sistemas");
  const [searchQuery, setSearchQuery] = useState("");


  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) throw error;
      setIsAdmin(!!data);

      if (data) {
        fetchReviews();
        fetchRegisteredUsers();
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
    } finally {
      setLoading(false);
    }
  };



  const fetchReviews = async () => {
    setLoadingReviews(true);
    try {
      const { data, error } = await supabase
        .from("user_reviews")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast.error("Error al cargar las valoraciones");
    } finally {
      setLoadingReviews(false);
    }
  };

  const fetchRegisteredUsers = async () => {
    setLoadingRegisteredUsers(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRegisteredUsers(data || []);
    } catch (error) {
      console.error("Error fetching registered users:", error);
    } finally {
      setLoadingRegisteredUsers(false);
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (!confirm(`¿Estás COMPLETAMENTE SEGURO de eliminar al usuario ${email || 'con ID ' + id}? Esta acción destruirá toda su información de TABE y es IRREVERSIBLE.`)) return;

    try {
      const { error } = await supabase.rpc('delete_user_by_admin', {
        user_id_to_delete: id
      });

      if (error) throw error;

      toast.success(`Usuario ${email || id} eliminado correctamente`);
      fetchRegisteredUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(`Error al eliminar usuario: ${error.message}`);
    }
  };

  // ── Subscription Management ──
  const handleActivatePlan = async () => {
    if (!activatingUser) return;

    const planInfo = PLAN_PRICES[selectedPlanType];
    if (!planInfo) return;

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + planInfo.months);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          plan: "premium",
          plan_type: selectedPlanType,
          plan_activated_at: now.toISOString(),
          plan_expires_at: expiresAt.toISOString(),
        })
        .eq("user_id", activatingUser.user_id);

      if (error) throw error;

      toast.success(
        `✅ Plan ${planInfo.label} (${planInfo.price}) activado para ${activatingUser.nombre || activatingUser.email}. Vence el ${expiresAt.toLocaleDateString("es-AR")}`
      );

      setActivatingUser(null);
      fetchRegisteredUsers();
    } catch (error: any) {
      console.error("Error activating plan:", error);
      toast.error(`Error al activar plan: ${error.message}`);
    }
  };

  const handleDeactivatePlan = async (profile: Profile) => {
    if (!confirm(`¿Desactivar el plan Premium de ${profile.nombre || profile.email}?`)) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          plan: "free",
          plan_type: null,
          plan_activated_at: null,
          plan_expires_at: null,
        })
        .eq("user_id", profile.user_id);

      if (error) throw error;

      toast.success(`Plan desactivado para ${profile.nombre || profile.email}`);
      fetchRegisteredUsers();
    } catch (error: any) {
      console.error("Error deactivating plan:", error);
      toast.error(`Error: ${error.message}`);
    }
  };

  const filteredUsers = registeredUsers.filter(profile => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (profile.nombre?.toLowerCase().includes(searchLower)) ||
      (profile.email?.toLowerCase().includes(searchLower)) ||
      (profile.user_id.toLowerCase().includes(searchLower))
    );
  });

  const getPlanStatus = (profile: Profile) => {
    if (profile.plan !== "premium") return "free";
    if (!profile.plan_expires_at) return "free";
    const now = new Date();
    const expires = new Date(profile.plan_expires_at);
    if (now > expires) return "expired";
    const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 7) return "expiring";
    return "active";
  };

  const handleExtractTemplate = async () => {
    setExtracting(true);
    try {
      const [subjectsResult, depsResult] = await Promise.all([
        supabase.from("subjects").select("*").order("año", { ascending: true }).order("numero_materia", { ascending: true }),
        supabase.from("subject_dependencies").select("*")
      ]);

      if (subjectsResult.error) throw subjectsResult.error;
      if (depsResult.error) throw depsResult.error;

      // Ensure we clean the dependencies array
      const cleanedDeps = depsResult.data.map(d => ({
        subject_id: d.subject_id,
        requiere_aprobada: d.requiere_aprobada,
        requiere_regular: d.requiere_regular
      }));

      const templateData = {
        subjects: subjectsResult.data,
        dependencies: cleanedDeps
      };

      const jsonString = JSON.stringify(templateData, null, 2);
      await navigator.clipboard.writeText(jsonString);

      toast.success("Plantilla copiada al portapapeles. Pégala en el chat.", {
        duration: 8000
      });
    } catch (error) {
      console.error("Error extracting template:", error);
      toast.error("Error al extraer plantilla");
    } finally {
      setExtracting(false);
    }
  };

  // ── Career Template Loading ──
  const handleLoadCareerForUser = async () => {
    if (!careerUser) return;
    setCareerLoading(true);

    try {
      // Check if user already has subjects
      const { data: existingSubjects } = await supabase
        .from("subjects")
        .select("id")
        .eq("user_id", careerUser.user_id)
        .limit(1);

      if (existingSubjects && existingSubjects.length > 0) {
        if (!confirm(`${careerUser.nombre || careerUser.email} ya tiene materias cargadas. Si continúas se agregarán las del nuevo plan (puede duplicar). ¿Continuar?`)) {
          setCareerLoading(false);
          return;
        }
      }

      const career = AVAILABLE_CAREERS.find(c => c.id === selectedCareer);
      if (!career) throw new Error("Carrera no encontrada");

      const templateModule = await import(`@/data/${career.file}.json`);
      const templateData = templateModule.default;
      const { subjects: tplSubjects, dependencies: tplDependencies } = templateData;

      const idMap = new Map<string, string>();
      const newSubjects = tplSubjects.map((s: any) => {
        const newId = generateId();
        idMap.set(s.id, newId);
        return {
          id: newId,
          nombre: s.nombre,
          codigo: s.codigo,
          año: s.año,
          numero_materia: s.numero_materia,
          user_id: careerUser.user_id,
        };
      });

      const { error: subError } = await supabase.from("subjects").insert(newSubjects);
      if (subError) throw subError;

      const newDeps = tplDependencies.map((d: any) => ({
        subject_id: idMap.get(d.subject_id),
        requiere_regular: d.requiere_regular ? idMap.get(d.requiere_regular) : null,
        requiere_aprobada: d.requiere_aprobada ? idMap.get(d.requiere_aprobada) : null,
        user_id: careerUser.user_id,
      })).filter((d: any) => d.subject_id);

      if (newDeps.length > 0) {
        const { error: depError } = await supabase.from("subject_dependencies").insert(newDeps);
        if (depError) throw depError;
      }

      // Update user profile with the new career info
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          facultad: career.facultad,
          carrera: career.label
        })
        .eq("user_id", careerUser.user_id);

      if (profileError) {
        console.error("Error updating profile with career info:", profileError);
        // We don't throw here to avoid failing the whole process if only this step fails,
        // but it's noted in the console.
      }

      toast.success(`✅ Plan de ${career.label} cargado para ${careerUser.nombre || careerUser.email}`);
      setCareerUser(null);
      fetchRegisteredUsers(); // Refresh the list to show the new info if needed
    } catch (error: any) {
      console.error("Error loading career template:", error);
      toast.error(`Error al cargar carrera: ${error.message}`);
    } finally {
      setCareerLoading(false);
    }
  };



  const handleDeleteReview = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta valoración?")) return;

    try {
      const { error } = await supabase
        .from("user_reviews")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Valoración eliminada");
      fetchReviews();
    } catch (error) {
      console.error("Error deleting review:", error);
      toast.error("Error al eliminar la valoración");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-4">
        <Shield className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Acceso Restringido</h2>
        <p className="text-muted-foreground">
          No tienes permisos para acceder a esta página.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* ... Headers ... */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Panel de Administración
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los usuarios que pueden acceder a la aplicación
          </p>
        </div>

        <Button
          variant="outline"
          onClick={handleExtractTemplate}
          disabled={extracting}
          className="border-neon-gold text-neon-gold hover:bg-neon-gold/10"
        >
          {extracting ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-neon-gold mr-2" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Copiar Plantilla Actual
        </Button>
      </div>

      {/* Registered Users + Subscription Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-neon-gold" />
            Usuarios y Suscripciones
          </CardTitle>
          <CardDescription>
            </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email o ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/20 border-border focus-visible:ring-neon-gold"
              />
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-secondary/10 whitespace-nowrap">
              <Users className="h-4 w-4 text-neon-gold" />
              <span className="text-sm font-medium"> Total: <span className="text-neon-gold font-bold">{registeredUsers.length}</span> usuarios</span>
            </div>
          </div>

          {loadingRegisteredUsers ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {searchQuery ? "No se encontraron usuarios que coincidan con la búsqueda" : "No hay usuarios registrados"}
            </p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {filteredUsers.map((profile) => {
                const status = getPlanStatus(profile);
                const expiresDate = profile.plan_expires_at ? new Date(profile.plan_expires_at) : null;
                const daysLeft = expiresDate
                  ? Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : null;

                return (
                  <div
                    key={profile.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-card gap-3 ${status === "active" ? "border-neon-gold/30" :
                      status === "expiring" ? "border-amber-500/40" :
                        status === "expired" ? "border-destructive/30" :
                          "border-border"
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${status === "active" ? "bg-neon-gold/20" :
                        status === "expiring" ? "bg-amber-500/20" :
                          status === "expired" ? "bg-destructive/20" :
                            "bg-secondary"
                        }`}>
                        {status === "active" || status === "expiring" ? (
                          <Crown className={`h-5 w-5 ${status === "active" ? "text-neon-gold" : "text-amber-500"}`} />
                        ) : status === "expired" ? (
                          <Ban className="h-5 w-5 text-destructive" />
                        ) : (
                          <UserPlus className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{profile.nombre || 'Sin nombre'}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {profile.email || 'Sin email'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Plan Badge */}
                      {status === "free" && (
                        <Badge variant="secondary" className="text-xs">Free</Badge>
                      )}
                      {status === "active" && (
                        <Badge className="bg-neon-gold/20 text-neon-gold border-neon-gold/30 text-xs">
                          <Crown className="h-3 w-3 mr-1" />
                          Premium {profile.plan_type ? `(${PLAN_PRICES[profile.plan_type]?.label})` : ""}
                        </Badge>
                      )}
                      {status === "expiring" && (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs animate-pulse">
                          <Clock className="h-3 w-3 mr-1" />
                          Vence en {daysLeft} día{daysLeft !== 1 ? "s" : ""}
                        </Badge>
                      )}
                      {status === "expired" && (
                        <Badge variant="destructive" className="text-xs">
                          <Ban className="h-3 w-3 mr-1" />
                          Expirado
                        </Badge>
                      )}

                      {/* Expiration date */}
                      {expiresDate && status !== "free" && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {expiresDate.toLocaleDateString("es-AR")}
                        </span>
                      )}

                      {/* Activate / Deactivate buttons */}
                      {(status === "free" || status === "expired") && (
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-neon-gold/20 text-neon-gold border border-neon-gold/30 hover:bg-neon-gold/30"
                          variant="outline"
                          onClick={() => {
                            setActivatingUser(profile);
                            setSelectedPlanType("mensual");
                          }}
                        >
                          <Crown className="h-3 w-3 mr-1" />
                          Activar Plan
                        </Button>
                      )}
                      {(status === "active" || status === "expiring") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeactivatePlan(profile)}
                        >
                          <Ban className="h-3 w-3 mr-1" />
                          Desactivar
                        </Button>
                      )}

                      {/* Load career */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/10"
                        onClick={() => { setCareerUser(profile); setSelectedCareer("sistemas"); }}
                      >
                        <BookOpen className="h-3 w-3 mr-1" />
                        Carrera
                      </Button>

                      {/* Delete user */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteUser(profile.user_id, profile.email || 'Desconocido')}
                        disabled={profile.user_id === user?.id}
                        title={profile.user_id === user?.id ? "No puedes borrarte a ti mismo" : "Borrar usuario"}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Activation Modal ── */}
      {
        activatingUser && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setActivatingUser(null)}>
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-6" onClick={(e) => e.stopPropagation()}>
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Crown className="h-5 w-5 text-neon-gold" />
                  Activar Plan Premium
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Para: <span className="font-semibold text-foreground">{activatingUser.nombre || activatingUser.email}</span>
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Seleccionar plan:</Label>
                {Object.entries(PLAN_PRICES).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedPlanType(key)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${selectedPlanType === key
                      ? "border-neon-gold bg-neon-gold/10 shadow-[0_0_20px_rgba(255,215,0,0.1)]"
                      : "border-border bg-secondary/20 hover:border-muted-foreground/30"
                      }`}
                  >
                    <div className="text-left">
                      <p className="font-bold">{val.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {val.months} mes{val.months > 1 ? "es" : ""} de acceso
                      </p>
                    </div>
                    <span className={`text-lg font-bold ${selectedPlanType === key ? "text-neon-gold" : "text-foreground"}`}>
                      {val.price}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border text-sm">
                <CalendarDays className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">
                  Vence el:{" "}
                  <span className="font-semibold text-foreground">
                    {(() => {
                      const d = new Date();
                      d.setMonth(d.getMonth() + PLAN_PRICES[selectedPlanType].months);
                      return d.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
                    })()}
                  </span>
                </span>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setActivatingUser(null)}>
                  Cancelar
                </Button>
                <Button className="flex-1 bg-gradient-to-r from-neon-gold to-amber-500 text-black font-bold hover:opacity-90" onClick={handleActivatePlan}>
                  <Crown className="h-4 w-4 mr-2" />
                  Activar {PLAN_PRICES[selectedPlanType].price}
                </Button>
              </div>
            </div>
          </div>
        )
      }

      {/* ── Career Template Modal ── */}
      {careerUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !careerLoading && setCareerUser(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center gap-3 p-5 border-b border-border flex-shrink-0">
              <BookOpen className="h-5 w-5 text-neon-cyan flex-shrink-0" />
              <div className="min-w-0">
                <h3 className="text-lg font-bold">Cargar Plan de Carrera</h3>
                <p className="text-xs text-muted-foreground truncate">
                  Para: <span className="font-semibold text-foreground">{careerUser.nombre || careerUser.email || 'Usuario'}</span>
                </p>
              </div>
            </div>

            {/* Body: sidebar + career list */}
            <div className="flex flex-1 min-h-0" style={{ overflow: 'hidden' }}>

              {/* Left sidebar — University tabs */}
              <div className="w-36 flex-shrink-0 border-r border-border flex flex-col bg-secondary/30">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-3 pb-1">Universidad</p>
                {AVAILABLE_FACULTADES.map(f => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setSelectedFacultad(f.id);
                      const first = AVAILABLE_CAREERS.find(c => c.facultad === f.id);
                      if (first) setSelectedCareer(first.id);
                    }}
                    className={`text-left px-3 py-3 text-xs transition-all border-l-2 ${selectedFacultad === f.id
                      ? "border-neon-cyan text-neon-cyan bg-neon-cyan/10 font-bold"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Right: scrollable career list */}
              <div className="flex-1 flex flex-col min-h-0">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-3 pb-1 flex-shrink-0">
                  {AVAILABLE_FACULTADES.find(f => f.id === selectedFacultad)?.fullLabel || selectedFacultad}
                </p>
                <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 pr-2" style={{ scrollbarWidth: 'thin' }}>
                  {AVAILABLE_CAREERS.filter(c => c.facultad === selectedFacultad).map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCareer(c.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${selectedCareer === c.id
                        ? "border-neon-cyan bg-neon-cyan/10 shadow-[0_0_12px_rgba(0,217,255,0.15)]"
                        : "border-border bg-secondary/20 hover:border-muted-foreground/40 hover:bg-secondary/40"
                        }`}
                    >
                      <span className={`font-medium text-sm leading-snug ${selectedCareer === c.id ? "text-neon-cyan" : ""}`}>
                        {c.label}
                      </span>
                      {selectedCareer === c.id && <BookOpen className="h-4 w-4 text-neon-cyan flex-shrink-0 ml-2" />}
                    </button>
                  ))}
                  {AVAILABLE_CAREERS.filter(c => c.facultad === selectedFacultad).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">Sin carreras disponibles aún</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border space-y-3 flex-shrink-0">
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <span className="text-amber-400 text-xs">
                  ⚠️ Se insertarán todas las materias y correlatividades del plan seleccionado en la cuenta del usuario.
                </span>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setCareerUser(null)} disabled={careerLoading}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-neon-cyan to-neon-purple text-background font-bold hover:opacity-90"
                  onClick={handleLoadCareerForUser}
                  disabled={careerLoading}
                >
                  {careerLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cargando...</>
                  ) : (
                    <><BookOpen className="h-4 w-4 mr-2" /> Cargar Carrera</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Invited Users List */}

      {/* User Reviews List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Valoraciones de Usuarios
          </CardTitle>
          <CardDescription>
            Comentarios y reseñas dejadas por los estudiantes desde la página de Configuración.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingReviews ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay valoraciones de usuarios aún.
            </p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="p-4 rounded-xl border bg-card hover:border-primary/50 transition-colors"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{review.name}</span>
                        <Badge variant="outline" className="text-xs bg-secondary/50">
                          {review.career}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${review.rating >= star
                              ? "text-neon-gold fill-neon-gold"
                              : "text-muted-foreground/30"
                              }`}
                          />
                        ))}
                      </div>
                      <p className="text-muted-foreground text-sm mt-2 italic">"{review.description}"</p>
                      <p className="text-xs text-muted-foreground/60 mt-2">
                        {new Date(review.created_at).toLocaleDateString("es-AR")}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                      onClick={() => handleDeleteReview(review.id)}
                      title="Eliminar valoración"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div >
  );
};

export default AdminPanel;
