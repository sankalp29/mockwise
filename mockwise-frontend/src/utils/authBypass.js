/**
 * Testing-only auth/authorization bypass.
 *
 * Enable with: VITE_BYPASS_AUTH=true in .env (restart Vite after change).
 * Hard-blocked in production builds even if the flag is set at build time.
 */
import { logger } from './logger';
import { resolveAuthBypass } from './authBypassLogic';

export { resolveAuthBypass } from './authBypassLogic';

const { bypass, blockedInProd } = resolveAuthBypass(
  import.meta.env.VITE_BYPASS_AUTH ?? 'true',
  import.meta.env.PROD === true
);

if (blockedInProd) {
  logger.error(
    '[MockWise] VITE_BYPASS_AUTH=true is ignored in production builds. Auth bypass is disabled.'
  );
}

export const AUTH_BYPASS = bypass;

/** Placeholder token accepted by the backend when mockwise.auth.disabled=true. */
export const BYPASS_ACCESS_TOKEN = 'auth-disabled';

/** Minimal user shape enough for UI that checks !!user / user.id */
export const BYPASS_USER = {
  id: 'bypass-test-user',
  email: 'test@mockwise.local',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: { provider: 'bypass' },
  user_metadata: { name: 'Test User (auth bypass)' },
};

if (AUTH_BYPASS) {
  logger.warn(
    '[MockWise] AUTH BYPASS is ON (non-production). Login is skipped. ' +
      'Set VITE_BYPASS_AUTH=false to restore Supabase auth.'
  );
}
