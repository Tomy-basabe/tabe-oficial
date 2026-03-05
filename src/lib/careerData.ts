export const AVAILABLE_FACULTADES = [
    { id: "UTN", label: "UTN", fullLabel: "Universidad Tecnológica Nacional (UTN)" },
    { id: "UNCUYO", label: "UNCUYO", fullLabel: "Universidad Nacional de Cuyo (UNCUYO)" },
    { id: "OTROS", label: "Otros Institutos", fullLabel: "Institutos / Tecnicaturas" },
];

export const AVAILABLE_CAREERS = [
    { id: "sistemas", label: "Ingeniería en Sistemas de Información", file: "sistemas_template", facultad: "UTN" },
    { id: "civil", label: "Ingeniería Civil (Plan 2023)", file: "civil_template", facultad: "UTN" },
    { id: "electromecanica", label: "Ingeniería Electromecánica (Plan 2023)", file: "electromecanica_template", facultad: "UTN" },
    { id: "quimica", label: "Ingeniería Química (Plan 2023)", file: "quimica_template", facultad: "UTN" },
    { id: "telecomunicaciones", label: "Ingeniería en Telecomunicaciones", file: "telecomunicaciones_template", facultad: "UTN" },
    { id: "electronica", label: "Ingeniería Electrónica (Plan 2023)", file: "electronica_template", facultad: "UTN" },
    // UNCUYO
    { id: "agronomia_uncuyo", label: "Ingeniería Agronómica", file: "agronomia_uncuyo_template", facultad: "UNCUYO" },
    // Otros
    { id: "contactologia", label: "Tecnicatura en Contactología", file: "contactologia_template", facultad: "OTROS" },
];
