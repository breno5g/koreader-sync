import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type KOReaderSyncPlugin from "../../main";
import * as os from "os";

function getLocalIPAddresses(): string[] {
	const interfaces = os.networkInterfaces();
	const ips: string[] = [];

	for (const name of Object.keys(interfaces)) {
		const iface = interfaces[name];
		if (!iface) continue;

		for (const info of iface) {
			if (info.family === "IPv4" && !info.internal) {
				ips.push(info.address);
			}
		}
	}
	return ips;
}

export class KOReaderSyncSettingTab extends PluginSettingTab {
	plugin: KOReaderSyncPlugin;

	constructor(app: App, plugin: KOReaderSyncPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "KOReader Sync Settings" });

		new Setting(containerEl)
			.setName("Enable sync server")
			.setDesc(
				"Enables the HTTP server to receive KOReader highlights. The server will start on the port specified below."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.isServerEnabled)
					.onChange(async (value) => {
						await this.plugin.setServerState(value);
						this.display();
					})
			);

		new Setting(containerEl)
			.setName("Server Status")
			.setDesc("Shows whether the server is currently online or offline.")
			.addText((text) => {
				text.setDisabled(true);
				if (
					this.plugin.settings.isServerEnabled &&
					this.plugin.server
				) {
					text.setValue("Online");
					text.inputEl.addClass("koreader-sync-status-online");
				} else {
					text.setValue("Offline");
					text.inputEl.addClass("koreader-sync-status-offline");
				}
			});

		// NEW: IP Display Box
		const ips = getLocalIPAddresses();
		const ipString =
			ips.length > 0
				? ips.join("\n")
				: "No local IP addresses found (Check Wi-Fi/Ethernet connection)";

		new Setting(containerEl)
			.setName("Computer IP (Read-only)")
			.setDesc(
				"Use one of these IP addresses in your KOReader app. (Updates when this tab is reopened)."
			)
			.addTextArea((text) => {
				text.setValue(ipString).setDisabled(true);
				text.inputEl.addClass("koreader-sync-ip-textarea");
				text.inputEl.rows = Math.max(2, ips.length);
			});

		new Setting(containerEl)
			.setName("Server Port")
			.setDesc(
				"Port for the server to listen on. (Requires server restart if changed)"
			)
			.addText((text) =>
				text
					.setPlaceholder("9090")
					.setValue(this.plugin.settings.port.toString())
					.onChange(async (value) => {
						const port = parseInt(value);
						if (!isNaN(port) && port > 0 && port < 65536) {
							this.plugin.settings.port = port;
							await this.plugin.saveSettings();

							if (this.plugin.settings.isServerEnabled) {
								new Notice(
									"KOReader Sync: Port changed. Restarting server..."
								);
								this.plugin.stopServer();
								setTimeout(() => {
									this.plugin.startServer();
									this.display();
								}, 500);
							}
						}
					})
			);

		new Setting(containerEl)
			.setName("Highlights Folder")
			.setDesc(
				"The folder to save highlights to (relative to your vault root). Defaults to 'highlights'."
			)
			.addText((text) =>
				text
					.setPlaceholder("highlights")
					.setValue(this.plugin.settings.highlightsFolder)
					.onChange(async (value) => {
						const cleanPath = value
							.trim()
							.replace(/^\/+|\/+$/g, "");
						this.plugin.settings.highlightsFolder = cleanPath;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Valid Device IDs")
			.setDesc(
				'Authorized KOReader device IDs (one per line). Get the ID in the plugin "Debug info" menu on KOReader.'
			)
			.addTextArea((text) =>
				text
					.setPlaceholder("gen-Device-ID-1\ngen-Device-ID-2")
					.setValue(this.plugin.settings.validDeviceIDs.join("\n"))
					.onChange(async (value) => {
						const ids = value
							.split("\n")
							.map((id) => id.trim())
							.filter((id) => id.length > 0);

						this.plugin.settings.validDeviceIDs = ids;
						await this.plugin.saveSettings();
					})
			);
	}
}
