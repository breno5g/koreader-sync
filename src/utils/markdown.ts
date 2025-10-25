import { Annotation } from "../types/types";

export function sanitizeId(datetime: string): string {
  return "kor-" + datetime.replace(/:/g, "").replace(" ", "T");
}

export function generateMarkdownBlock(annotation: Annotation): string {
  const blockID = sanitizeId(annotation.datetime);
  let context = `Page ${annotation.pageno}`;
  if (annotation.chapter) {
    context += ` | Chapter: ${annotation.chapter}`;
  }
  let content = `> [!quote] Highlight (${context}) ^${blockID}\n`;
  const highlightLines = annotation.text
    .split("\n")
    .map((line) => (line.trim() === "" ? `>` : `> ${line}`))
    .join("\n");
  content += `${highlightLines}\n`;
  if (annotation.note && annotation.note.trim() !== "") {
    content += `> \n`;
    content += `> > [!note] KOReader Note\n`;
    const noteLines = annotation.note
      .trim()
      .split("\n")
      .map((line) => (line.trim() === "" ? `> >` : `> > ${line}`))
      .join("\n");
    content += `${noteLines}\n`;
  }
  return content;
}
