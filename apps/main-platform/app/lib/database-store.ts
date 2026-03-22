// In-memory database store — MVP.
// Replace with Prisma + SQLite/S3 in the next iteration without changing the API contract.

import type { ClusterFile, AddClusterFileBody } from "./cluster-files-contract";

// ── Timeline update log ───────────────────────────────────────────────────────

export interface DatabaseUpdate {
  id: string;
  time: string;   // HH:MM
  date: string;   // YYYY.M.D
  actor: string;  // who / which node
  action: string; // human-readable action
  type: "cluster" | "file";
  timestamp: number; // Date.now() for sorting
}

export interface Cluster {
  id: string;
  name: string;
  fileCount: number;
  createdAt: string; // ISO date string YYYY-MM-DD
}

export interface Metrics {
  clusterCount: number;
  totalFiles: number;
  lastAddedDate: string | null;
}

const DEFAULT_CLUSTERS: Cluster[] = [
  { id: "default-1", name: "核心知识库",   fileCount: 12, createdAt: "2026-03-15" },
  { id: "default-2", name: "研究文献集",   fileCount: 7,  createdAt: "2026-03-16" },
  { id: "default-3", name: "实验数据集",   fileCount: 3,  createdAt: "2026-03-17" },
];

// ── Seed update log from default clusters ────────────────────────────────────
function seedUpdateLog(): DatabaseUpdate[] {
  return [
    { id: "seed-7", time: "19:01", date: "2026.3.19", actor: "分局A节点",   action: "新建了聚类《核心知识库》",     type: "cluster", timestamp: new Date("2026-03-19T19:01:00").getTime() },
    { id: "seed-6", time: "15:30", date: "2026.3.19", actor: "派出所3节点", action: "上传文件至《研究文献集》",     type: "file",    timestamp: new Date("2026-03-19T15:30:00").getTime() },
    { id: "seed-5", time: "08:50", date: "2026.3.18", actor: "分局B节点",   action: "新建了聚类《实验数据集》",     type: "cluster", timestamp: new Date("2026-03-18T08:50:00").getTime() },
    { id: "seed-4", time: "19:30", date: "2026.3.17", actor: "分局A节点",   action: "上传文件至《核心知识库》",     type: "file",    timestamp: new Date("2026-03-17T19:30:00").getTime() },
    { id: "seed-3", time: "11:12", date: "2026.3.17", actor: "派出所1节点", action: "上传文件至《实验数据集》",     type: "file",    timestamp: new Date("2026-03-17T11:12:00").getTime() },
    { id: "seed-2", time: "09:00", date: "2026.3.16", actor: "总部节点",    action: "新建了聚类《研究文献集》",     type: "cluster", timestamp: new Date("2026-03-16T09:00:00").getTime() },
    { id: "seed-1", time: "14:22", date: "2026.3.15", actor: "派出所2节点", action: "新建了聚类《核心知识库》",     type: "cluster", timestamp: new Date("2026-03-15T14:22:00").getTime() },
    { id: "seed-0", time: "10:00", date: "2026.3.14", actor: "分局C节点",   action: "上传文件至《研究文献集》",     type: "file",    timestamp: new Date("2026-03-14T10:00:00").getTime() },
  ];
}

// Module-level singleton — lives for the lifetime of the Node.js process.
const store = {
  clusters: [...DEFAULT_CLUSTERS] as Cluster[],
  // Map<clusterId, ClusterFile[]> — replaced with DB query in persistent mode.
  clusterFiles: new Map<string, ClusterFile[]>(),
  // Ordered DESC by timestamp (newest first)
  updateLog: seedUpdateLog() as DatabaseUpdate[],
};

// ── Cluster functions ─────────────────────────────────────────────────────────

export function getClusters(): Cluster[] {
  return [...store.clusters];
}

export function addCluster(name: string): Cluster {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const cluster: Cluster = {
    id: `cluster-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    fileCount: 0,
    createdAt: today,
  };
  store.clusters.push(cluster);
  // Append to update log
  pushUpdate({
    actor: "本机节点",
    action: `新建了聚类《${name}》`,
    type: "cluster",
    now,
  });
  return cluster;
}

export function getMetrics(): Metrics {
  const clusters = store.clusters;
  const totalFiles = clusters.reduce((sum, c) => sum + c.fileCount, 0);
  const sortedDates = clusters.map((c) => c.createdAt).sort().reverse();
  return {
    clusterCount: clusters.length,
    totalFiles,
    lastAddedDate: sortedDates[0] ?? null,
  };
}

// ── Cluster file functions ────────────────────────────────────────────────────

export function listClusterFiles(clusterId: string): ClusterFile[] {
  return [...(store.clusterFiles.get(clusterId) ?? [])];
}

export function addClusterFile(
  clusterId: string,
  body: AddClusterFileBody,
): ClusterFile {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const file: ClusterFile = {
    id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    clusterId,
    addedAt: today,
    ...body,
  };

  const existing = store.clusterFiles.get(clusterId) ?? [];
  store.clusterFiles.set(clusterId, [...existing, file]);

  // Keep fileCount on Cluster in sync
  const clusterIdx = store.clusters.findIndex((c) => c.id === clusterId);
  const clusterName = clusterIdx >= 0 ? store.clusters[clusterIdx].name : clusterId;
  if (clusterIdx >= 0) {
    store.clusters[clusterIdx] = {
      ...store.clusters[clusterIdx],
      fileCount: store.clusters[clusterIdx].fileCount + 1,
    };
  }

  // Append to update log
  pushUpdate({
    actor: "本机节点",
    action: `上传文件至《${clusterName}》`,
    type: "file",
    now,
  });

  return file;
}

// ── Update log helpers ────────────────────────────────────────────────────────

function pad2(n: number) { return String(n).padStart(2, "0"); }

function pushUpdate(opts: {
  actor: string;
  action: string;
  type: "cluster" | "file";
  now: Date;
}) {
  const { actor, action, type, now } = opts;
  const h = pad2(now.getHours());
  const m = pad2(now.getMinutes());
  const dateStr = `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}`;
  const entry: DatabaseUpdate = {
    id: `upd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    time: `${h}:${m}`,
    date: dateStr,
    actor,
    action,
    type,
    timestamp: now.getTime(),
  };
  // Insert at front (newest first)
  store.updateLog.unshift(entry);
}

export function getUpdateLog(): DatabaseUpdate[] {
  return [...store.updateLog];
}
