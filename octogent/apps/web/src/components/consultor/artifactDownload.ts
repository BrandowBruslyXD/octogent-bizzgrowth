import { marked } from "marked";

import { buildDeckVaultFileUrl } from "../../runtime/runtimeEndpoints";

const triggerDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Esperar un tick antes de revocar para que Safari alcance a disparar la descarga.
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

const escapeHtmlForWord = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const buildWordHtml = (title: string, markdownSource: string): string => {
  const bodyHtml = marked.parse(markdownSource, {
    async: false,
    breaks: true,
    gfm: true,
  }) as string;

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${escapeHtmlForWord(title)}</title>
<!--[if gte mso 9]><xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml><![endif]-->
<style>
  @page { margin: 2.54cm; }
  body { font-family: "Calibri", "Segoe UI", Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #111; }
  h1 { font-size: 22pt; color: #0f2a4a; border-bottom: 2px solid #0f2a4a; padding-bottom: 6px; margin-top: 0; }
  h2 { font-size: 15pt; color: #1d3557; margin-top: 22pt; }
  h3 { font-size: 12pt; color: #2a4365; margin-top: 16pt; }
  p { margin: 6pt 0; }
  ul, ol { margin: 6pt 0 6pt 18pt; }
  table { border-collapse: collapse; width: 100%; margin: 10pt 0; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; font-size: 10pt; vertical-align: top; }
  th { background: #f1f5f9; font-weight: 600; }
  blockquote { border-left: 3px solid #94a3b8; margin: 10pt 0; padding: 4pt 12pt; color: #334155; background: #f8fafc; }
  code { font-family: "Consolas", "Courier New", monospace; background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-size: 10pt; }
  pre { font-family: "Consolas", "Courier New", monospace; background: #f8fafc; padding: 10px; border-radius: 4px; font-size: 9pt; white-space: pre-wrap; border: 1px solid #e2e8f0; }
  hr { border: none; border-top: 1px solid #cbd5e1; margin: 18pt 0; }
  a { color: #1d4ed8; text-decoration: underline; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
};

const PROPUESTA_TENTACLE_ID = "consultor-comercial";
const PROPUESTA_FILE = "propuesta.md";
const PROPUESTA_TITLE = "Propuesta comercial";

export type ArtifactDownloadFormat = "word" | "markdown";

export const downloadPropuesta = async (format: ArtifactDownloadFormat): Promise<boolean> => {
  const url = buildDeckVaultFileUrl(PROPUESTA_TENTACLE_ID, PROPUESTA_FILE);
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "text/plain, text/markdown" },
  });
  if (!response.ok) return false;
  const content = await response.text();
  if (content.length === 0) return false;

  if (format === "markdown") {
    triggerDownload(new Blob([content], { type: "text/markdown;charset=utf-8" }), PROPUESTA_FILE);
    return true;
  }

  const html = buildWordHtml(PROPUESTA_TITLE, content);
  triggerDownload(
    // BOM ufeff para que Word respete UTF-8 al abrir el .doc.
    new Blob(["﻿", html], { type: "application/msword;charset=utf-8" }),
    "propuesta.doc",
  );
  return true;
};

// Mapeo de las 4 tools del modo Consultor a sus archivos de output. El
// reset borra estos archivos del filesystem; el polling de
// useConsultorActiveTools detecta su ausencia y vuelve a "idle".
const CONSULTOR_OUTPUT_FILES: Array<[string, string]> = [
  ["consultor-entrevistador", "interview.json"],
  ["consultor-analista", "current-flow.md"],
  ["consultor-arquitecto", "ideal-flow.md"],
  ["consultor-comercial", "propuesta.md"],
];

// Borra los 4 archivos de output. No falla si alguno no existe (ya
// borrado o nunca generado). El nuevo flujo arranca cuando el operador
// vuelve a chatear con el Octoboss; el orquestador detecta archivos
// faltantes y los regenera secuencialmente.
export const resetConsultorOutputs = async (): Promise<{ deleted: number }> => {
  let deleted = 0;
  await Promise.all(
    CONSULTOR_OUTPUT_FILES.map(async ([tentacleId, fileName]) => {
      try {
        const response = await fetch(buildDeckVaultFileUrl(tentacleId, fileName), {
          method: "DELETE",
          headers: { Accept: "application/json" },
        });
        if (response.ok) deleted += 1;
      } catch {
        // ignorar fallas individuales: si uno no se borra, los demás siguen
      }
    }),
  );
  return { deleted };
};
