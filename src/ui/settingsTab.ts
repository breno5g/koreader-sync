import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type KOReaderSyncPlugin from "../../main";

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
					text.setValue("Online").inputEl.style.color = "#40a02b";
				} else {
					text.setValue("Offline").inputEl.style.color = "#d20f39";
				}
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
