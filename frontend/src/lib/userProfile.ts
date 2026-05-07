export interface UserProfile {
  id: string;
  name: string;
  role: string;
  company: string;
  location: string;
  createdAt: string;
}

const STORAGE_KEY = "fraud-lab-profile";

export function getProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function createProfile(data: { name: string; role: string; company: string; location: string }): UserProfile {
  const profile: UserProfile = {
    id: crypto.randomUUID(),
    name: data.name,
    role: data.role,
    company: data.company,
    location: data.location,
    createdAt: new Date().toISOString(),
  };
  saveProfile(profile);
  return profile;
}
