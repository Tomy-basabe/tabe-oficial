// Carga perezosa de plantillas de carrera (src/data/<carpeta>/<archivo>.json o src/data/<archivo>.json).
// Usa import.meta.glob para soportar cualquier carpeta nueva (provincias) sin tocar el código.
const folderTemplates = import.meta.glob("../data/*/*.json");
const rootTemplates = import.meta.glob("../data/*.json");

export async function loadCareerTemplate(file: string): Promise<{ default: any }> {
  const key = `../data/${file}.json`;
  const loader = folderTemplates[key] ?? rootTemplates[key];
  if (!loader) throw new Error(`Plantilla de carrera no encontrada: ${file}`);
  return (await loader()) as { default: any };
}
