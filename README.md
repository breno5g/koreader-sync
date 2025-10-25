# ✨ KOReader Sync for Obsidian

A plugin for [Obsidian](https://obsidian.md) that acts as a web server, allowing [KOReader](https://koreader.rocks/) to send your reading highlights and notes directly into your vault.

This plugin starts a local HTTP server that listens for requests from the KOReader sync plugin. When it receives data, it parses the highlights, formats them as Markdown (using callouts), and saves them to a `.md` file corresponding to the book, either creating the file or updating it with new annotations.

## 🚀 Features

* **Embedded HTTP Server:** Start and stop a local server directly from Obsidian.
* **Secure Validation:** Uses an authorized "Device IDs" list to ensure only your KOReader devices can send data.
* **Note Creation & Updating:** Automatically creates a new `.md` file for a book or appends/updates highlights in an existing file based on the highlight's datetime.
* **Smart Formatting:** Converts KOReader highlights and notes into formatted `[!quote]` and `[!note]` callout blocks, complete with page and chapter context.
* **Settings Panel:** Simple UI to enable the server, set the port, and manage authorized device IDs.
* **Server Status:** Easily see if the server is "Online" or "Offline" from the settings screen.

## 🔧 Installation (Manual)

1.  Go to the project's **Releases** page (or build it yourself).
2.  Download the `main.js`, `manifest.json`, and `styles.css` files from the latest release.
3.  In your Obsidian vault, navigate to the plugins folder: `YourVault/.obsidian/plugins/`.
4.  Create a new folder named `koreader-sync`.
5.  Copy the downloaded files (`main.js`, `manifest.json`, `styles.css`) into the `koreader-sync` folder.
6.  Open Obsidian, go to **Settings** > **Community Plugins**.
7.  Turn off "Restricted mode" if it's on.
8.  Find "Koreader Sync" in your list of installed plugins and enable it.

## ⚙️ How to Use

For the sync to work, you must first configure this plugin (the server in Obsidian) and then point your KOReader sync plugin to it.

1.  In **Obsidian**, go to **Settings** > **Plugin Options** > **KOReader Sync**.
2.  **Enable the server** by toggling "Enable sync server".
3.  (Optional) Change the **Server Port** if the default (`9090`) is already in use by another application.
4.  In **Valid Device IDs**, add your KOReader device's ID (one ID per line).
    * *Note: You can find this ID in the "Debug info" menu of the sync plugin on your KOReader device.*
5.  Find your computer's local IP address (e.g., `192.168.1.10`).
6.  On your **KOReader device**, open its sync plugin, go to "Configure," and enter your Obsidian's IP and Port (e.g., `192.168.1.10` and `9090`).
7.  In KOReader, select **"Sync now"**. The highlights will appear in your Obsidian vault.

## 💡 How It Works (Client-Side)

This plugin is the *server*. It expects a *client* (like the KOReader sync plugin) to make the following request:

* **Method:** `POST`
* **Endpoint:** `http://<your_ip>:<your_port>/sync`
* **Headers:**
    * `Content-Type: application/json`
    * `Authorization: <device_id>` (Your KOReader device ID)
* **Body:**
    A JSON object (`KORMetadata`) containing the book metadata (`stats`) and a list of annotations (`annotations`).

Your server (this plugin) will:
1.  Listen on the `/sync` endpoint.
2.  Validate that the `Authorization` header contains a Device ID listed in your "Valid Device IDs".
3.  Parse the incoming JSON body.
4.  Use the `fileService` to find, create, or update the book's `.md` file.
5.  Format each annotation using `markdown.ts` and save it to the file.
6.  Respond with an **HTTP `200`** status on success. If something goes wrong (e.g., invalid ID), it will respond with an error (e.g., `401 Unauthorized`).

## 🐛 Debugging

If you have connection issues:

* Check the plugin's **Settings** screen in Obsidian. The **Server Status** must be "Online".
* If it's "Offline", check that the chosen port isn't being used by another application. You may see an "EADDRINUSE" error notice in Obsidian if this happens.
* Ensure the **Valid Device ID** saved in Obsidian is *exactly* the same as the ID shown in your KOReader's "Debug info".
* Make sure your KOReader device is on the same Wi-Fi network as your computer and that a firewall (on your computer or router) is not blocking the connection on the chosen port.
