const requiredEnvVars = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
} as const;

export function validateEnv(): void {
    const missing: string[] = [];

    Object.entries(requiredEnvVars).forEach(([key, value])  => {
        if (!value) {
            missing.push(key);
        }
    });

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(', ')}\n` +
            'Please check your .env file and try again.'
        );
    }
}

validateEnv();

export const ENV = {
    SUPABASE_URL: requiredEnvVars.EXPO_PUBLIC_SUPABASE_URL!,
    SUPABASE_ANON_KEY: requiredEnvVars.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
} as const;