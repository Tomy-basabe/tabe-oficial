// ================================================================================================
// CATÁLOGO CENTRALIZADO DE LOGOS OFICIALES DE UNIVERSIDADES Y FACULTADES (URLs DIRECTAS)
// ================================================================================================
// 💡 CÓMO MODIFICAR O CAMBIAR LA DIRECCIÓN DE IMAGEN DE CUALQUIER UNIVERSIDAD:
// 1. Presiona Ctrl + F en este archivo y busca el nombre o sigla (ej: "IUCBC", "UTN", "UNCUYO", "UBA").
// 2. Modifica el campo 'logoUrl' pegando la URL directa de la imagen oficial (https://...).
// 3. RECOMENDACIÓN: Prioriza URLs de imágenes cuadradas (1:1), isotipos o escudos oficiales.
// ================================================================================================

export interface UniversityLogoItem {
  id: string;
  label: string;
  name: string;
  provinciaId: string;
  logoUrl: string;
}

export const UNIVERSITY_LOGOS: Record<string, UniversityLogoItem> = {
  // UTN FRM — Universidad Tecnológica Nacional - FRM (Mendoza) (MENDOZA)
  "UTN": {
    id: "UTN",
    label: "UTN FRM",
    name: "Universidad Tecnológica Nacional - FRM (Mendoza)",
    provinciaId: "MENDOZA",
    logoUrl: "/universities/utn.png",
  },

  // UTN FRSR — Universidad Tecnológica Nacional - FRSR (San Rafael) (MENDOZA)
  "UTN_FRSR": {
    id: "UTN_FRSR",
    label: "UTN FRSR",
    name: "Universidad Tecnológica Nacional - FRSR (San Rafael)",
    provinciaId: "MENDOZA",
    logoUrl: "/universities/utn.png",
  },

  // UNCUYO — Universidad Nacional de Cuyo (Mendoza) (MENDOZA)
  "UNCUYO": {
    id: "UNCUYO",
    label: "UNCUYO",
    name: "Universidad Nacional de Cuyo (Mendoza)",
    provinciaId: "MENDOZA",
    logoUrl: "/universities/uncuyo.png",
  },

  // UNCUYO FCPyS — Universidad Nacional de Cuyo - Fac. Cs. Políticas y Sociales (MENDOZA)
  "UNCUYO_FCPYS": {
    id: "UNCUYO_FCPYS",
    label: "UNCUYO FCPyS",
    name: "Universidad Nacional de Cuyo - Fac. Cs. Políticas y Sociales",
    provinciaId: "MENDOZA",
    logoUrl: "/universities/uncuyo.png",
  },

  // Univ. Mendoza — Universidad de Mendoza (UM) (MENDOZA)
  "UMENDOZA": {
    id: "UMENDOZA",
    label: "Univ. Mendoza",
    name: "Universidad de Mendoza (UM)",
    provinciaId: "MENDOZA",
    logoUrl: "/universities/umendoza.png",
  },

  // Univ. Maza — Universidad Juan Agustín Maza (UMaza) (MENDOZA)
  "UMAZA": {
    id: "UMAZA",
    label: "Univ. Maza",
    name: "Universidad Juan Agustín Maza (UMaza)",
    provinciaId: "MENDOZA",
    logoUrl: "/universities/umaza.png",
  },

  // Univ. Congreso — Universidad de Congreso (UC) (MENDOZA)
  "UCONGRESO": {
    id: "UCONGRESO",
    label: "Univ. Congreso",
    name: "Universidad de Congreso (UC)",
    provinciaId: "MENDOZA",
    logoUrl: "/universities/ucongreso.svg",
  },

  // Univ. Aconcagua — Universidad del Aconcagua (UDA) (MENDOZA)
  "UDA": {
    id: "UDA",
    label: "Univ. Aconcagua",
    name: "Universidad del Aconcagua (UDA)",
    provinciaId: "MENDOZA",
    logoUrl: "/universities/uda.png",
  },

  // Univ. Champagnat — Universidad Champagnat (UCH) (MENDOZA)
  "UCHAMPAGNAT": {
    id: "UCHAMPAGNAT",
    label: "Univ. Champagnat",
    name: "Universidad Champagnat (UCH)",
    provinciaId: "MENDOZA",
    logoUrl: "/universities/uchampagnat.svg",
  },

  // UCA Mendoza — Universidad Católica Argentina - Sede Mendoza (UCA) (MENDOZA)
  "UCA": {
    id: "UCA",
    label: "UCA Mendoza",
    name: "Universidad Católica Argentina - Sede Mendoza (UCA)",
    provinciaId: "MENDOZA",
    logoUrl: "/universities/uca.png",
  },

  // Siglo 21 Mendoza — Universidad Siglo 21 (Centro Mendoza) (MENDOZA)
  "UES21": {
    id: "UES21",
    label: "Siglo 21 Mendoza",
    name: "Universidad Siglo 21 (Centro Mendoza)",
    provinciaId: "MENDOZA",
    logoUrl: "/universities/ues21.svg",
  },

  // Don Bosco — Facultad Don Bosco (Mendoza) (MENDOZA)
  "DONBOSCO": {
    id: "DONBOSCO",
    label: "Don Bosco",
    name: "Facultad Don Bosco (Mendoza)",
    provinciaId: "MENDOZA",
    logoUrl: "/universities/don-bosco.jpg",
  },

  // I.T.G.C. 9-002 — Instituto Tomás Godoy Cruz (IES 9-002) (MENDOZA)
  "ITGC": {
    id: "ITGC",
    label: "I.T.G.C. 9-002",
    name: "Instituto Tomás Godoy Cruz (IES 9-002)",
    provinciaId: "MENDOZA",
    logoUrl: "/universities/ies-tomas-godoy-cruz.jpg",
  },

  // INSUTEC 9-019 — Instituto Superior Tecnológico N° 9-019 (INSUTEC) (MENDOZA)
  "INSUTEC": {
    id: "INSUTEC",
    label: "INSUTEC 9-019",
    name: "Instituto Superior Tecnológico N° 9-019 (INSUTEC)",
    provinciaId: "MENDOZA",
    logoUrl: "https://www.insutec.edu.ar/wp-content/uploads/2025/03/logo.png",
  },

  // IES 9-008 Belgrano — IES N° 9-008 Manuel Belgrano (Mendoza) (MENDOZA)
  "IES_BELGRANO": {
    id: "IES_BELGRANO",
    label: "IES 9-008 Belgrano",
    name: "IES N° 9-008 Manuel Belgrano (Mendoza)",
    provinciaId: "MENDOZA",
    logoUrl: "/universities/insutec.png",
  },

  // IES 9-023 Maipú — IES N° 9-023 Maipú (Mendoza) (MENDOZA)
  "IES_MAIPU": {
    id: "IES_MAIPU",
    label: "IES 9-023 Maipú",
    name: "IES N° 9-023 Maipú (Mendoza)",
    provinciaId: "MENDOZA",
    logoUrl: "https://ies9023-infd.mendoza.edu.ar/sitio/wp-content/uploads/2024/09/ies-blanco.png",
  },

  // UNSJ — Universidad Nacional de San Juan (UNSJ) (SAN_JUAN)
  "UNSJ": {
    id: "UNSJ",
    label: "UNSJ",
    name: "Universidad Nacional de San Juan (UNSJ)",
    provinciaId: "SAN_JUAN",
    logoUrl: "/universities/unsj.png",
  },

  // UCCuyo — Universidad Católica de Cuyo (UCCuyo) (SAN_JUAN)
  "UCCUYO": {
    id: "UCCUYO",
    label: "UCCuyo",
    name: "Universidad Católica de Cuyo (UCCuyo)",
    provinciaId: "SAN_JUAN",
    logoUrl: "https://www.uccuyo.edu.ar/images/logo_uccuyo.png",
  },

  // Univ. Congreso (San Juan) — Universidad de Congreso - Sede San Juan (UC) (SAN_JUAN)
  "UCONGRESO_SJ": {
    id: "UCONGRESO_SJ",
    label: "Univ. Congreso (San Juan)",
    name: "Universidad de Congreso - Sede San Juan (UC)",
    provinciaId: "SAN_JUAN",
    logoUrl: "https://www.ucongreso.edu.ar/wp-content/themes/ucongreso/images/logo.svg",
  },

  // UNC — Universidad Nacional de Córdoba (UNC) (CORDOBA)
  "UNC_CBA": {
    id: "UNC_CBA",
    label: "UNC",
    name: "Universidad Nacional de Córdoba (UNC)",
    provinciaId: "CORDOBA",
    logoUrl: "https://www.unc.edu.ar/sites/all/themes/unc/images/2025/logo-mobile.svg",
  },

  // UTN FRC — Universidad Tecnológica Nacional - FRC (Córdoba) (CORDOBA)
  "UTN_FRC": {
    id: "UTN_FRC",
    label: "UTN FRC",
    name: "Universidad Tecnológica Nacional - FRC (Córdoba)",
    provinciaId: "CORDOBA",
    logoUrl: "/universities/utn.png",
  },

  // UTN San Francisco — Universidad Tecnológica Nacional - FRSF (San Francisco) (CORDOBA)
  "UTN_FRSF_CBA": {
    id: "UTN_FRSF_CBA",
    label: "UTN San Francisco",
    name: "Universidad Tecnológica Nacional - FRSF (San Francisco)",
    provinciaId: "CORDOBA",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/67/UTN_logo.jpg",
  },

  // UTN Villa María — Universidad Tecnológica Nacional - FRVM (Villa María) (CORDOBA)
  "UTN_FRVM": {
    id: "UTN_FRVM",
    label: "UTN Villa María",
    name: "Universidad Tecnológica Nacional - FRVM (Villa María)",
    provinciaId: "CORDOBA",
    logoUrl: "/universities/utn.png",
  },

  // UNRC — Universidad Nacional de Río Cuarto (UNRC) (CORDOBA)
  "UNRC": {
    id: "UNRC",
    label: "UNRC",
    name: "Universidad Nacional de Río Cuarto (UNRC)",
    provinciaId: "CORDOBA",
    logoUrl: "https://www.unrc.edu.ar/imgs/escudo-m.svg",
  },

  // UNVM — Universidad Nacional de Villa María (UNVM) (CORDOBA)
  "UNVM": {
    id: "UNVM",
    label: "UNVM",
    name: "Universidad Nacional de Villa María (UNVM)",
    provinciaId: "CORDOBA",
    logoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c7/Isologotipo_de_la_Universidad_Nacional_de_Villa_Mar%C3%ADa.png/330px-Isologotipo_de_la_Universidad_Nacional_de_Villa_Mar%C3%ADa.png",
  },

  // UCC — Universidad Católica de Córdoba (UCC) (CORDOBA)
  "UCC_CBA": {
    id: "UCC_CBA",
    label: "UCC",
    name: "Universidad Católica de Córdoba (UCC)",
    provinciaId: "CORDOBA",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UCC-LOGO-1.png",
  },

  // Blas Pascal — Universidad Blas Pascal (UBP) (CORDOBA)
  "UBP": {
    id: "UBP",
    label: "Blas Pascal",
    name: "Universidad Blas Pascal (UBP)",
    provinciaId: "CORDOBA",
    logoUrl: "https://www.ubp.edu.ar/wp-content/themes/ubp_nuevo/images/logo-ubp.png",
  },

  // Siglo 21 Córdoba — Universidad Siglo 21 (Sede Central Córdoba) (CORDOBA)
  "UES21_CBA": {
    id: "UES21_CBA",
    label: "Siglo 21 Córdoba",
    name: "Universidad Siglo 21 (Sede Central Córdoba)",
    provinciaId: "CORDOBA",
    logoUrl: "/universities/ues21.svg",
  },

  // IUA — Instituto Universitario Aeronáutico (IUA - UNDEF) (CORDOBA)
  "IUA": {
    id: "IUA",
    label: "IUA",
    name: "Instituto Universitario Aeronáutico (IUA - UNDEF)",
    provinciaId: "CORDOBA",
    logoUrl: "https://www.iua.edu.ar/wp-content/uploads/sites/6/2026/02/nuevo-logo.png",
  },

  // IUCBC — Instituto Universitario de Ciencias Biomédicas de Córdoba (IUCBC) (CORDOBA)
  "IUCBC": {
    id: "IUCBC",
    label: "IUCBC",
    name: "Instituto Universitario de Ciencias Biomédicas de Córdoba (IUCBC)",
    provinciaId: "CORDOBA",
    logoUrl: "https://iucbc.edu.ar/frontend/images/favicon/apple-touch-icon.png",
  },

  // UNLP — Universidad Nacional de La Plata (UNLP) (BUENOS_AIRES)
  "UNLP": {
    id: "UNLP",
    label: "UNLP",
    name: "Universidad Nacional de La Plata (UNLP)",
    provinciaId: "BUENOS_AIRES",
    logoUrl: "/universities/unlp.png",
  },

  // UTN Prov. Bs. As. — UTN - Reg. La Plata / Pacheco / Delta / Haedo (BUENOS_AIRES)
  "UTN_FRBA_PROV": {
    id: "UTN_FRBA_PROV",
    label: "UTN Prov. Bs. As.",
    name: "UTN - Reg. La Plata / Pacheco / Delta / Haedo",
    provinciaId: "BUENOS_AIRES",
    logoUrl: "/universities/utn.png",
  },

  // UNLaM — Universidad Nacional de La Matanza (UNLaM) (BUENOS_AIRES)
  "UNLAM": {
    id: "UNLAM",
    label: "UNLaM",
    name: "Universidad Nacional de La Matanza (UNLaM)",
    provinciaId: "BUENOS_AIRES",
    logoUrl: "https://www.unlam.edu.ar/wp-content/uploads/2024/10/logo-unlam-negro-300x68.png",
  },

  // UNMdP — Universidad Nacional de Mar del Plata (UNMdP) (BUENOS_AIRES)
  "UNMDP": {
    id: "UNMDP",
    label: "UNMdP",
    name: "Universidad Nacional de Mar del Plata (UNMdP)",
    provinciaId: "BUENOS_AIRES",
    logoUrl: "https://www.mdp.edu.ar/templates/unmdp/img/LOGO-UNMDP-50-GOLPE.svg",
  },

  // UNS — Universidad Nacional del Sur (UNS) (BUENOS_AIRES)
  "UNS": {
    id: "UNS",
    label: "UNS",
    name: "Universidad Nacional del Sur (UNS)",
    provinciaId: "BUENOS_AIRES",
    logoUrl: "https://www.uns.edu.ar/img/escudo_gris.png",
  },

  // UNSAM — Universidad Nacional de San Martín (UNSAM) (BUENOS_AIRES)
  "UNSAM": {
    id: "UNSAM",
    label: "UNSAM",
    name: "Universidad Nacional de San Martín (UNSAM)",
    provinciaId: "BUENOS_AIRES",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/3/32/UNSAM-logo.jpg",
  },

  // UNQ — Universidad Nacional de Quilmes (UNQ) (BUENOS_AIRES)
  "UNQ": {
    id: "UNQ",
    label: "UNQ",
    name: "Universidad Nacional de Quilmes (UNQ)",
    provinciaId: "BUENOS_AIRES",
    logoUrl: "https://www.unq.edu.ar/wp-content/uploads/2023/10/Identidad-UNQ-CB-v2.png",
  },

  // UBA — Universidad de Buenos Aires (UBA) (CABA)
  "UBA": {
    id: "UBA",
    label: "UBA",
    name: "Universidad de Buenos Aires (UBA)",
    provinciaId: "CABA",
    logoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f9/UBA.svg/langes-330px-UBA.svg.png",
  },

  // UTN FRBA — Universidad Tecnológica Nacional - FRBA (CABA) (CABA)
  "UTN_FRBA": {
    id: "UTN_FRBA",
    label: "UTN FRBA",
    name: "Universidad Tecnológica Nacional - FRBA (CABA)",
    provinciaId: "CABA",
    logoUrl: "/universities/utn.png",
  },

  // ITBA — Instituto Tecnológico de Buenos Aires (ITBA) (CABA)
  "ITBA": {
    id: "ITBA",
    label: "ITBA",
    name: "Instituto Tecnológico de Buenos Aires (ITBA)",
    provinciaId: "CABA",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UADE-LOGO-1.png",
  },

  // UADE — Universidad Argentina de la Empresa (UADE) (CABA)
  "UADE": {
    id: "UADE",
    label: "UADE",
    name: "Universidad Argentina de la Empresa (UADE)",
    provinciaId: "CABA",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UADE-LOGO-1.png",
  },

  // UCA — Universidad Católica Argentina (UCA) (CABA)
  "UCA_CABA": {
    id: "UCA_CABA",
    label: "UCA",
    name: "Universidad Católica Argentina (UCA)",
    provinciaId: "CABA",
    logoUrl: "/universities/uca.png",
  },

  // UDESA — Universidad de San Andrés (UDESA) (CABA)
  "UDESA": {
    id: "UDESA",
    label: "UDESA",
    name: "Universidad de San Andrés (UDESA)",
    provinciaId: "CABA",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UDESA-LOGO-1.png",
  },

  // UTDT — Universidad Torcuato Di Tella (UTDT) (CABA)
  "UTDT": {
    id: "UTDT",
    label: "UTDT",
    name: "Universidad Torcuato Di Tella (UTDT)",
    provinciaId: "CABA",
    logoUrl: "https://www.utdt.edu/Images/ui2014/logo.png",
  },

  // UNR — Universidad Nacional de Rosario (UNR) (SANTA_FE)
  "UNR": {
    id: "UNR",
    label: "UNR",
    name: "Universidad Nacional de Rosario (UNR)",
    provinciaId: "SANTA_FE",
    logoUrl: "https://unr.edu.ar/wp-content/uploads/2021/12/cropped-logo-contorno-uiversidad-blanco-fondo-transp-2.png",
  },

  // UNL — Universidad Nacional del Litoral (UNL) (SANTA_FE)
  "UNL": {
    id: "UNL",
    label: "UNL",
    name: "Universidad Nacional del Litoral (UNL)",
    provinciaId: "SANTA_FE",
    logoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/49/Unl.JPG/330px-Unl.JPG",
  },

  // UTN Rosario — UTN - Facultad Regional Rosario (FRRO) (SANTA_FE)
  "UTN_FRRO": {
    id: "UTN_FRRO",
    label: "UTN Rosario",
    name: "UTN - Facultad Regional Rosario (FRRO)",
    provinciaId: "SANTA_FE",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/67/UTN_logo.jpg",
  },

  // UTN Santa Fe — UTN - Facultad Regional Santa Fe (FRSF) (SANTA_FE)
  "UTN_FRSF": {
    id: "UTN_FRSF",
    label: "UTN Santa Fe",
    name: "UTN - Facultad Regional Santa Fe (FRSF)",
    provinciaId: "SANTA_FE",
    logoUrl: "/universities/utn.png",
  },

  // UNT — Universidad Nacional de Tucumán (UNT) (TUCUMAN)
  "UNT": {
    id: "UNT",
    label: "UNT",
    name: "Universidad Nacional de Tucumán (UNT)",
    provinciaId: "TUCUMAN",
    logoUrl: "https://www.unt.edu.ar/wp-content/themes/uvd-unt/assets/img/logo.png",
  },

  // UTN Tucumán — UTN - Facultad Regional Tucumán (FRT) (TUCUMAN)
  "UTN_FRT": {
    id: "UTN_FRT",
    label: "UTN Tucumán",
    name: "UTN - Facultad Regional Tucumán (FRT)",
    provinciaId: "TUCUMAN",
    logoUrl: "/universities/utn.png",
  },

  // UNER — Universidad Nacional de Entre Ríos (UNER) (ENTRE_RIOS)
  "UNER": {
    id: "UNER",
    label: "UNER",
    name: "Universidad Nacional de Entre Ríos (UNER)",
    provinciaId: "ENTRE_RIOS",
    logoUrl: "https://uner.edu.ar/wp-content/uploads/2025/02/logo-original.png",
  },

  // UNSa — Universidad Nacional de Salta (UNSa) (SALTA)
  "UNSA": {
    id: "UNSA",
    label: "UNSa",
    name: "Universidad Nacional de Salta (UNSa)",
    provinciaId: "SALTA",
    logoUrl: "https://www.unsa.edu.ar/wp-content/uploads/2025/06/cropped-Universidad_Nacional_de_Salta_-_Logo_Azul-sf.png",
  },

  // UNNE — Universidad Nacional del Nordeste (UNNE) (CHACO)
  "UNNE": {
    id: "UNNE",
    label: "UNNE",
    name: "Universidad Nacional del Nordeste (UNNE)",
    provinciaId: "CHACO",
    logoUrl: "https://images.seeklogo.com/logo-png/29/1/universidad-nacional-del-nordeste-logo-png_seeklogo-293999.png",
  },

  // UNaM — Universidad Nacional de Misiones (UNaM) (MISIONES)
  "UNAM": {
    id: "UNAM",
    label: "UNaM",
    name: "Universidad Nacional de Misiones (UNaM)",
    provinciaId: "MISIONES",
    logoUrl: "https://www.unam.edu.ar/images/LOGOS/LOGO-HOME.png",
  },

  // UNSE — Universidad Nacional de Santiago del Estero (UNSE) (SANTIAGO_ESTERO)
  "UNSE": {
    id: "UNSE",
    label: "UNSE",
    name: "Universidad Nacional de Santiago del Estero (UNSE)",
    provinciaId: "SANTIAGO_ESTERO",
    logoUrl: "http://fcf.unse.edu.ar/archivos/interno/logos/logo-unse.png",
  },

  // UNSL — Universidad Nacional de San Luis (UNSL) (SAN_LUIS)
  "UNSL": {
    id: "UNSL",
    label: "UNSL",
    name: "Universidad Nacional de San Luis (UNSL)",
    provinciaId: "SAN_LUIS",
    logoUrl: "https://www.unsl.edu.ar/assets/imagenes/logos/logo-unsl-color.png",
  },

  // UNViMe — Universidad Nacional de Villa Mercedes (UNViMe) (SAN_LUIS)
  "UNVIME": {
    id: "UNVIME",
    label: "UNViMe",
    name: "Universidad Nacional de Villa Mercedes (UNViMe)",
    provinciaId: "SAN_LUIS",
    logoUrl: "https://i0.wp.com/www.unvime.edu.ar/wp-content/uploads/2025/08/ESCUDO-UNViMe-BLANCO.png?ssl=1",
  },

  // UNLC — Universidad Nacional de los Comechingones (UNLC - Merlo) (SAN_LUIS)
  "UNLC": {
    id: "UNLC",
    label: "UNLC",
    name: "Universidad Nacional de los Comechingones (UNLC - Merlo)",
    provinciaId: "SAN_LUIS",
    logoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/81/Logo_Universidad_Nacional_de_los_Comechingones.jpg/330px-Logo_Universidad_Nacional_de_los_Comechingones.jpg",
  },

  // ULP — Universidad de La Punta (ULP) (SAN_LUIS)
  "ULP": {
    id: "ULP",
    label: "ULP",
    name: "Universidad de La Punta (ULP)",
    provinciaId: "SAN_LUIS",
    logoUrl: "https://images.seeklogo.com/logo-png/19/1/universidad-de-la-punta-logo-png_seeklogo-199402.png",
  },

  // UCCuyo San Luis — Universidad Católica de Cuyo (Sede San Luis) (SAN_LUIS)
  "UCCUYO_SL": {
    id: "UCCUYO_SL",
    label: "UCCuyo San Luis",
    name: "Universidad Católica de Cuyo (Sede San Luis)",
    provinciaId: "SAN_LUIS",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UCC-LOGO-1.png",
  },

  // UNCo — Universidad Nacional del Comahue (UNCo) (NEUQUEN)
  "UNCO": {
    id: "UNCO",
    label: "UNCo",
    name: "Universidad Nacional del Comahue (UNCo)",
    provinciaId: "NEUQUEN",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/2/24/Logo_Facultad_de_Ingenier%C3%ADa_UNCo.png",
  },

  // UNRN — Universidad Nacional de Río Negro (UNRN) (RIO_NEGRO)
  "UNRN": {
    id: "UNRN",
    label: "UNRN",
    name: "Universidad Nacional de Río Negro (UNRN)",
    provinciaId: "RIO_NEGRO",
    logoUrl: "https://www.unrn.edu.ar/images/logo/header_logo_unrn_negro.svg",
  },

  // UNPSJB — Univ. Nacional de la Patagonia San Juan Bosco (CHUBUT)
  "UNPSJB": {
    id: "UNPSJB",
    label: "UNPSJB",
    name: "Univ. Nacional de la Patagonia San Juan Bosco",
    provinciaId: "CHUBUT",
    logoUrl: "https://upload.wikimedia.org/wikipedia/en/2/23/UNPSJB_logo.jpg",
  },

  // UNPA — Universidad Nacional de la Patagonia Austral (SANTA_CRUZ)
  "UNPA": {
    id: "UNPA",
    label: "UNPA",
    name: "Universidad Nacional de la Patagonia Austral",
    provinciaId: "SANTA_CRUZ",
    logoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/92/Logo_oficial_UNPA.jpg/330px-Logo_oficial_UNPA.jpg",
  },

  // UNTDF — Universidad Nacional de Tierra del Fuego (TIERRA_FUEGO)
  "UNTDF": {
    id: "UNTDF",
    label: "UNTDF",
    name: "Universidad Nacional de Tierra del Fuego",
    provinciaId: "TIERRA_FUEGO",
    logoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fb/Untflogo.jpg/330px-Untflogo.jpg",
  },

  // UNLPam — Universidad Nacional de La Pampa (UNLPam) (LA_PAMPA)
  "UNLPAM": {
    id: "UNLPAM",
    label: "UNLPam",
    name: "Universidad Nacional de La Pampa (UNLPam)",
    provinciaId: "LA_PAMPA",
    logoUrl: "https://www.unlpam.edu.ar/images/Logo.png",
  },

  // UNLaR — Universidad Nacional de La Rioja (UNLaR) (LA_RIOJA)
  "UNLAR": {
    id: "UNLAR",
    label: "UNLaR",
    name: "Universidad Nacional de La Rioja (UNLaR)",
    provinciaId: "LA_RIOJA",
    logoUrl: "https://ingreso.unlar.edu.ar/UNLAR_VERTICAL.png",
  },

  // UNCA — Universidad Nacional de Catamarca (UNCA) (CATAMARCA)
  "UNCA": {
    id: "UNCA",
    label: "UNCA",
    name: "Universidad Nacional de Catamarca (UNCA)",
    provinciaId: "CATAMARCA",
    logoUrl: "https://images.seeklogo.com/logo-png/53/1/unca-logo-png_seeklogo-533315.png",
  },

  // UNJu — Universidad Nacional de Jujuy (UNJu) (JUJUY)
  "UNJU": {
    id: "UNJU",
    label: "UNJu",
    name: "Universidad Nacional de Jujuy (UNJu)",
    provinciaId: "JUJUY",
    logoUrl: "https://images.seeklogo.com/logo-png/18/1/universidad-nacional-de-jujuy-logo-png_seeklogo-180186.png",
  },

  // UNF — Universidad Nacional de Formosa (UNF) (FORMOSA)
  "UNF": {
    id: "UNF",
    label: "UNF",
    name: "Universidad Nacional de Formosa (UNF)",
    provinciaId: "FORMOSA",
    logoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fa/UNaFLogoI.jpg/330px-UNaFLogoI.jpg",
  },

  // UA — Universidad Austral (UA) (BUENOS_AIRES)
  "UA_BSAS": {
    id: "UA_BSAS",
    label: "UA",
    name: "Universidad Austral (UA)",
    provinciaId: "BUENOS_AIRES",
    logoUrl: "https://www.austral.edu.ar/wp-content/uploads/2022/09/logo-md-austral-1.png",
  },

  // UP — Universidad de Palermo (UP) (BUENOS_AIRES)
  "UP_BSAS": {
    id: "UP_BSAS",
    label: "UP",
    name: "Universidad de Palermo (UP)",
    provinciaId: "BUENOS_AIRES",
    logoUrl: "https://www.palermo.edu/images/header/logo.png",
  },

  // UNCAUS — Universidad Nacional del Chaco Austral (UNCAUS) (CHACO)
  "UNCAUS_CHACO": {
    id: "UNCAUS_CHACO",
    label: "UNCAUS",
    name: "Universidad Nacional del Chaco Austral (UNCAUS)",
    provinciaId: "CHACO",
    logoUrl: "https://uncaus.edu.ar/wp-content/uploads/2021/04/logo-uncaus-web.png",
  },

  // UTN FRRe — Universidad Tecnologica Nacional - Facultad Regional Resistencia (UTN FRRe) (CHACO)
  "UTNFRRE_CHACO": {
    id: "UTNFRRE_CHACO",
    label: "UTN FRRe",
    name: "Universidad Tecnologica Nacional - Facultad Regional Resistencia (UTN FRRe)",
    provinciaId: "CHACO",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/67/UTN_logo.jpg",
  },

  // UCP — Universidad de la Cuenca del Plata (UCP) (CHACO)
  "UCP_CHACO": {
    id: "UCP_CHACO",
    label: "UCP",
    name: "Universidad de la Cuenca del Plata (UCP)",
    provinciaId: "CHACO",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UCP-LOGO-1.png",
  },

  // UCES — Universidad de Ciencias Empresariales y Sociales (UCES) (CHACO)
  "UCES_CHACO": {
    id: "UCES_CHACO",
    label: "UCES",
    name: "Universidad de Ciencias Empresariales y Sociales (UCES)",
    provinciaId: "CHACO",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UCES-LOGO-1.png",
  },

  // UCASAL — Universidad Catolica de Salta (UCASAL) (CHACO)
  "UCASAL_CHACO": {
    id: "UCASAL_CHACO",
    label: "UCASAL",
    name: "Universidad Catolica de Salta (UCASAL)",
    provinciaId: "CHACO",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UCASAL-LOGO-1.png",
  },

  // UF — Universidad FASTA (UF) (CHACO)
  "UF_CHACO": {
    id: "UF_CHACO",
    label: "UF",
    name: "Universidad FASTA (UF)",
    provinciaId: "CHACO",
    logoUrl: "https://images.seeklogo.com/logo-png/49/2/fasta-logo-png_seeklogo-495482.png",
  },

  // UDC — Universidad del Chubut (UDC) (CHUBUT)
  "UDC_CHU": {
    id: "UDC_CHU",
    label: "UDC",
    name: "Universidad del Chubut (UDC)",
    provinciaId: "CHUBUT",
    logoUrl: "https://udc.edu.ar/wp-content/uploads/2025/05/UDC-ISOLOGO.png",
  },

  // UTN FRCh — Universidad Tecnologica Nacional - Facultad Regional del Chubut (UTN FRCh) (CHUBUT)
  "UTNFRCH_CHU": {
    id: "UTNFRCH_CHU",
    label: "UTN FRCh",
    name: "Universidad Tecnologica Nacional - Facultad Regional del Chubut (UTN FRCh)",
    provinciaId: "CHUBUT",
    logoUrl: "/universities/utn.png",
  },

  // UNNE — Universidad Nacional del Nordeste (UNNE) (CORRIENTES)
  "UNNE_CTES": {
    id: "UNNE_CTES",
    label: "UNNE",
    name: "Universidad Nacional del Nordeste (UNNE)",
    provinciaId: "CORRIENTES",
    logoUrl: "https://images.seeklogo.com/logo-png/29/1/universidad-nacional-del-nordeste-logo-png_seeklogo-293999.png",
  },

  // UCP — Universidad de la Cuenca del Plata (UCP) (CORRIENTES)
  "UCP_CTES": {
    id: "UCP_CTES",
    label: "UCP",
    name: "Universidad de la Cuenca del Plata (UCP)",
    provinciaId: "CORRIENTES",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UCP-LOGO-1.png",
  },

  // Fund. Barceló — Instituto Universitario de Ciencias de la Salud Fundacion H.A. Barcelo (CORRIENTES)
  "BARCELO_CTES": {
    id: "BARCELO_CTES",
    label: "Fund. Barceló",
    name: "Instituto Universitario de Ciencias de la Salud Fundacion H.A. Barcelo",
    provinciaId: "CORRIENTES",
    logoUrl: "https://barcelo.edu.ar/barcelo.svg",
  },

  // USAL — Universidad del Salvador (USAL) (CORRIENTES)
  "USAL_CTES": {
    id: "USAL_CTES",
    label: "USAL",
    name: "Universidad del Salvador (USAL)",
    provinciaId: "CORRIENTES",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UB-LOGO-1.png",
  },

  // UADER — Universidad Autonoma de Entre Rios (UADER) (ENTRE_RIOS)
  "UADER_ER": {
    id: "UADER_ER",
    label: "UADER",
    name: "Universidad Autonoma de Entre Rios (UADER)",
    provinciaId: "ENTRE_RIOS",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/64/Logo-uader-fcvys.png",
  },

  // UTN — Universidad Tecnologica Nacional (UTN) (ENTRE_RIOS)
  "UTN_ER": {
    id: "UTN_ER",
    label: "UTN",
    name: "Universidad Tecnologica Nacional (UTN)",
    provinciaId: "ENTRE_RIOS",
    logoUrl: "/universities/utn.png",
  },

  // UCU — Universidad de Concepcion del Uruguay (UCU) (ENTRE_RIOS)
  "UCU_ER": {
    id: "UCU_ER",
    label: "UCU",
    name: "Universidad de Concepcion del Uruguay (UCU)",
    provinciaId: "ENTRE_RIOS",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UCU-LOGO-1.png",
  },

  // UAP — Universidad Adventista del Plata (UAP) (ENTRE_RIOS)
  "UAP_ER": {
    id: "UAP_ER",
    label: "UAP",
    name: "Universidad Adventista del Plata (UAP)",
    provinciaId: "ENTRE_RIOS",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UCU-LOGO-1.png",
  },

  // UCA — Pontificia Universidad Catolica Argentina (UCA) (ENTRE_RIOS)
  "UCA_ER": {
    id: "UCA_ER",
    label: "UCA",
    name: "Pontificia Universidad Catolica Argentina (UCA)",
    provinciaId: "ENTRE_RIOS",
    logoUrl: "/universities/uca.png",
  },

  // UPLaB — Universidad Provincial de Laguna Blanca (UPLaB) (FORMOSA)
  "UPLAB_FSA": {
    id: "UPLAB_FSA",
    label: "UPLaB",
    name: "Universidad Provincial de Laguna Blanca (UPLaB)",
    provinciaId: "FORMOSA",
    logoUrl: "https://www.uplab.edu.ar/images/logo-nav.png",
  },

  // UNNE — Universidad Nacional del Nordeste (UNNE) (FORMOSA)
  "UNNE_FSA": {
    id: "UNNE_FSA",
    label: "UNNE",
    name: "Universidad Nacional del Nordeste (UNNE)",
    provinciaId: "FORMOSA",
    logoUrl: "https://images.seeklogo.com/logo-png/29/1/universidad-nacional-del-nordeste-logo-png_seeklogo-293999.png",
  },

  // UCP — Universidad de la Cuenca del Plata (UCP) (FORMOSA)
  "UCP_FSA": {
    id: "UCP_FSA",
    label: "UCP",
    name: "Universidad de la Cuenca del Plata (UCP)",
    provinciaId: "FORMOSA",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UCP-LOGO-1.png",
  },

  // IPF — Instituto Politecnico Formosa (IPF) (FORMOSA)
  "IPF_FSA": {
    id: "IPF_FSA",
    label: "IPF",
    name: "Instituto Politecnico Formosa (IPF)",
    provinciaId: "FORMOSA",
    logoUrl: "https://ipf.edu.ar/img/logo.png",
  },

  // UCASAL — Universidad Catolica de Salta (UCASAL) (JUJUY)
  "UCASAL_JUJ": {
    id: "UCASAL_JUJ",
    label: "UCASAL",
    name: "Universidad Catolica de Salta (UCASAL)",
    provinciaId: "JUJUY",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UCASAL-LOGO-1.png",
  },

  // UCSE — Universidad Catolica de Santiago del Estero (UCSE) (JUJUY)
  "UCSE_JUJ": {
    id: "UCSE_JUJ",
    label: "UCSE",
    name: "Universidad Catolica de Santiago del Estero (UCSE)",
    provinciaId: "JUJUY",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UCSE-LOGO-1.png",
  },

  // UCES — Universidad de Ciencias Empresariales y Sociales (UCES) (JUJUY)
  "UCES_JUJ": {
    id: "UCES_JUJ",
    label: "UCES",
    name: "Universidad de Ciencias Empresariales y Sociales (UCES)",
    provinciaId: "JUJUY",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UCES-LOGO-1.png",
  },

  // UAJFK — Universidad Argentina John F. Kennedy (UAJFK) (JUJUY)
  "UAJFK_JUJ": {
    id: "UAJFK_JUJ",
    label: "UAJFK",
    name: "Universidad Argentina John F. Kennedy (UAJFK)",
    provinciaId: "JUJUY",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UK-LOGO-1.png",
  },

  // Siglo 21 — Universidad Siglo 21 (LA_PAMPA)
  "UES21_LP": {
    id: "UES21_LP",
    label: "Siglo 21",
    name: "Universidad Siglo 21",
    provinciaId: "LA_PAMPA",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/0/07/Logo_de_la_Universidad_Siglo_21.svg",
  },

  // UB — Universidad de Belgrano (UB) (LA_PAMPA)
  "UB_LP": {
    id: "UB_LP",
    label: "UB",
    name: "Universidad de Belgrano (UB)",
    provinciaId: "LA_PAMPA",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UB-LOGO-1.png",
  },

  // UCASAL — Universidad Catolica de Salta (UCASAL) (LA_PAMPA)
  "UCASAL_LP": {
    id: "UCASAL_LP",
    label: "UCASAL",
    name: "Universidad Catolica de Salta (UCASAL)",
    provinciaId: "LA_PAMPA",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UCASAL-LOGO-1.png",
  },

  // UBP — Universidad Blas Pascal (UBP) (LA_PAMPA)
  "UBP_LP": {
    id: "UBP_LP",
    label: "UBP",
    name: "Universidad Blas Pascal (UBP)",
    provinciaId: "LA_PAMPA",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UB-LOGO-1.png",
  },

  // UF — Universidad FASTA (UF) (LA_PAMPA)
  "UF_LP": {
    id: "UF_LP",
    label: "UF",
    name: "Universidad FASTA (UF)",
    provinciaId: "LA_PAMPA",
    logoUrl: "https://images.seeklogo.com/logo-png/49/2/fasta-logo-png_seeklogo-495482.png",
  },

  // UNDEC — Universidad Nacional de Chilecito (UNDEC) (LA_RIOJA)
  "UNDEC_LR": {
    id: "UNDEC_LR",
    label: "UNDEC",
    name: "Universidad Nacional de Chilecito (UNDEC)",
    provinciaId: "LA_RIOJA",
    logoUrl: "https://www.undec.edu.ar/wp-content/uploads/2022/09/cropped-Ico-UNdeC-32x32.png",
  },

  // UTN FRLR — Universidad Tecnologica Nacional - Facultad Regional La Rioja (UTN FRLR) (LA_RIOJA)
  "UTNFRLR_LR": {
    id: "UTNFRLR_LR",
    label: "UTN FRLR",
    name: "Universidad Tecnologica Nacional - Facultad Regional La Rioja (UTN FRLR)",
    provinciaId: "LA_RIOJA",
    logoUrl: "/universities/utn.png",
  },

  // Fund. Barceló — Instituto Universitario de Ciencias de la Salud Fundacion H.A. Barcelo (LA_RIOJA)
  "BARCELO_LR": {
    id: "BARCELO_LR",
    label: "Fund. Barceló",
    name: "Instituto Universitario de Ciencias de la Salud Fundacion H.A. Barcelo",
    provinciaId: "LA_RIOJA",
    logoUrl: "https://barcelo.edu.ar/barcelo.svg",
  },

  // Siglo 21 — Universidad Siglo 21 (LA_RIOJA)
  "UES21_LR": {
    id: "UES21_LR",
    label: "Siglo 21",
    name: "Universidad Siglo 21",
    provinciaId: "LA_RIOJA",
    logoUrl: "/universities/ues21.svg",
  },

  // UAJFK — Universidad Argentina John F. Kennedy (UAJFK) (LA_RIOJA)
  "UAJFK_LR": {
    id: "UAJFK_LR",
    label: "UAJFK",
    name: "Universidad Argentina John F. Kennedy (UAJFK)",
    provinciaId: "LA_RIOJA",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UK-LOGO-1.png",
  },

  // UNAU — Universidad Nacional del Alto Uruguay (UNAU) (MISIONES)
  "UNAU_MIS": {
    id: "UNAU_MIS",
    label: "UNAU",
    name: "Universidad Nacional del Alto Uruguay (UNAU)",
    provinciaId: "MISIONES",
    logoUrl: "https://unau.edu.ar/assets/logo.png",
  },

  // UNNE — Universidad Nacional del Nordeste (UNNE) (MISIONES)
  "UNNE_MIS": {
    id: "UNNE_MIS",
    label: "UNNE",
    name: "Universidad Nacional del Nordeste (UNNE)",
    provinciaId: "MISIONES",
    logoUrl: "https://images.seeklogo.com/logo-png/29/1/universidad-nacional-del-nordeste-logo-png_seeklogo-293999.png",
  },

  // UGD — Universidad Gaston Dachary (UGD) (MISIONES)
  "UGD_MIS": {
    id: "UGD_MIS",
    label: "UGD",
    name: "Universidad Gaston Dachary (UGD)",
    provinciaId: "MISIONES",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UCAMI-LOGO-1.png",
  },

  // UCAMI — Universidad Catolica de las Misiones (UCAMI) (MISIONES)
  "UCAMI_MIS": {
    id: "UCAMI_MIS",
    label: "UCAMI",
    name: "Universidad Catolica de las Misiones (UCAMI)",
    provinciaId: "MISIONES",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UCAMI-LOGO-1.png",
  },

  // UCSF — Universidad Catolica de Santa Fe (UCSF) (MISIONES)
  "UCSF_MIS": {
    id: "UCSF_MIS",
    label: "UCSF",
    name: "Universidad Catolica de Santa Fe (UCSF)",
    provinciaId: "MISIONES",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UCSF-LOGO-1.png",
  },

  // UCP — Universidad de la Cuenca del Plata (UCP) (MISIONES)
  "UCP_MIS": {
    id: "UCP_MIS",
    label: "UCP",
    name: "Universidad de la Cuenca del Plata (UCP)",
    provinciaId: "MISIONES",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UCP-LOGO-1.png",
  },

  // UPM — Universidad Popular de Misiones (UPM) (MISIONES)
  "UPM_MIS": {
    id: "UPM_MIS",
    label: "UPM",
    name: "Universidad Popular de Misiones (UPM)",
    provinciaId: "MISIONES",
    logoUrl: "https://upmisiones.com.ar/images/dev_logo.png",
  },

  // UTN FRN — Universidad Tecnologica Nacional - Facultad Regional del Neuquen (UTN FRN) (NEUQUEN)
  "UTNFRN_NQN": {
    id: "UTNFRN_NQN",
    label: "UTN FRN",
    name: "Universidad Tecnologica Nacional - Facultad Regional del Neuquen (UTN FRN)",
    provinciaId: "NEUQUEN",
    logoUrl: "/universities/utn.png",
  },

  // UFLO — Universidad de Flores (UFLO) (NEUQUEN)
  "UFLO_NQN": {
    id: "UFLO_NQN",
    label: "UFLO",
    name: "Universidad de Flores (UFLO)",
    provinciaId: "NEUQUEN",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UFLO-LOGO-1.png",
  },

  // Siglo 21 — Universidad Siglo 21 (NEUQUEN)
  "UES21_NQN": {
    id: "UES21_NQN",
    label: "Siglo 21",
    name: "Universidad Siglo 21",
    provinciaId: "NEUQUEN",
    logoUrl: "/universities/ues21.svg",
  },

  // UCASAL — Universidad Catolica de Salta (UCASAL) (NEUQUEN)
  "UCASAL_NQN": {
    id: "UCASAL_NQN",
    label: "UCASAL",
    name: "Universidad Catolica de Salta (UCASAL)",
    provinciaId: "NEUQUEN",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UCASAL-LOGO-1.png",
  },

  // UBP — Universidad Blas Pascal (UBP) (NEUQUEN)
  "UBP_NQN": {
    id: "UBP_NQN",
    label: "UBP",
    name: "Universidad Blas Pascal (UBP)",
    provinciaId: "NEUQUEN",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UB-LOGO-1.png",
  },

  // IB — Instituto Balseiro (IB) (RIO_NEGRO)
  "IB_RN": {
    id: "IB_RN",
    label: "IB",
    name: "Instituto Balseiro (IB)",
    provinciaId: "RIO_NEGRO",
    logoUrl: "https://www.ib.edu.ar/wp-content/uploads/2023/12/logo-ib.png",
  },

  // UNCo — Universidad Nacional del Comahue (UNCo) (RIO_NEGRO)
  "UNCO_RN": {
    id: "UNCO_RN",
    label: "UNCo",
    name: "Universidad Nacional del Comahue (UNCo)",
    provinciaId: "RIO_NEGRO",
    logoUrl: "https://uncoma.edu.ar/wp-content/uploads/2024/09/logoUNCO-2.png",
  },

  // UFLO — Universidad de Flores (UFLO) (RIO_NEGRO)
  "UFLO_RN": {
    id: "UFLO_RN",
    label: "UFLO",
    name: "Universidad de Flores (UFLO)",
    provinciaId: "RIO_NEGRO",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UFLO-LOGO-1.png",
  },

  // UF — Universidad FASTA (UF) (RIO_NEGRO)
  "UF_RN": {
    id: "UF_RN",
    label: "UF",
    name: "Universidad FASTA (UF)",
    provinciaId: "RIO_NEGRO",
    logoUrl: "https://images.seeklogo.com/logo-png/49/2/fasta-logo-png_seeklogo-495482.png",
  },

  // UCASAL — Universidad Catolica de Salta (UCASAL) (SALTA)
  "UCASAL_SAL": {
    id: "UCASAL_SAL",
    label: "UCASAL",
    name: "Universidad Catolica de Salta (UCASAL)",
    provinciaId: "SALTA",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UCASAL-LOGO-1.png",
  },

  // UPATecO — Universidad Provincial de Administracion, Tecnologia y Oficios (UPATecO) (SALTA)
  "UPATECO_SAL": {
    id: "UPATECO_SAL",
    label: "UPATecO",
    name: "Universidad Provincial de Administracion, Tecnologia y Oficios (UPATecO)",
    provinciaId: "SALTA",
    logoUrl: "https://upateco.edu.ar/wp-content/uploads/2025/02/isologo-web.png",
  },

  // Siglo 21 — Universidad Siglo 21 (SALTA)
  "UES21_SAL": {
    id: "UES21_SAL",
    label: "Siglo 21",
    name: "Universidad Siglo 21",
    provinciaId: "SALTA",
    logoUrl: "/universities/ues21.svg",
  },

  // UAJFK — Universidad Argentina John F. Kennedy (UAJFK) (SALTA)
  "UAJFK_SAL": {
    id: "UAJFK_SAL",
    label: "UAJFK",
    name: "Universidad Argentina John F. Kennedy (UAJFK)",
    provinciaId: "SALTA",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UK-LOGO-1.png",
  },

  // UTN FRSC — Universidad Tecnologica Nacional - Facultad Regional Santa Cruz (UTN FRSC) (SANTA_CRUZ)
  "UTNFRSC_SC": {
    id: "UTNFRSC_SC",
    label: "UTN FRSC",
    name: "Universidad Tecnologica Nacional - Facultad Regional Santa Cruz (UTN FRSC)",
    provinciaId: "SANTA_CRUZ",
    logoUrl: "/universities/utn.png",
  },

  // UCSF — Universidad Catolica de Santa Fe (UCSF) (SANTA_FE)
  "UCSF_SF": {
    id: "UCSF_SF",
    label: "UCSF",
    name: "Universidad Catolica de Santa Fe (UCSF)",
    provinciaId: "SANTA_FE",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UCSF-LOGO-1.png",
  },

  // UAI — Universidad Abierta Interamericana (UAI) (SANTA_FE)
  "UAI_SF": {
    id: "UAI_SF",
    label: "UAI",
    name: "Universidad Abierta Interamericana (UAI)",
    provinciaId: "SANTA_FE",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UAI-LOGO-1.png",
  },

  // Siglo 21 — Universidad Siglo 21 (SANTA_FE)
  "UES21_SF": {
    id: "UES21_SF",
    label: "Siglo 21",
    name: "Universidad Siglo 21",
    provinciaId: "SANTA_FE",
    logoUrl: "/universities/ues21.svg",
  },

  // UCSE — Universidad Catolica de Santiago del Estero (UCSE) (SANTIAGO_ESTERO)
  "UCSE_SDE": {
    id: "UCSE_SDE",
    label: "UCSE",
    name: "Universidad Catolica de Santiago del Estero (UCSE)",
    provinciaId: "SANTIAGO_ESTERO",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UCSE-LOGO-1.png",
  },

  // Siglo 21 — Universidad Siglo 21 (SANTIAGO_ESTERO)
  "UES21_SDE": {
    id: "UES21_SDE",
    label: "Siglo 21",
    name: "Universidad Siglo 21",
    provinciaId: "SANTIAGO_ESTERO",
    logoUrl: "/universities/ues21.svg",
  },

  // UAJFK — Universidad Argentina John F. Kennedy (UAJFK) (SANTIAGO_ESTERO)
  "UAJFK_SDE": {
    id: "UAJFK_SDE",
    label: "UAJFK",
    name: "Universidad Argentina John F. Kennedy (UAJFK)",
    provinciaId: "SANTIAGO_ESTERO",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UK-LOGO-1.png",
  },

  // UTN — Universidad Tecnológica Nacional - Facultad Regional Tierra del Fuego (UTN) (TIERRA_FUEGO)
  "UTN_TDF": {
    id: "UTN_TDF",
    label: "UTN",
    name: "Universidad Tecnológica Nacional - Facultad Regional Tierra del Fuego (UTN)",
    provinciaId: "TIERRA_FUEGO",
    logoUrl: "/universities/utn.png",
  },

  // UCES — Universidad de Ciencias Empresariales y Sociales (UCES) (TIERRA_FUEGO)
  "UCES_TDF": {
    id: "UCES_TDF",
    label: "UCES",
    name: "Universidad de Ciencias Empresariales y Sociales (UCES)",
    provinciaId: "TIERRA_FUEGO",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UCES-LOGO-1.png",
  },

  // UNSTA — Universidad del Norte Santo Tomas de Aquino (UNSTA) (TUCUMAN)
  "UNSTA_TUC": {
    id: "UNSTA_TUC",
    label: "UNSTA",
    name: "Universidad del Norte Santo Tomas de Aquino (UNSTA)",
    provinciaId: "TUCUMAN",
    logoUrl: "https://www.uns.edu.ar/img/escudo_gris.png",
  },

  // USPT — Universidad de San Pablo-T (USPT) (TUCUMAN)
  "USPT_TUC": {
    id: "USPT_TUC",
    label: "USPT",
    name: "Universidad de San Pablo-T (USPT)",
    provinciaId: "TUCUMAN",
    logoUrl: "https://crup.org.ar/wp-content/uploads/2026/02/UCSE-LOGO-1.png",
  },

  // Siglo 21 — Universidad Siglo 21 (TUCUMAN)
  "UES21_TUC": {
    id: "UES21_TUC",
    label: "Siglo 21",
    name: "Universidad Siglo 21",
    provinciaId: "TUCUMAN",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/0/07/Logo_de_la_Universidad_Siglo_21.svg",
  },

  // Otros Institutos — Institutos / Tecnicaturas / Otra Institución (OTRA_PROVINCIA)
  "OTROS": {
    id: "OTROS",
    label: "Otros Institutos",
    name: "Institutos / Tecnicaturas / Otra Institución",
    provinciaId: "OTRA_PROVINCIA",
    logoUrl: "https://img.icons8.com/fluency/96/university.png",
  },

};

