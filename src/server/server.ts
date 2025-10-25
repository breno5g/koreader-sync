import * as http from "http";
import { Notice, App } from "obsidian";
import { KORMetadata, KOReaderSyncSettings } from "../types/types";
import { saveHighlightsToFile } from "../services/fileService";

function sendError(res: http.ServerResponse, code: number, message: string) {
	console.log(`[KOReader Sync] Error ${code}: ${message}`);
	res.writeHead(code, { "Content-Type": "text/plain" });
	res.end(message);
}

export function createRequestHandler(deps: {
	app: App;
	getSettings: () => KOReaderSyncSettings;
}): (req: http.IncomingMessage, res: http.ServerResponse) => void {
	const { app, getSettings } = deps;

	return function handleRequest(
		req: http.IncomingMessage,
		res: http.ServerResponse
	) {
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
		res.setHeader(
			"Access-Control-Allow-Headers",
			"Authorization, Content-Type"
		);

		if (req.method === "OPTIONS") {
			res.writeHead(204);
			res.end();
			return;
		}

		if (req.method === "POST" && req.url === "/sync") {
			const deviceId = req.headers["authorization"] as string | undefined;
			const settings = getSettings();
			if (!deviceId) {
				return sendError(
					res,
					401,
					"Unauthorized: Device ID header missing"
				);
			}
			if (!settings.validDeviceIDs.includes(deviceId)) {
				return sendError(res, 401, "Unauthorized: Invalid Device ID");
			}
			console.log(
				`[KOReader Sync] ✅ Authorized device (ID: ${deviceId}).`
			);

			let body = "";
			req.on("data", (chunk) => {
				body += chunk.toString();
			});

			req.on("end", () => {
				(async () => {
					try {
						const metadata: KORMetadata = JSON.parse(body);
						if (
							!metadata ||
							!metadata.annotations ||
							!metadata.stats
						) {
							return sendError(
								res,
								400,
								"Bad Request: Invalid JSON payload (missing annotations or stats)"
							);
						}

						const highlightCount = metadata.annotations.length;
						new Notice(
							`KOReader Sync: Receiving ${highlightCount} highlights...`
						);

						await saveHighlightsToFile(
							app,
							metadata,
							settings.highlightsFolder
						);

						res.writeHead(200, {
							"Content-Type": "application/json",
						});
						res.end(
							JSON.stringify({
								status: "success",
								message: `Received ${highlightCount} highlights.`,
							})
						);
					} catch (e) {
						console.error(
							"[KOReader Sync] Error processing request:",
							e
						);
						if (!res.headersSent) {
							sendError(
								res,
								500,
								"Internal Server Error: Could not process highlights"
							);
						}
					}
				})();
			});
		} else {
			sendError(res, 404, "Not Found");
		}
	};
}
