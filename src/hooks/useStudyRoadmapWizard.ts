import { useState, useCallback } from "react";
import {
  RoadmapWizardState,
  ExamDateOption,
  WizardTopicItem,
  StudyRoadmap,
  WizardEventOption,
} from "@/types/studyRoadmap";
import { generateRoadmapWithAI, saveStudyRoadmap } from "@/services/studyRoadmapService";
import { extractMaterial, MAX_FILES, MAX_FILE_MB } from "@/lib/materialExtractor";
import { extractNotionDocuments } from "@/lib/notionMaterialExtractor";
import { computeLevelPlan } from "@/lib/roadmapHeuristics";
import { toast } from "sonner";

const isoDate = (offsetDays: number) => new Date(Date.now() + offsetDays * 86400000).toISOString().split("T")[0];

const INITIAL_STATE: RoadmapWizardState = {
  step: 1,
  subjectId: null,
  subjectName: "",
  examDateOption: "proxima_semana",
  customExamDate: isoDate(7),
  eventId: null,
  eventLabel: "",
  targetMastery: 80,
  files: [],
  pastedText: "",
  selectedDocIds: [],
  selectedDocTitles: [],
  isProcessing: false,
  processingProgress: 5,
  processingStatusText: "Iniciando análisis...",
  generatedTopics: [],
  studyPreference: "practicar",
  materialChars: 0,
  subjectOnly: false,
  materialSections: [],
};

export function daysUntil(dateStr: string): number {
  const end = new Date(dateStr + "T23:59:59").getTime();
  return Math.max(0, Math.ceil((end - Date.now()) / 86400000));
}