/**
 * Genera un fallback cuadrado SVG ligero en caso de que una URL de imagen no cargue o tenga error de red.
 */
export function createSquareFallbackLogo(label: string, id: string): string {
  const cleanLabel = (label || id || "U").trim();
  const letters = cleanLabel.split(/\s+/).slice(0, 3).map(w => w[0]?.toUpperCase()).join("") || cleanLabel.slice(0, 3).toUpperCase();

  const colors = [
    { bg: "#1e3a8a", text: "#ffffff" },
    { bg: "#0369a1", text: "#ffffff" },
    { bg: "#047857", text: "#ffffff" },
    { bg: "#7c2d12", text: "#ffffff" },
    { bg: "#4c1d95", text: "#ffffff" },
    { bg: "#0f766e", text: "#ffffff" },
  ];
  let hash = 0;
  for (let i = 0; i < (label || id).length; i++) {
    hash = (hash << 5) - hash + (label || id).charCodeAt(i);
  }
  const color = colors[Math.abs(hash) % colors.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <rect width="100" height="100" rx="24" fill="${color.bg}" />
    <rect x="5" y="5" width="90" height="90" rx="20" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="2.5" />
    <text x="50" y="58" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${letters.length > 3 ? '24' : '28'}" font-weight="900" fill="${color.text}" text-anchor="middle" dominant-baseline="middle" letter-spacing="-0.5">${letters}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Obtiene la URL del logo de una facultad o universidad.
 */
export function getUniversityLogoUrl(universityId: string): string {
  const item = UNIVERSITY_LOGOS[universityId];
  if (item && item.logoUrl && item.logoUrl.trim() !== "") {
    return item.logoUrl;
  }
  return createSquareFallbackLogo(item?.label || universityId, universityId);
}