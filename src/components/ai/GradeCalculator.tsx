
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calculator, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function GradeCalculator() {
    const [currentGrades, setCurrentGrades] = useState<string>("");
    const [targetAverage, setTargetAverage] = useState<string>("7"); // Promoción suele ser 7 u 8
    const [result, setResult] = useState<string | null>(null);

    const calculate = () => {
        const grades = currentGrades.split(",").map(g => parseFloat(g.trim())).filter(g => !isNaN(g));
        const target = parseFloat(targetAverage);

        if (grades.length === 0 || isNaN(target)) {
            setResult("Ingresá notas válidas.");
            return;
        }

        // Fórmula: (Sum(grades) + x) / (n + 1) = target
        // x = target * (n + 1) - Sum(grades)

        const currentSum = grades.reduce((a, b) => a + b, 0);
        const n = grades.length;
        const needed = target * (n + 1) - currentSum;

        if (needed > 10) {
            setResult(`Necesitás un ${needed.toFixed(1)}... ¡Imposible! 😱 Ya no llegás al promedio.`);
        } else if (needed < 1) {
            setResult("¡Ya estás sobrado! Incluso con un 1 llegás.");
        } else {
            setResult(`¡Necesitás sacar un **${needed.toFixed(1)}** en el próximo examen!`);
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/10 w-full mb-4">
                    <Calculator className="w-4 h-4 text-primary" />
                    Calc. Promedio
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-border/50">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-neon-cyan" />
                        Simulador de Notas
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Tus notas actuales (separadas por coma)</label>
                        <Input
                            placeholder="Ej: 7, 8.5, 6"
                            value={currentGrades}
                            onChange={(e) => setCurrentGrades(e.target.value)}
                            className="bg-secondary/50 border-border/50"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Promedio deseado (Ej: 7 para promocionar)</label>
                        <Input
                            type="number"
                            placeholder="7"
                            value={targetAverage}
                            onChange={(e) => setTargetAverage(e.target.value)}
                            className="bg-secondary/50 border-border/50"
                        />
                    </div>

                    <Button onClick={calculate} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                        Calcular
                    </Button>

                    {result && (
                        <div className={cn(
                            "p-4 rounded-lg mt-4 flex items-start gap-3 text-sm",
                            result.includes("Imposible") ? "bg-destructive/10 text-destructive" : "bg-neon-green/10 text-neon-green"
                        )}>
                            {result.includes("Imposible") ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
                            <div>{result.split(/\*\*(.*?)\*\*/).map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)}</div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