export function useStudyRoadmapWizard(userId?: string, onComplete?: (roadmap: StudyRoadmap) => void) {
  const [state, setState] = useState<RoadmapWizardState>(INITIAL_STATE);

  const setStep = useCallback((step: RoadmapWizardState["step"]) => {
    setState((prev) => ({ ...prev, step }));
  }, []);

  const selectSubject = useCallback((subjectId: string | null, subjectName: string) => {
    setState((prev) => ({ ...prev, subjectId, subjectName, step: 2 }));
  }, []);

  /** Fecha rápida o personalizada */
  const selectExamDate = useCallback((option: ExamDateOption, customDate?: string) => {
    let dateStr = customDate || isoDate(7);
    if (option === "manana") dateStr = isoDate(1);
    else if (option === "2dias") dateStr = isoDate(2);
    else if (option === "proxima_semana") dateStr = isoDate(7);

    setState((prev) => ({
      ...prev,
      examDateOption: option,
      customExamDate: dateStr,
      eventId: null,
      eventLabel: "",
      // "personalizado" espera confirmación manual desde la UI
      step: option === "personalizado" ? prev.step : 3,
    }));
  }, []);

  /** Evento real del calendario del usuario (parcial, global, final...) */
  const selectEvent = useCallback((ev: WizardEventOption) => {
    setState((prev) => ({
      ...prev,
      examDateOption: "evento",
      customExamDate: ev.date,
      eventId: ev.id,
      eventLabel: ev.label,
      step: 3,
    }));
  }, []);

  const setTargetMastery = useCallback((targetMastery: number) => {
    setState((prev) => ({ ...prev, targetMastery }));
  }, []);

  const goToUploadStep = useCallback(() => {
    setState((prev) => ({ ...prev, step: 4 }));
  }, []);

  const addFiles = useCallback((incoming: File[]) => {
    setState((prev) => {
      const next = [...prev.files];
      let rejected = 0;
      for (const f of incoming) {
        if (f.size > MAX_FILE_MB * 1024 * 1024) {
          rejected++;
          continue;
        }
        if (next.some((x) => x.name === f.name && x.size === f.size)) continue;
        if (next.length >= MAX_FILES) {
          rejected++;
          continue;
        }
        next.push(f);
      }
      if (rejected > 0) {
        toast.warning(`${rejected} archivo(s) omitidos (máx. ${MAX_FILES} archivos de ${MAX_FILE_MB} MB).`);
      }
      return { ...prev, files: next };
    });
  }, []);

  const removeFile = useCallback((index: number) => {
    setState((prev) => ({ ...prev, files: prev.files.filter((_, i) => i !== index) }));
  }, []);

  const setPastedText = useCallback((text: string) => {
    setState((prev) => ({ ...prev, pastedText: text }));
  }, []);

  const toggleNotionDoc = useCallback((doc: { id: string; title: string }) => {
    setState((prev) => {
      const exists = prev.selectedDocIds.includes(doc.id);
      if (exists) {
        return {
          ...prev,
          selectedDocIds: prev.selectedDocIds.filter((id) => id !== doc.id),
          selectedDocTitles: prev.selectedDocTitles.filter((t) => t !== doc.title),
        };
      } else {
        return {
          ...prev,
          selectedDocIds: [...prev.selectedDocIds, doc.id],
          selectedDocTitles: [...prev.selectedDocTitles, doc.title],
        };
      }
    });
  }, []);

  const clearNotionDocs = useCallback(() => {
    setState((prev) => ({ ...prev, selectedDocIds: [], selectedDocTitles: [] }));
  }, []);

  const setStudyPreference = useCallback((studyPreference: "leer" | "podcast" | "practicar") => {
    setState((prev) => ({ ...prev, studyPreference }));
  }, []);

  const toggleTopic = useCallback((topicId: string) => {
    setState((prev) => ({
      ...prev,
      generatedTopics: prev.generatedTopics.map((t) => (t.id === topicId ? { ...t, selected: !t.selected } : t)),
    }));
  }, []);

  const patchProcessing = (progress: number, text: string) =>
    setState((prev) => ({ ...prev, processingProgress: progress, processingStatusText: text }));

  // Procesa TODO el material con IA (Paso 4 -> Paso 5 -> Paso 6)
  const processMaterialAndGenerate = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      step: 5,
      isProcessing: true,
      processingProgress: 5,
      processingStatusText: "Preparando tu material...",
    }));

    try {
      // 1. Extraer texto de archivos subidos y pegados
      const extraction = await extractMaterial(state.files, state.pastedText, (done, total, name) => {
        if (total > 0) {
          const pct = 5 + Math.round((done / total) * 30);
          patchProcessing(pct, name ? `Leyendo ${name} (${done + 1}/${total})...` : "Archivos leídos ✔");
        }
      });

      if (extraction.failed.length > 0) {
        toast.warning(`No se pudo leer: ${extraction.failed.slice(0, 3).join(", ")}${extraction.failed.length > 3 ? "…" : ""}`);
      }

      // 2. Extraer apuntes seleccionados de la app (con subpáginas recursivas y diagramas Mermaid)
      let combinedSections = [...extraction.sections];
      let combinedChars = extraction.totalChars;

      if (state.selectedDocIds.length > 0) {
        patchProcessing(
          38,
          `Leyendo ${state.selectedDocIds.length} apunte(s) de TABE, subpáginas y diagramas...`
        );
        const notionResult = await extractNotionDocuments(state.selectedDocIds, userId);
        if (notionResult.sections.length > 0) {
          combinedSections = [...combinedSections, ...notionResult.sections];
          combinedChars += notionResult.totalChars;
        }
      }

      // 3. Plan de niveles según volumen total de material + días + meta
      const daysLeft = daysUntil(state.customExamDate);
      const plan = computeLevelPlan({
        totalChars: combinedChars,
        daysLeft,
        targetMastery: state.targetMastery,
      });

      patchProcessing(
        55,
        plan.subjectOnly
          ? `Poco material: deduzco el temario de ${state.subjectName}...`
          : `Detecté ~${Math.round(combinedChars / 1000)}k caracteres → armando ${plan.target} niveles...`
      );

      // 4. IA personalizada (materia + evento + meta + preferencia + material real de archivos y apuntes)
      const levels = await generateRoadmapWithAI({
        ctx: {
          subjectName: state.subjectName || "Materia",
          eventLabel: state.eventLabel || undefined,
          examDate: state.customExamDate,
          daysLeft,
          targetMastery: state.targetMastery,
          studyPreference: state.studyPreference,
        },
        sections: combinedSections,
        plan,
      });

      patchProcessing(92, "Asignando a cada nivel tus apuntes y conceptos reales...");

      const stamp = Date.now();
      const topics: WizardTopicItem[] = levels.map((lvl) => ({
        id: `topic_${lvl.level}_${stamp}`,
        level: lvl.level,
        title: lvl.title,
        summary: lvl.summary,
        selected: true,
        keyTopics: lvl.keyTopics,
        sourceFiles: lvl.sourceFiles,
        excerpt: lvl.excerpt,
        estimatedMinutes: lvl.estimatedMinutes,
      }));

      setState((prev) => ({
        ...prev,
        isProcessing: false,
        processingProgress: 100,
        processingStatusText: "¡Ruta lista! 🚀",
        generatedTopics: topics,
        materialChars: combinedChars,
        subjectOnly: plan.subjectOnly,
        materialSections: [],
        step: 6,
      }));
    } catch (err: any) {
      console.error("[useStudyRoadmapWizard] Error procesando:", err);
      toast.error("No pudimos procesar el material. Revisá los archivos e intentá de nuevo.");
      setState((prev) => ({ ...prev, isProcessing: false, step: 4 }));
    }
  }, [
    state.files,
    state.pastedText,
    state.selectedDocIds,
    state.subjectName,
    state.customExamDate,
    state.targetMastery,
    state.studyPreference,
    state.eventLabel,
    userId,
  ]);

  // Confirmar temario y guardar la ruta final
  const finalizeRoadmap = useCallback(async () => {
    const selectedTopics = state.generatedTopics.filter((t) => t.selected);
    if (selectedTopics.length === 0) {
      toast.error("Selecciona al menos un nivel o tema para tu ruta.");
      return;
    }

    const finalLevels = selectedTopics.map((t, idx) => ({
      level: idx + 1,
      title: t.title,
      summary: t.summary,
      unlocked: idx === 0,
      completed: false,
      keyTopics: t.keyTopics,
      sourceFiles: t.sourceFiles,
      excerpt: t.excerpt,
      estimatedMinutes: t.estimatedMinutes,
    }));

    const newRoadmap: Omit<StudyRoadmap, "id" | "created_at" | "updated_at"> = {
      user_id: userId || "guest_user",
      subject_id: state.subjectId,
      subject_name: state.subjectName || "Mi Materia",
      exam_date: state.customExamDate,
      target_mastery: state.targetMastery,
      study_preference: state.studyPreference,
      roadmap_data: {
        roadmap: finalLevels,
        topicsCount: finalLevels.length,
        generatedAt: new Date().toISOString(),
        eventLabel: state.eventLabel || undefined,
        eventId: state.eventId,
        subjectOnly: state.subjectOnly,
        materialStats: {
          files: state.files.length + (state.pastedText.trim() ? 1 : 0),
          chars: state.materialChars,
          fileNames: state.files.map((f) => f.name),
          notionDocsCount: state.selectedDocIds.length,
          notionDocTitles: state.selectedDocTitles,
        },
      },
      current_level: 1,
      total_levels: finalLevels.length,
      completed_levels: 0,
    };

    try {
      const saved = await saveStudyRoadmap(newRoadmap);
      toast.success("¡Tu ruta de estudio personalizada está lista! 🎯");
      onComplete?.(saved);
    } catch (e) {
      toast.error("Error al guardar la ruta de estudio.");
    }
  }, [state, userId, onComplete]);

  const resetWizard = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    state,
    setStep,
    selectSubject,
    selectExamDate,
    selectEvent,
    setTargetMastery,
    goToUploadStep,
    addFiles,
    removeFile,
    setPastedText,
    toggleNotionDoc,
    clearNotionDocs,
    setStudyPreference,
    toggleTopic,
    processMaterialAndGenerate,
    finalizeRoadmap,
    resetWizard,
  };
}
