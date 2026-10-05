export interface StudyGuideSection {
  heading: string;
  content: string;
  keyPoints: string[];
}

export interface LevelQuizQuestion {
  pregunta: string;
  opciones: string[];
  correcta: number;
  explicacion: string;
  dificultad?: "Concepto Clave" | "Aplicación" | "Examen Riguroso";
}

export interface LevelFlashcard {
  question: string;
  answer: string;
  mastered?: boolean;
}

export interface PodcastChapter {
  heading: string;
  narration: string;
  keyTakeaway: string;
}

export interface PodcastScript {
  title: string;
  episodeNumber: number;
  estimatedMinutes: number;
  introduction: string;
  chapters: PodcastChapter[];
  conclusion: string;
  fullNarration: string;
}

export interface OralExamQuestion {
  id: string;
  pregunta: string;
  criterios: string[]; // Conceptos que el estudiante debe mencionar
  respuestaModelo: string;
  puntosClave: string[];
}

export interface OralAnswerEvaluation {
  preguntaId: string;
  puntaje: number; // 1 a 10
  aprobado: boolean;
  aspectosPositivos: string[];
  aspectosAMejorar: string[];
  feedbackOral: string;
}

export interface LevelStudyPack {
  studyGuide: {
    overview: string;
    sections: StudyGuideSection[];
    examTips: string[];
  };
  podcastScript: PodcastScript;
  flashcards: LevelFlashcard[];
  questions: LevelQuizQuestion[];
  oralQuestions: OralExamQuestion[];
}

export interface RoadmapLevel {
  level: number;
  title: string;
  summary: string;
  unlocked: boolean;
  completed: boolean;
  score?: number;
  /** Términos exactos del material que cubre el nivel (4-8) */
  keyTopics?: string[];
  /** Archivos del material de donde sale el nivel */
  sourceFiles?: string[];
  /** Fragmento real de los apuntes (hasta ~6000 chars) usado para estudio y desafíos */
  excerpt?: string;
  estimatedMinutes?: number;
  quizQuestions?: LevelQuizQuestion[];
  flashcards?: LevelFlashcard[];
  oralQuestions?: OralExamQuestion[];
  studyPack?: LevelStudyPack;
}

export type StudyPreference = "leer" | "podcast" | "practicar" | "escuchar";

export interface RoadmapData {
  roadmap: RoadmapLevel[];
  topicsCount?: number;
  generatedAt?: string;
  notesSummary?: string;
  /** Evento para el que se armó la ruta (ej: "Parcial 1 · 12/10") */
  eventLabel?: string;
  event_label?: string;
  eventId?: string | null;
  study_preference?: StudyPreference;
  source_files?: string[];
  /** true si el material era escaso y la IA dedujo el temario por el nombre de la materia */
  subjectOnly?: boolean;
  materialStats?: {
    files: number;
    chars: number;
    fileNames: string[];
    notionDocsCount?: number;
    notionDocTitles?: string[];
  };
}

export interface NotionDocOption {
  id: string;
  title: string;
  emoji?: string | null;
  subject_id?: string | null;
  parent_id?: string | null;
  updated_at?: string;
  subpagesCount?: number;
}

export interface StudyRoadmap {
  id: string;
  user_id: string;
  subject_id?: string | null;
  subject_name: string;
  exam_date: string;
  target_mastery: number; // e.g., 60, 75, 90, 100
  study_preference: StudyPreference;
  roadmap_data: RoadmapData;
  current_level: number;
  total_levels: number;
  completed_levels: number;
  created_at: string;
  updated_at: string;
}

export type ExamDateOption = "manana" | "2dias" | "proxima_semana" | "personalizado" | "evento";

export interface WizardTopicItem {
  id: string;
  level: number;
  title: string;
  summary: string;
  selected: boolean;
  keyTopics?: string[];
  sourceFiles?: string[];
  excerpt?: string;
  estimatedMinutes?: number;
}

/** Material ya leído (texto) de un archivo cargado */
export interface MaterialSection {
  source: string;
  text: string;
}

export interface WizardEventOption {
  id: string;
  label: string;
  date: string;
}

export interface RoadmapWizardState {
  step: 1 | 2 | 3 | 4 | 5 | 6;
  subjectId: string | null;
  subjectName: string;
  examDateOption: ExamDateOption;
  customExamDate: string;
  eventId: string | null;
  eventLabel: string;
  targetMastery: number;
  files: File[];
  pastedText: string;
  selectedDocIds: string[];
  selectedDocTitles: string[];
  isProcessing: boolean;
  processingProgress: number;
  processingStatusText: string;
  generatedTopics: WizardTopicItem[];
  studyPreference: "leer" | "podcast" | "practicar";
  materialChars: number;
  subjectOnly: boolean;
  materialSections: MaterialSection[];
}
