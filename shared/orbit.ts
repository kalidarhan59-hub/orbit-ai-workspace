export type OrbitAttachment = {
  id?: string;
  name: string;
  url: string;
  key?: string;
  mimeType: string;
  size?: number;
  kind?: "upload" | "generated";
};

export type OrbitMessageRole = "user" | "assistant";
