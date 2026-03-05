import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2, Info } from "lucide-react";
import { AVAILABLE_FACULTADES, AVAILABLE_CAREERS } from "@/lib/careerData";

interface ImportCareerModalProps {
    open: boolean;
    onClose: () => void;
    onImport: (careerId: string) => Promise<void>;
}

export const ImportCareerModal = ({ open, onClose, onImport }: ImportCareerModalProps) => {
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
            <DialogContent className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col p-0 overflow-hidden" style={{ maxHeight: '85vh' }}>
                {/* Header */}
                <DialogHeader className="p-6 border-b border-border flex-shrink-0">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <BookOpen className="h-6 w-6 text-neon-cyan" />
                        Importar Plan de Carrera
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Seleccioná tu universidad y carrera para cargar automáticamente todas tus materias.
                    </p>
                </DialogHeader>

                {/* Body */}
                <div className="flex flex-1 min-h-0 overflow-hidden">
                    {/* Left sidebar — University tabs */}
                    <div className="w-40 flex-shrink-0 border-r border-border flex flex-col bg-secondary/20">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-4 pt-4 pb-2">Universidad</p>
                        {AVAILABLE_FACULTADES.map(f => (
                            <button
                                key={f.id}
                                onClick={() => {
                                    setSelectedFacultad(f.id);
                                    const first = AVAILABLE_CAREERS.find(c => c.facultad === f.id);
                                    if (first) setSelectedCareer(first.id);
                                }}
                                className={`text-left px-4 py-3 text-xs transition-all border-l-2 ${selectedFacultad === f.id
                                    ? "border-neon-cyan text-neon-cyan bg-neon-cyan/10 font-bold"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Right content: career list */}
                    <div className="flex-1 flex flex-col min-h-0 bg-background/50">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-6 pt-4 pb-2">
                            {AVAILABLE_FACULTADES.find(f => f.id === selectedFacultad)?.fullLabel}
                        </p>
                        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2 pr-6 custom-scrollbar">
                            {AVAILABLE_CAREERS.filter(c => c.facultad === selectedFacultad).map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => setSelectedCareer(c.id)}
                                    className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all group ${selectedCareer === c.id
                                        ? "border-neon-cyan bg-neon-cyan/5 shadow-[0_0_15px_rgba(0,217,255,0.1)]"
                                        : "border-border bg-card hover:border-muted-foreground/30 hover:bg-secondary/20"
                                        }`}
                                >
                                    <span className={`font-semibold text-sm ${selectedCareer === c.id ? "text-neon-cyan" : "text-foreground"}`}>
                                        {c.label}
                                    </span>
                                    {selectedCareer === c.id && <BookOpen className="h-4 w-4 text-neon-cyan" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border bg-secondary/10 space-y-4 flex-shrink-0">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <Info className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-200/80 leading-relaxed">
                            <strong>Importante:</strong> Se cargarán los nombres, códigos y correlatividades del plan oficial. Si ya tenés materias cargadas, esto podría crear duplicados.
                        </p>
                    </div>
                    <DialogFooter className="gap-3 sm:gap-0">
                        <Button variant="outline" onClick={onClose} disabled={loading} className="px-6 rounded-xl">
                            Cancelar
                        </Button>
                        <Button
                            className="bg-gradient-to-r from-neon-cyan to-neon-purple text-background border-none font-bold hover:opacity-90 shadow-lg shadow-neon-cyan/20 px-8 rounded-xl"
                            onClick={handleImport}
                            disabled={loading}
                        >
                            {loading ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importando...</>
                            ) : (
                                <><BookOpen className="h-4 w-4 mr-2" /> Importar Plan Ahora</>
                            )}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
};
