"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useWatermark } from "@/app/components/watermark/WatermarkProvider";

const RUNTIME_STORAGE_KEY = "main-platform-runtime-profile-v1";
const DEFAULT_USERNAME = "图书馆-法律文献区";
const RUNTIME_PLATE_IDS: RuntimePlateId[] = ["plate-1", "plate-2", "plate-3", "plate-4", "plate-5"];
const LEGACY_SELF_USERNAME_MAP: Record<string, string> = {
  "安保处": DEFAULT_USERNAME,
  "本机节点": DEFAULT_USERNAME,
};

export type RuntimePlateId = "plate-1" | "plate-2" | "plate-3" | "plate-4" | "plate-5";

export interface SavedNodeLocation {
  plateId: RuntimePlateId;
  mapX: number;
  mapY: number;
  mapViewBoxWidth: number;
  mapViewBoxHeight: number;
  desktopX: number;
  desktopY: number;
  sceneX: number;
  sceneY: number;
  savedAt: number;
}

interface PersistedRuntimeState {
  username: string;
  avatarDataUrl: string | null;
  judgeModelConfigured: boolean;
  savedNodeLocation: SavedNodeLocation | null;
}

interface AppRuntimeContextValue extends PersistedRuntimeState {
  locationRevision: number;
  isSelfCenterNode: boolean;
  setUsername: (nextUsername: string) => void;
  setAvatarDataUrl: (nextAvatarDataUrl: string | null) => void;
  setJudgeModelConfigured: (configured: boolean) => void;
  setSavedNodeLocation: (nextLocation: SavedNodeLocation | null) => void;
  setIsSelfCenterNode: (isCenter: boolean) => void;
}

const DEFAULT_RUNTIME_STATE: PersistedRuntimeState = {
  username: DEFAULT_USERNAME,
  avatarDataUrl: null,
  judgeModelConfigured: false,
  savedNodeLocation: null,
};

const AppRuntimeContext = createContext<AppRuntimeContextValue | null>(null);

function normalizeUsername(nextUsername: string): string {
  const normalized = nextUsername.trim();
  if (!normalized) return DEFAULT_USERNAME;
  return LEGACY_SELF_USERNAME_MAP[normalized] ?? normalized;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isSavedNodeLocation(value: unknown): value is SavedNodeLocation {
  if (!value || typeof value !== "object") return false;

  const location = value as Partial<SavedNodeLocation>;
  const validPlateId =
    typeof location.plateId === "string" &&
    RUNTIME_PLATE_IDS.includes(location.plateId as RuntimePlateId);

  return (
    validPlateId &&
    isFiniteNumber(location.mapX) &&
    isFiniteNumber(location.mapY) &&
    isFiniteNumber(location.mapViewBoxWidth) &&
    isFiniteNumber(location.mapViewBoxHeight) &&
    isFiniteNumber(location.desktopX) &&
    isFiniteNumber(location.desktopY) &&
    isFiniteNumber(location.sceneX) &&
    isFiniteNumber(location.sceneY) &&
    isFiniteNumber(location.savedAt)
  );
}

function readPersistedRuntimeState(): PersistedRuntimeState {
  if (typeof window === "undefined") {
    return DEFAULT_RUNTIME_STATE;
  }

  try {
    const raw = window.localStorage.getItem(RUNTIME_STORAGE_KEY);
    if (!raw) return DEFAULT_RUNTIME_STATE;
    const parsed = JSON.parse(raw) as Partial<PersistedRuntimeState>;

    return {
      username: normalizeUsername(typeof parsed.username === "string" ? parsed.username : DEFAULT_USERNAME),
      avatarDataUrl: typeof parsed.avatarDataUrl === "string" ? parsed.avatarDataUrl : null,
      judgeModelConfigured: Boolean(parsed.judgeModelConfigured),
      savedNodeLocation: isSavedNodeLocation(parsed.savedNodeLocation) ? parsed.savedNodeLocation : null,
    };
  } catch {
    return DEFAULT_RUNTIME_STATE;
  }
}

interface AppRuntimeProviderProps {
  children: ReactNode;
}

export function AppRuntimeProvider({ children }: AppRuntimeProviderProps) {
  const { setWatermarkName } = useWatermark();
  const [runtimeState, setRuntimeState] = useState<PersistedRuntimeState>(() => readPersistedRuntimeState());
  const [locationRevision, setLocationRevision] = useState(0);
  const [isSelfCenterNode, setIsSelfCenterNode] = useState(false);

  useEffect(() => {
    setWatermarkName(runtimeState.username);
  }, [runtimeState.username, setWatermarkName]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(RUNTIME_STORAGE_KEY, JSON.stringify(runtimeState));
  }, [runtimeState]);

  const setUsername = useCallback((nextUsername: string) => {
    setRuntimeState((prev) => ({
      ...prev,
      username: normalizeUsername(nextUsername),
    }));
  }, []);

  const setAvatarDataUrl = useCallback((nextAvatarDataUrl: string | null) => {
    setRuntimeState((prev) => ({
      ...prev,
      avatarDataUrl: nextAvatarDataUrl,
    }));
  }, []);

  const setJudgeModelConfigured = useCallback((configured: boolean) => {
    setRuntimeState((prev) => ({
      ...prev,
      judgeModelConfigured: configured,
    }));
  }, []);

  const setSavedNodeLocation = useCallback((nextLocation: SavedNodeLocation | null) => {
    setRuntimeState((prev) => ({
      ...prev,
      savedNodeLocation: nextLocation,
    }));
    setLocationRevision((prev) => prev + 1);
  }, []);

  const contextValue = useMemo<AppRuntimeContextValue>(
    () => ({
      ...runtimeState,
      locationRevision,
      isSelfCenterNode,
      setUsername,
      setAvatarDataUrl,
      setJudgeModelConfigured,
      setSavedNodeLocation,
      setIsSelfCenterNode,
    }),
    [
      isSelfCenterNode,
      locationRevision,
      runtimeState,
      setAvatarDataUrl,
      setJudgeModelConfigured,
      setSavedNodeLocation,
      setUsername,
      setIsSelfCenterNode,
    ],
  );

  return <AppRuntimeContext.Provider value={contextValue}>{children}</AppRuntimeContext.Provider>;
}

export function useAppRuntime() {
  const context = useContext(AppRuntimeContext);
  if (!context) {
    throw new Error("useAppRuntime must be used within AppRuntimeProvider");
  }
  return context;
}
