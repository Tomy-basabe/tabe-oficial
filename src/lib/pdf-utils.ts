
import * as pdfjsLib from 'pdfjs-dist';

export const extractTextFromPdf = async (file: File): Promise<string> => {
    try {
        // Configurar el worker de forma segura para Vite (dentro de la función para evitar errores de init)
        // @ts-ignore
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            // @ts-ignore
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = '';
        const maxPages = Math.min(pdf.numPages, 35); // Límite amplio para documentos universitarios

        for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');

            fullText += `--- Página ${i} ---\n${pageText}\n\n`;
        }

        if (pdf.numPages > maxPages) {
            fullText += `\n... (Texto truncado, el documento tiene ${pdf.numPages} páginas) ...`;
        }

        return fullText;
    } catch (error) {
        console.error("Error extraction PDF:", error);
        throw new Error("No se pudo leer el PDF. Asegúrate de que no esté encriptado.");
    }
};
