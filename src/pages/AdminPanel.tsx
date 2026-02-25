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
import { UserPlus, Mail, Check, Clock, Trash2, Shield, Star, Download } from "lucide-react";

interface InvitedUser {
  id: string;
  email: string;
  created_at: string;
  accepted_at: string | null;
}

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
  email: string | null;
  nombre: string | null;
  created_at: string;
}

const AdminPanel = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Registered Users state
  const [registeredUsers, setRegisteredUsers] = useState<Profile[]>([]);
  const [loadingRegisteredUsers, setLoadingRegisteredUsers] = useState(false);

  // Template states
  const [useSistemasTemplate, setUseSistemasTemplate] = useState(false);

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
        fetchInvitedUsers();
        fetchReviews();
        fetchRegisteredUsers();
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitedUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("invited_users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvitedUsers(data || []);
    } catch (error) {
      console.error("Error fetching invited users:", error);
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
      // 1. Llamar a la función RPC privilegiada para borrar auth.users
      const { error } = await supabase.rpc('delete_user_by_admin', {
        user_id_to_delete: id
      });

      if (error) throw error;

      toast.success(`Usuario ${email || id} eliminado correctamente`);

      // En caso de que el email elimine la invitación también, refrescamos ambas tablas
      fetchRegisteredUsers();
      fetchInvitedUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(`Error al eliminar usuario: ${error.message}`);
    }
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

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEmail.trim()) {
      toast.error("Ingresa un email válido");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error("El formato del email no es válido");
      return;
    }

    setInviting(true);

    try {
      // Check if already invited
      const { data: existing } = await supabase
        .from("invited_users")
        .select("id")
        .eq("email", newEmail.toLowerCase())
        .maybeSingle();

      if (existing) {
        toast.error("Este email ya fue invitado");
        setInviting(false);
        return;
      }

      const templateValue = useSistemasTemplate ? 'sistemas' : 'none';

      const { error } = await supabase
        .from("invited_users")
        .insert({
          email: newEmail.toLowerCase(),
          invited_by: user!.id,
          template: templateValue
        });

      if (error) throw error;

      toast.success(`Invitación creada para ${newEmail} ${useSistemasTemplate ? '(Ing. Sistemas)' : ''}`);
      setNewEmail("");
      setUseSistemasTemplate(false);
      fetchInvitedUsers();
    } catch (error: any) {
      console.error("Error inviting user:", error);
      toast.error(`Error al crear la invitación: ${error.message || error.details || "Error desconocido"}`);
    } finally {
      setInviting(false);
    }
  };

  const handleDeleteInvitation = async (id: string, email: string) => {
    try {
      const { error } = await supabase
        .from("invited_users")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success(`Invitación para ${email} eliminada`);
      fetchInvitedUsers();
    } catch (error) {
      console.error("Error deleting invitation:", error);
      toast.error("Error al eliminar la invitación");
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

      {/* Invite User Form ... existing ... */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invitar Nuevo Usuario
          </CardTitle>
          <CardDescription>
            Ingresa el email del usuario que deseas invitar. Solo los usuarios invitados podrán registrarse.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInviteUser} className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label htmlFor="email" className="sr-only">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ejemplo@email.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={inviting}
                />
              </div>
              <Button type="submit" disabled={inviting}>
                {inviting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Invitar
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center space-x-2 bg-secondary/30 p-3 rounded-lg border border-border mt-2">
              <Switch
                id="template-mode"
                checked={useSistemasTemplate}
                onCheckedChange={setUseSistemasTemplate}
              />
              <Label htmlFor="template-mode" className="cursor-pointer">
                Plantilla: <span className="font-semibold text-neon-cyan">Ingeniería en Sistemas</span>
              </Label>
              <p className="text-xs text-muted-foreground ml-2 hidden sm:block">
                (El usuario recibirá el plan de estudios cargado automáticamente).
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Registered Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios Registrados</CardTitle>
          <CardDescription>
            Cuentas existosas dentro de la base de datos de TABE
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingRegisteredUsers ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : registeredUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay usuarios registrados
            </p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {registeredUsers.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <UserPlus className="h-4 w-4 text-neon-cyan" />
                    <div>
                      <p className="font-medium">{profile.nombre || 'Sin nombre'}</p>
                      <p className="text-xs text-muted-foreground">
                        {profile.email || 'Sin email'} • Reg: {new Date(profile.created_at).toLocaleDateString("es-AR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteUser(profile.id, profile.email || 'Desconocido')}
                      disabled={profile.id === user?.id}
                      title={profile.id === user?.id ? "No puedes borrarte a ti mismo" : "Borrar usuario completo y en cascada"}
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

      {/* Invited Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios Invitados</CardTitle>
          <CardDescription>
            Lista de todos los usuarios que han sido invitados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitedUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay usuarios invitados aún
            </p>
          ) : (
            <div className="space-y-3">
              {invitedUsers.map((invited) => (
                <div
                  key={invited.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{invited.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Invitado el {new Date(invited.created_at).toLocaleDateString("es-AR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {invited.accepted_at ? (
                      <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
                        <Check className="h-3 w-3 mr-1" />
                        Registrado
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        Pendiente
                      </Badge>
                    )}
                    {!invited.accepted_at && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteInvitation(invited.id, invited.email)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
};

export default AdminPanel;
