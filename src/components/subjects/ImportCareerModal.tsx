import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2, Info, Sparkles } from "lucide-react";
import { AVAILABLE_FACULTADES, AVAILABLE_CAREERS } from "@/lib/careerData";

interface ImportCareerModalProps {
    open: boolean;
    onClose: () => void;
    onImport: (careerId: string) => Promise<void>;
    onOpenAiImport?: () => void;
}

export const ImportCareerModal = ({ open, onClose, onImport, onOpenAiImport }: ImportCareerModalProps) => {
    const [selectedFacultad, setSelectedFacultad] = useState<string>("UTN");
    const [selectedCareer, setSelectedCareer] = useState<string>("sistemas");
    const [loading, setLoading] = useState(false);

    const handleImport = async () => {
        setLoading(true);
        try {
            await onImport(selectedCareer);
            onClose();
        } catch (error) {
            console.error("Error in modal import:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !loading && !v && onClose()}>
            <DialogContent 
                className="bg-card border-[3px] border-foreground rounded-2xl shadow-[10px_10px_0_0_#000] w-full max-w-4xl w-[94vw] h-[85vh] max-h-[760px] flex flex-col p-0 overflow-hidden"
            >
                {/* Header */}
                <DialogHeader className="p-4 sm:p-5 border-b-2 border-foreground bg-muted/20 shrink-0 space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2 text-foreground">
                                <BookOpen className="h-5 w-5 text-foreground" />
                                Importar Plan de Estudios
                            </DialogTitle>
                            <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                Seleccioná tu universidad y carrera para cargar el plan con correlatividades oficiales.
                            </p>
                        </div>
                    </div>

                    {onOpenAiImport && (
                        <div className="p-3 rounded-xl bg-[#ffd21c] border-2 border-foreground shadow-[2px_2px_0_0_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-black text-[#ffd21c] flex items-center justify-center shrink-0 border border-foreground">
                                    <Sparkles className="w-4 h-4 fill-[#ffd21c]" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-black leading-tight">
                                        ¿Tenés tu plan en un Excel, PDF o foto del programa?
                                    </p>
                                    <p className="text-[11px] font-medium text-black/80">
                                        Nuestra Inteligencia Artificial extrae automáticamente materias y correlativas.
                                    </p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                    onClose();
                                    onOpenAiImport();
                                }}
                                className="bg-black text-white hover:bg-neutral-800 text-xs font-black px-3.5 py-1.5 h-auto rounded-lg border border-foreground shadow-[1px_1px_0_0_#000] shrink-0 hover:-translate-y-0.5 transition-transform"
                            >
                                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-[#ffd21c] fill-[#ffd21c]" />
                                Cargar con IA
                            </Button>
                        </div>
                    )}
                </DialogHeader>

                {/* Body: Split View (Universities left, Careers right) */}
                <div className="flex flex-1 min-h-0 overflow-hidden bg-background">
                    {/* Left: Universities list */}
                    <div className="w-48 sm:w-56 shrink-0 border-r-2 border-foreground/20 flex flex-col bg-muted/10 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground px-2 py-1">
                            Universidad
                        </p>
                        {AVAILABLE_FACULTADES.map(f => {
                            const count = AVAILABLE_CAREERS.filter(c => c.facultad === f.id).length;
                            const isSelected = selectedFacultad === f.id;
                            return (
                                <button
                                    key={f.id}
                                    onClick={() => {
                                        setSelectedFacultad(f.id);
                                        const first = AVAILABLE_CAREERS.find(c => c.facultad === f.id);
                                        if (first) setSelectedCareer(first.id);
                                    }}
                                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all flex items-center justify-between border ${
                                        isSelected
                                            ? "bg-foreground text-background font-black border-foreground shadow-[2px_2px_0_0_#000]"
                                            : "border-transparent text-muted-foreground hover:text-foreground font-semibold hover:bg-muted/40"
                                    }`}
                                >
                                    <span className="truncate pr-1">{f.label}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-black shrink-0 ${
                                        isSelected ? "bg-background text-foreground" : "bg-muted text-muted-foreground"
                                    }`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Right: Career cards list */}
                    <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-5 overflow-hidden">
                        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-border/40 shrink-0">
                            <span className="text-xs font-bold text-foreground">
                                {AVAILABLE_FACULTADES.find(f => f.id === selectedFacultad)?.fullLabel}
                            </span>
                            <span className="text-[11px] font-bold text-muted-foreground">
                                {AVAILABLE_CAREERS.filter(c => c.facultad === selectedFacultad).length} carreras disponibles
                            </span>
                        </div>

                        {/* Scrollable Grid of Careers */}
                        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {AVAILABLE_CAREERS.filter(c => c.facultad === selectedFacultad).map(c => {
                                    const isSelected = selectedCareer === c.id;
                                    return (
                                        <button
                                            key={c.id}
                                            onClick={() => setSelectedCareer(c.id)}
                                            className={`w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-start justify-between gap-2.5 ${
                                                isSelected
                                                    ? "bg-[#ffd21c] text-black border-foreground shadow-[3px_3px_0_0_#000] -translate-y-0.5"
                                                    : "bg-card text-foreground border-border hover:border-foreground hover:bg-muted/20 hover:shadow-[2px_2px_0_0_#000]"
                                            }`}
                                        >
                                            <div className="space-y-1">
                                                <p className={`text-xs sm:text-sm leading-snug ${isSelected ? "font-black text-black" : "font-bold text-foreground"}`}>
                                                    {c.label}
                                                </p>
                                                <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                    isSelected ? "bg-black/10 text-black" : "bg-muted text-muted-foreground"
                                                }`}>
                                                    Plan Oficial
                                                </span>
                                            </div>
                                            {isSelected && (
                                                <div className="w-5 h-5 rounded-full bg-black text-[#ffd21c] flex items-center justify-center shrink-0 mt-0.5">
                                                    <BookOpen className="w-3 h-3" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-3.5 sm:p-4 border-t-2 border-foreground bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                    <p className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5 text-center sm:text-left">
                        <Info className="w-4 h-4 text-foreground shrink-0" />
                        <span>Se importarán las materias con sus códigos y correlativas al plan actual.</span>
                    </p>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onClose}
                            disabled={loading}
                            className="text-xs font-bold px-4 border-2 border-foreground"
                        >
                            Cancelar
                        </Button>
                        <Button
                            size="sm"
                            className="bg-[#25d06c] hover:bg-[#25d06c]/90 text-black border-2 border-foreground shadow-[2px_2px_0_0_#000] text-xs font-black px-5 hover:-translate-y-0.5 transition-transform"
                            onClick={handleImport}
                            disabled={loading}
                        >
                            {loading ? (
                                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Importando...</>
                            ) : (
                                <><BookOpen className="h-3.5 w-3.5 mr-1.5" /> Importar Carrera Seleccionada</>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
