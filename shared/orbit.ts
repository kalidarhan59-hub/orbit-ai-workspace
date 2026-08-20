export type OrbitAttachment = {
  id?: string;
  name: string;
  url: string;
  key?: string;
  mimeType: string;
  size?: number;
  kind?: "upload" | "generated";
};

export const ORBIT_CREATION_MODES = ["chat", "image"] as const;
export type OrbitTaskMode = (typeof ORBIT_CREATION_MODES)[number];
export type OrbitMessageRole = "user" | "assistant";
