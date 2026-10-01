import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ReviewFormProps {
    userName: string;
    userId: string;
}

export function ReviewForm({ userName, userId }: ReviewFormProps) {
    const [rating, setRating] = useState<number>(0);
    const [hoveredRating, setHoveredRating] = useState<number>(0);
    const [name, setName] = useState<string>(userName || "");
    const [career, setCareer] = useState("");
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasSubmitted, setHasSubmitted] = useState(false);

    useEffect(() => {
        if (!name && userName) {
            setName(userName);
        }
    }, [userName]);

    useEffect(() => {
        checkExistingReview();
    }, [userId]);

    const checkExistingReview = async () => {
        try {
            const { data, error } = await supabase
                .from("user_reviews")
                .select("*")
                .eq("user_id", userId)
                .maybeSingle();

            if (data) {
                setHasSubmitted(true);
                setRating(data.rating);
                setCareer(data.career || "");
                setDescription(data.description || "");
                if (data.name) setName(data.name);
            }
        } catch (error) {
            console.error("Error checking existing review", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (rating === 0) {
            toast.error("Por favor selecciona una calificación");
            return;
        }

        const trimmedCareer = career.trim();
        const trimmedDescription = description.trim();
        const trimmedName = (name.trim() || userName || "Estudiante").slice(0, 100);

        if (!trimmedCareer || !trimmedDescription) {
            toast.error("Por favor completa todos los campos requeridos");
            return;
        }

        if (trimmedCareer.length > 80) {
            toast.error("La carrera o facultad no puede superar los 80 caracteres");
            return;
        }

        if (trimmedDescription.length > 300) {
            toast.error("El testimonio no puede superar los 300 caracteres");
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                name: trimmedName,
                career: trimmedCareer.slice(0, 80),
                rating,
                description: trimmedDescription.slice(0, 300),
                is_approved: false, // Toda reseña nueva o modificada queda pendiente de moderación
            };

            if (hasSubmitted) {
                const { data, error } = await supabase
                    .from("user_reviews")
                    .update(payload)
                    .eq("user_id", userId)
                    .select();

                if (error) throw error;
                if (!data || data.length === 0) {
                    throw new Error("La base de datos bloqueó la actualización.");
                }

                toast.success("¡Gracias por tu reseña! Estará visible en la portada una vez revisada por el equipo.");
            } else {
                const { error } = await supabase
                    .from("user_reviews")
                    .insert({
                        ...payload,
                        user_id: userId,
                    });

                if (error) throw error;
                toast.success("¡Gracias por tu reseña! Estará visible en la portada una vez revisada por el equipo.");
                setHasSubmitted(true);
            }
        } catch (error) {
            console.error("Error submitting review:", error);
            toast.error("Error al enviar la valoración. Inténtalo más tarde.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-1">Tu calificación</label>
                <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            className="p-1 focus:outline-none transition-transform hover:scale-110"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoveredRating(star)}
                            onMouseLeave={() => setHoveredRating(0)}
                        >
                            <Star
                                className={`w-6 h-6 ${(hoveredRating || rating) >= star
                                    ? "text-neon-gold fill-neon-gold"
                                    : "text-muted-foreground"
                                    } transition-colors duration-200`}
                            />
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium">Nombre visible</label>
                    <span className="text-[11px] font-mono text-muted-foreground">
                        {name.length}/100 caracteres
                    </span>
                </div>
                <Input
                    placeholder="Tu nombre o alias"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                    className="bg-background/50 border-white/10 text-foreground"
                />
            </div>

            <div>
                <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium">Carrera que estudias</label>
                    <span className="text-[11px] font-mono text-muted-foreground">
                        {career.length}/80 caracteres
                    </span>
                </div>
                <Input
                    placeholder="Ej. Ingeniería en Sistemas"
                    value={career}
                    onChange={(e) => setCareer(e.target.value)}
                    maxLength={80}
                    className="bg-background/50 border-white/10 text-foreground"
                />
            </div>

            <div>
                <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-sm font-medium">Cuéntanos tu experiencia</label>
                    <div
                        className={cn(
                            "inline-flex items-center gap-1 font-mono font-black text-xs px-2.5 py-0.5 rounded border shadow-[2px_2px_0_0_#000] tracking-wide transition-all select-none",
                            description.length >= 280
                                ? "bg-[#FF2E93] text-white border-black scale-105"
                                : description.length >= 200
                                ? "bg-[#FFE600] text-black border-black"
                                : "bg-secondary/70 text-foreground border-border"
                        )}
                    >
                        <span>{description.length}/300 caracteres</span>
                    </div>
                </div>
                <Textarea
                    placeholder="¿Cómo te ha ayudado TABE en tus estudios?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={300}
                    className="h-24 resize-none bg-background/50 border-white/10 text-foreground"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                    ⚡ Tu testimonio estará visible en la portada una vez revisado por el equipo.
                </p>
            </div>

            <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30"
            >
                {isSubmitting ? "Enviando..." : hasSubmitted ? "Actualizar valoración" : "Enviar valoración"}
            </Button>
        </form>
    );
}
