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
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Tu calificación
                </label>
                <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            className="p-1 focus:outline-none transition-transform hover:scale-110 cursor-pointer"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoveredRating(star)}
                            onMouseLeave={() => setHoveredRating(0)}
                        >
                            <Star
                                className={cn(
                                    "w-5 h-5 transition-colors duration-150",
                                    (hoveredRating || rating) >= star
                                        ? "text-amber-400 fill-amber-400"
                                        : "text-zinc-300 dark:text-zinc-600"
                                )}
                            />
                        </button>
                    ))}
                    <span className="text-xs text-zinc-400 ml-2 font-medium">
                        {rating > 0 ? `${rating} de 5 estrellas` : "Selecciona una puntuación"}
                    </span>
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        Nombre visible
                    </label>
                    <span className="text-[11px] font-mono text-zinc-400">
                        {name.length}/100
                    </span>
                </div>
                <Input
                    placeholder="Tu nombre o alias"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                    className="h-9 text-sm bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg focus-visible:ring-1 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600"
                />
            </div>

            <div>
                <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        Carrera o facultad
                    </label>
                    <span className="text-[11px] font-mono text-zinc-400">
                        {career.length}/80
                    </span>
                </div>
                <Input
                    placeholder="Ej. Ingeniería en Sistemas"
                    value={career}
                    onChange={(e) => setCareer(e.target.value)}
                    maxLength={80}
                    className="h-9 text-sm bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg focus-visible:ring-1 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600"
                />
            </div>

            <div>
                <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        Tu testimonio o experiencia
                    </label>
                    <span className={cn(
                        "text-[11px] font-mono",
                        description.length >= 280 ? "text-amber-500 font-semibold" : "text-zinc-400"
                    )}>
                        {description.length}/300
                    </span>
                </div>
                <Textarea
                    placeholder="¿Cómo te ha ayudado TABE en tus estudios y organización?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={300}
                    className="h-24 resize-none text-sm bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg focus-visible:ring-1 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600 placeholder:text-zinc-400"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                    Tu testimonio aparecerá en la página principal una vez revisado por el equipo.
                </p>
            </div>

            <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 h-9 rounded-lg text-xs font-medium shadow-2xs transition-colors"
            >
                {isSubmitting ? "Enviando valoración..." : hasSubmitted ? "Actualizar valoración" : "Publicar valoración"}
            </Button>
        </form>
    );
}
