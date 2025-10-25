import { Notice, Plugin } from "obsidian";
import * as http from "http";
import { KOReaderSyncSettingTab } from "./src/ui/settingsTab";
import { KOReaderSyncSettings } from "./src/types/types";
import { createRequestHandler } from "./src/server/server";

const DEFAULT_SETTINGS: KOReaderSyncSettings = {
	port: 9090,
	validDeviceIDs: ["gen-Pk9AycH1ipeoU3Kt", "gen-aeCWBx22oVJkipQf"],
	isServerEnabled: false,
	highlightsFolder: "highlights",
};

export default class KOReaderSyncPlugin extends Plugin {
	settings: KOReaderSyncSettings;
	public server: http.Server | undefined;

	async onload() {
		console.log("Loading KOReader Sync Plugin");
		await this.loadSettings();
		this.addSettingTab(new KOReaderSyncSettingTab(this.app, this));

		if (this.settings.isServerEnabled) {
			this.startServer();
		}

		this.addCommand({
			id: "toggle-koreader-sync-server",
			name: "Toggle KOReader sync server",
			callback: () => {
				this.setServerState(!this.settings.isServerEnabled);
			},
		});
	}

	onunload() {
		console.log("Unloading KOReader Sync Plugin");
		this.stopServer();
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	public startServer() {
		if (this.server) {
			console.log("[KOReader Sync] Server is already running.");
			return;
		}
		const handler = createRequestHandler({
			app: this.app,
			getSettings: () => this.settings,
		});
		this.server = http.createServer(handler);
		this.server.on("error", (err: Error & { code?: string }) => {
			if (err.code === "EADDRINUSE") {
				new Notice(
					`❌ KOReader Sync: Port ${this.settings.port} is already in use.`,
					10000
				);
				this.server = undefined;
			} else {
				new Notice(
					`❌ KOReader Sync: Failed to start server: ${err.message}`,
					10000
				);
			}
		});
		this.server.listen(this.settings.port, "0.0.0.0", () => {
			console.log(
				`[KOReader Sync] Server running at http://localhost:${this.settings.port}`
			);
			new Notice(
				`KOReader Sync: Server ON at port ${this.settings.port}.`
			);
		});
	}

	public stopServer() {
		if (this.server) {
			this.server.close(() => {
				console.log("[KOReader Sync] Server stopped.");
				new Notice("KOReader Sync: Server OFF.");
				this.server = undefined;
			});
		}
	}

	public async setServerState(enable: boolean) {
		if (enable === this.settings.isServerEnabled && enable && this.server) {
			new Notice("KOReader Sync: Server is already on.");
			return;
		}

		if (enable) {
			this.startServer();
		} else {
			this.stopServer();
		}

		this.settings.isServerEnabled = enable;
		await this.saveSettings();
	}
}
