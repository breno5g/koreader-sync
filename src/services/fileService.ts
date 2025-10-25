import { Notice, TFile, App, TFolder } from "obsidian";
import { KORMetadata } from "../types/types";
import { generateMarkdownBlock, sanitizeId } from "../utils/markdown";

async function ensureFolderExists(app: App, path: string) {
	const cleanPath = path.trim().replace(/^\/+|\/+$/g, "");
	if (cleanPath === "") {
		return;
	}

	const folder = app.vault.getAbstractFileByPath(cleanPath);

	if (folder && folder instanceof TFolder) {
		return;
	}

	if (folder && folder instanceof TFile) {
		new Notice(
			`KOReader Sync: ERROR: '${cleanPath}' is a file, not a folder. Cannot save highlights.`
		);
		throw new Error(`'${cleanPath}' is a file.`);
	}

	try {
		await app.vault.createFolder(cleanPath);
	} catch (e) {
		console.error(
			`[KOReader Sync] Failed to create folder '${cleanPath}':`,
			e
		);
		new Notice(`KOReader Sync: Failed to create folder '${cleanPath}'.`);
		throw e;
	}
}

export async function saveHighlightsToFile(
	app: App,
	metadata: KORMetadata,
	highlightsFolder: string
) {
	const stats = metadata.stats || {};

	const cleanFolderPath = highlightsFolder.trim().replace(/^\/+|\/+$/g, "");

	try {
		await ensureFolderExists(app, cleanFolderPath);
	} catch (e) {
		return;
	}

	const bookTitle = stats.title || "Untitled KOReader Highlights";
	const safeFileName = bookTitle.replace(/[\\/:"*?<>|]+/g, "");

	const fileName =
		cleanFolderPath === ""
			? `${safeFileName}.md`
			: `${cleanFolderPath}/${safeFileName}.md`;

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
			const blockRegex = new RegExp(
				`^>.*\\^${blockID}\\n` + `((?:^>.*\\n)*)`,
				"gm"
			);
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
