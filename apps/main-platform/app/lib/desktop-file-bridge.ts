// Desktop file bridge — wraps Electron/Tauri IPC so React components never import
// desktop-specific APIs directly. In a pure web context this module gracefully falls back.
//
// Electron setup (preload.js):
//   const { contextBridge, ipcRenderer } = require("electron");
//   contextBridge.exposeInMainWorld("desktopBridge", {
//     openPath: (path) => ipcRenderer.invoke("open-path", path),
//   });
//
// Electron main process:
//   const { ipcMain, shell } = require("electron");
//   ipcMain.handle("open-path", (_event, p) => shell.openPath(p));

declare global {
  interface Window {
    desktopBridge?: {
      openPath: (path: string) => Promise<{ ok: boolean; error?: string }>;
    };
  }
}

export type OpenFileResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export function isDesktopBridgeAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.desktopBridge?.openPath === "function"
  );
}

/**
 * Ask the system to open the file at `localPath` with the default application.
 * Falls back to a browser download if the desktop bridge is unavailable.
 */
export async function openFileWithSystem(
  localPath: string,
  fallbackFile?: File,
  fallbackName?: string,
): Promise<OpenFileResult> {
  // Desktop bridge path (Electron / Tauri)
  if (isDesktopBridgeAvailable() && localPath) {
    try {
      const res = await window.desktopBridge!.openPath(localPath);
      if (res.ok) return { ok: true, message: "已在系统默认程序中打开" };
      return { ok: false, error: res.error ?? "系统无法打开此文件" };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "调用桌面桥接时发生未知错误",
      };
    }
  }

  // Web fallback: trigger browser download
  if (fallbackFile) {
    try {
      const url = URL.createObjectURL(fallbackFile);
      const a = document.createElement("a");
      a.href = url;
      a.download = fallbackName ?? fallbackFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      return { ok: true, message: "已触发文件下载（桌面客户端可直接打开）" };
    } catch {
      return { ok: false, error: "浏览器下载失败，请稍后重试" };
    }
  }

  return {
    ok: false,
    error: "当前运行环境不支持系统打开文件（需要桌面客户端）",
  };
}
