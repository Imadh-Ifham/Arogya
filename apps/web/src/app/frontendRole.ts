import { useSyncExternalStore } from "react";

export type FrontendRole = "patient" | "doctor" | "admin";

const STORAGE_KEY = "frontend:selected-role";
const USER_ID_STORAGE_KEY = "frontend:selected-user-id";
const ROLE_CHANGE_EVENT = "frontend-role:change";

const VALID_ROLES: FrontendRole[] = ["patient", "doctor", "admin"];
const ROLE_USER_IDS: Record<FrontendRole, string> = {
  doctor: "1234",
  patient: "5678",
  admin: "3333333333",
};

function isFrontendRole(value: string | null): value is FrontendRole {
  return !!value && VALID_ROLES.includes(value as FrontendRole);
}

export function getFrontendRole(): FrontendRole | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  return isFrontendRole(stored) ? stored : null;
}

export function getFrontendUserId(): string | null {
  const storedUserId = localStorage.getItem(USER_ID_STORAGE_KEY);
  if (storedUserId) {
    return storedUserId;
  }

  const role = getFrontendRole();
  if (!role) {
    return null;
  }

  const derivedUserId = ROLE_USER_IDS[role];
  localStorage.setItem(USER_ID_STORAGE_KEY, derivedUserId);
  return derivedUserId;
}

function emitRoleChange() {
  window.dispatchEvent(new Event(ROLE_CHANGE_EVENT));
}

export function setFrontendRole(role: FrontendRole) {
  localStorage.setItem(STORAGE_KEY, role);
  localStorage.setItem(USER_ID_STORAGE_KEY, ROLE_USER_IDS[role]);
  emitRoleChange();
}

export function clearFrontendRole() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(USER_ID_STORAGE_KEY);
  emitRoleChange();
}

export function getRoleHomePath(role: FrontendRole): string {
  if (role === "doctor") return "/doctor/dashboard";
  if (role === "admin") return "/admin/dashboard";
  return "/appointments";
}

function subscribe(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener(ROLE_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(ROLE_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useFrontendRole() {
  return useSyncExternalStore(subscribe, getFrontendRole, getFrontendRole);
}

export function useFrontendUserId() {
  return useSyncExternalStore(subscribe, getFrontendUserId, getFrontendUserId);
}
