import { createAuthClient } from '@neondatabase/auth/next';

// Points to YOUR Next.js app's proxy route → which forwards to Neon Auth
export const authClient = createAuthClient();

export const { signIn, signUp, useSession, signOut, verifyEmail, sendVerificationEmail, emailOtp } = authClient;
