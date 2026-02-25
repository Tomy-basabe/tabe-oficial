import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ReviewFormProps {
    userName: string;
    userId: string;
}

export function ReviewForm({ userName, userId }: ReviewFormProps) {
    const [rating, setRating] = useState<number>(0);
    const [hoveredRating, setHoveredRating] = useState<number>(0);
    const [career, setCareer] = useState("");
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasSubmitted, setHasSubmitted] = useState(false);

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
                setCareer(data.career);
                setDescription(data.description);
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

        if (!career.trim() || !description.trim()) {
            toast.error("Por favor completa todos los campos");
            return;
        }

        setIsSubmitting(true);

        try {
            if (hasSubmitted) {
                // Determine if we should update or not (for now we let them update)
                const { data, error } = await supabase
                    .from("user_reviews")
                    .update({
                        name: userName,
                        career,
                        rating,
                        description
                    })
                    .eq("user_id", userId)
                    .select();

                if (error) throw error;
                if (!data || data.length === 0) throw new Error("La base de datos bloqueó la actualización (Probablemente falte la política UPDATE en Supabase).");

                toast.success("Valoración actualizada correctamente. ¡Gracias!");
            } else {
                const { error } = await supabase
                    .from("user_reviews")
                    .insert({
                        user_id: userId,
                        name: userName,
                        career,
                        rating,
                        description
                    });

                if (error) throw error;
                toast.success("Valoración enviada correctamente. ¡Muchas gracias!");
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
                <label className="block text-sm font-medium mb-1">Carrera que estudias</label>
                <Input
                    placeholder="Ej. Ingeniería en Sistemas"
                    value={career}
                    onChange={(e) => setCareer(e.target.value)}
                    className="bg-background/50 border-white/10 text-foreground"
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Cuéntanos tu experiencia</label>
                <Textarea
                    placeholder="¿Cómo te ha ayudado T.A.B.E en tus estudios?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-24 resize-none bg-background/50 border-white/10 text-foreground"
                />
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
