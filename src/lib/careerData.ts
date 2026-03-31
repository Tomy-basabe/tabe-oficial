export const AVAILABLE_FACULTADES = [
    { id: "UTN", label: "UTN FRM", fullLabel: "Universidad Tecnológica Nacional - FRM (UTN)" },
    { id: "UTN_FRC", label: "UTN FRC", fullLabel: "Universidad Tecnológica Nacional - FRC (UTN)" },
    { id: "UNCUYO", label: "UNCUYO", fullLabel: "Universidad Nacional de Cuyo (UNCUYO)" },
    { id: "DONBOSCO", label: "Don Bosco", fullLabel: "Facultad Don Bosco" },
    { id: "ITGC", label: "I.T.G.C.", fullLabel: "Instituto Tomás Godoy Cruz" },
    { id: "UNSJ", label: "UNSJ", fullLabel: "Universidad Nacional de San Juan (UNSJ)" },
    { id: "UNCUYO_FCPYS", label: "UNCUYO FCPyS", fullLabel: "Universidad Nacional de Cuyo - Fac. Cs. Políticas y Sociales" },
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
    // UNCUYO FCPyS
    { id: "gestion_politicas_publicas_fcpys", label: "Tecnicatura en Gestión de Políticas Públicas", file: "gestion_politicas_publicas_fcpys_template", facultad: "UNCUYO_FCPYS" },
    { id: "trabajo_social_fcpys", label: "Licenciatura en Trabajo Social", file: "trabajo_social_fcpys_template", facultad: "UNCUYO_FCPYS" },
    { id: "sociologia_fcpys", label: "Licenciatura en Sociología", file: "sociologia_fcpys_template", facultad: "UNCUYO_FCPYS" },
    { id: "ciencia_politica_fcpys", label: "Lic. en Ciencia Política y Adm. Pública", file: "ciencia_politica_fcpys_template", facultad: "UNCUYO_FCPYS" },
    { id: "comunicacion_social_fcpys", label: "Licenciatura en Comunicación Social", file: "comunicacion_social_fcpys_template", facultad: "UNCUYO_FCPYS" },
    { id: "tupa_fcpys", label: "Tecnicatura en Producción Audiovisual (TUPA)", file: "tupa_fcpys_template", facultad: "UNCUYO_FCPYS" },
    // Don Bosco
    { id: "licenciatura_enologia_donbosco", label: "Licenciatura en Enología", file: "licenciatura_enologia_donbosco_template", facultad: "DONBOSCO" },
    { id: "enologia_donbosco", label: "Tecnicatura en Enología", file: "enologia_donbosco_template", facultad: "DONBOSCO" },
    // Godoy Cruz
    { id: "profesorado_primaria_itgc", label: "Profesorado de Educación Primaria", file: "profesorado_primaria_godoy_cruz_template", facultad: "ITGC" },
    // UNSJ
    { id: "electromecanica_unsj", label: "Ingeniería Electromecánica", file: "electromecanica_unsj_template", facultad: "UNSJ" },
    { id: "mecanica_unsj", label: "Ingeniería Mecánica", file: "mecanica_unsj_template", facultad: "UNSJ" },
    { id: "mecanica_utn_frc", label: "Ingeniería Mecánica", file: "mecanica_utn_frc_template", facultad: "UTN_FRC" },
    { id: "energia_electrica_unsj", label: "Ingeniería en Energía Eléctrica", file: "energia_electrica_unsj_template", facultad: "UNSJ" },
    // Otros
    { id: "contactologia", label: "Tecnicatura en Contactología", file: "contactologia_template", facultad: "OTROS" },
];
