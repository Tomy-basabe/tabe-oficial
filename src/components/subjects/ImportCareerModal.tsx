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
            <DialogContent className="bg-card border-[3px] border-foreground rounded-xl shadow-[8px_8px_0_0_hsl(var(--foreground))] w-full max-w-2xl flex flex-col p-0 overflow-hidden" style={{ maxHeight: '85vh' }}>
                {/* Header */}
                <DialogHeader className="p-6 border-b-[3px] border-foreground flex-shrink-0 bg-blue-50/30 dark:bg-background">
                    <DialogTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-2 text-foreground">
                        <BookOpen className="h-6 w-6 text-foreground" />
                        Importar Plan de Carrera
                    </DialogTitle>
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mt-1">
                        Seleccioná tu universidad y carrera para cargar automáticamente todas tus materias.
                    </p>
                </DialogHeader>

                {/* Body */}
                <div className="flex flex-1 min-h-0 overflow-hidden bg-background">
                    {/* Left sidebar — University tabs */}
                    <div className="w-40 flex-shrink-0 border-r-[3px] border-foreground flex flex-col bg-muted/20 overflow-y-auto custom-scrollbar">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-4 pt-4 pb-2">Universidad</p>
                        <div className="px-2 pb-4 space-y-1.5">
                            {AVAILABLE_FACULTADES.map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => {
                                        setSelectedFacultad(f.id);
                                        const first = AVAILABLE_CAREERS.find(c => c.facultad === f.id);
                                        if (first) setSelectedCareer(first.id);
                                    }}
                                    className={`w-full text-left px-3 py-2.5 text-[11px] uppercase tracking-widest transition-all rounded-lg border-[2px] ${selectedFacultad === f.id
                                        ? "border-foreground bg-foreground text-background font-black shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                                        : "border-transparent text-muted-foreground hover:text-foreground font-bold hover:bg-muted/50 hover:border-foreground/20"
                                        }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right content: career list */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-6 pt-4 pb-2">
                            {AVAILABLE_FACULTADES.find(f => f.id === selectedFacultad)?.fullLabel}
                        </p>
                        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3 pr-6 custom-scrollbar">
                            {AVAILABLE_CAREERS.filter(c => c.facultad === selectedFacultad).map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => setSelectedCareer(c.id)}
                                    className={`w-full flex items-center justify-between p-4 rounded-xl border-[3px] text-left transition-all group ${selectedCareer === c.id
                                        ? "border-foreground bg-[#ffd21c] dark:bg-[#ffd21c] text-black shadow-[4px_4px_0_0_hsl(var(--foreground))] -translate-y-1"
                                        : "border-foreground bg-card text-foreground hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                                        }`}
                                >
                                    <span className={`font-black text-sm uppercase tracking-wider ${selectedCareer === c.id ? "text-black" : "text-foreground"}`}>
                                        {c.label}
                                    </span>
                                    {selectedCareer === c.id && <BookOpen className="h-5 w-5 text-black" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t-[3px] border-foreground bg-muted/30 space-y-4 flex-shrink-0">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-[#ffd21c] border-[3px] border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))]">
                        <Info className="h-6 w-6 text-black flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-black font-bold uppercase tracking-wider leading-relaxed">
                            <span className="font-black text-sm block mb-1">Importante</span> 
                            Se cargarán los nombres, códigos y correlatividades del plan oficial. Si ya tenés materias cargadas, esto podría crear duplicados.
                        </p>
                    </div>
                    <DialogFooter className="gap-3 sm:gap-0 pt-2">
                        <Button 
                            variant="outline" 
                            onClick={onClose} 
                            disabled={loading} 
                            className="px-6 rounded-xl border-[3px] border-foreground font-black uppercase tracking-widest shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:-translate-y-0.5 transition-all"
                        >
                            Cancelar
                        </Button>
                        <Button
                            className="bg-[#25d06c] text-black hover:bg-[#25d06c]/90 border-[3px] border-foreground font-black uppercase tracking-widest shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:-translate-y-0.5 transition-all px-8 rounded-xl"
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
