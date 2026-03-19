// In-memory database store — MVP.
// Replace with Prisma + SQLite/S3 in the next iteration without changing the API contract.

import type { ClusterFile, AddClusterFileBody } from "./cluster-files-contract";

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

// Module-level singleton — lives for the lifetime of the Node.js process.
const store = {
  clusters: [...DEFAULT_CLUSTERS] as Cluster[],
  // Map<clusterId, ClusterFile[]> — replaced with DB query in persistent mode.
  clusterFiles: new Map<string, ClusterFile[]>(),
};

// ── Cluster functions ─────────────────────────────────────────────────────────

export function getClusters(): Cluster[] {
  return [...store.clusters];
}

export function addCluster(name: string): Cluster {
  const today = new Date().toISOString().slice(0, 10);
  const cluster: Cluster = {
    id: `cluster-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    fileCount: 0,
    createdAt: today,
  };
  store.clusters.push(cluster);
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
  const today = new Date().toISOString().slice(0, 10);
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
  if (clusterIdx >= 0) {
    store.clusters[clusterIdx] = {
      ...store.clusters[clusterIdx],
      fileCount: store.clusters[clusterIdx].fileCount + 1,
    };
  }

  return file;
}
