import { Notice, TFile, App } from "obsidian";
import { KORMetadata } from "../types/types";
import { generateMarkdownBlock, sanitizeId } from "../utils/markdown";

export async function saveHighlightsToFile(app: App, metadata: KORMetadata) {
  const stats = metadata.stats || {};

  const bookTitle = stats.title || "Untitled KOReader Highlights";
  const safeFileName = bookTitle.replace(/[\\/:"*?<>|]+/g, "");
  const fileName = `${safeFileName}.md`;

  let existingFile: TFile | null = null;
  const file = app.vault.getAbstractFileByPath(fileName);
  if (file && file instanceof TFile) {
    existingFile = file;
  }

  const newIsoTimestamp = new Date().toISOString();

  let newFrontmatter = "---\n";
  newFrontmatter += `title: "${stats.title ?? "N/A"}"\n`;
  newFrontmatter += `authors: "${stats.authors ?? "N/A"}"\n`;
  newFrontmatter += `series: "${stats.series ?? "N/A"}"\n`;
  newFrontmatter += `language: "${stats.language ?? "N/A"}"\n`;
  newFrontmatter += `total_pages: ${stats.pages ?? 0}\n`;
  newFrontmatter += `total_highlights: ${stats.highlights ?? 0}\n`;
  newFrontmatter += `total_notes: ${stats.notes ?? 0}\n`;
  newFrontmatter += `last_sync: "${newIsoTimestamp}"\n`;
  newFrontmatter += "---\n\n";

  const newHeader = newFrontmatter;

  if (!existingFile) {
    let newFileContent = newHeader;
    for (const annotation of metadata.annotations) {
      newFileContent += generateMarkdownBlock(annotation);
      newFileContent += "\n\n";
    }
    await app.vault.create(fileName, newFileContent);
    new Notice(`KOReader Sync: File CREATED: ${fileName}`);
  } else {
    let fileContent = await app.vault.read(existingFile);
    let newHighlightsCount = 0;
    let updatedHighlightsCount = 0;

    const frontmatterRegex = /^---[\s\S]*?---\n*/;

    fileContent = fileContent.replace(frontmatterRegex, "");

    const leadingHrRegex = /^(?:\s*\n)*---\s*\n+/;
    fileContent = fileContent.replace(leadingHrRegex, "");

    fileContent = newHeader + fileContent.trimStart();

    for (const annotation of metadata.annotations) {
      const blockID = sanitizeId(annotation.datetime);
      const newBlockContent = generateMarkdownBlock(annotation);
      const blockRegex = new RegExp(`^>.*\\^${blockID}\\n` + `((?:^>.*\\n)*)`, "gm");
      const match = fileContent.match(blockRegex);
      if (match) {
        fileContent = fileContent.replace(blockRegex, newBlockContent);
        updatedHighlightsCount++;
      } else {
        fileContent += "\n\n" + newBlockContent;
        newHighlightsCount++;
      }
    }

    await app.vault.modify(existingFile, fileContent);
    new Notice(
      `KOReader Sync: File UPDATED: ${updatedHighlightsCount} updated, ${newHighlightsCount} new.`
    );
  }
}
