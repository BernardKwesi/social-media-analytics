declare global {
  interface ImportMeta {
    env: {
      VITE_SUPABASE_PROJECT_ID: string;
      VITE_SUPABASE_ANON_KEY: string;
      [key: string]: string | undefined;
    };
  }
}

export const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;