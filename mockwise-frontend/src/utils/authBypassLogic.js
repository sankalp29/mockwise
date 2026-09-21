/**
 * Pure auth-bypass resolution (no Vite env access).
 * @param {unknown} flagValue - raw VITE_BYPASS_AUTH
 * @param {boolean} isProd - true for production builds
 * @returns {{ bypass: boolean, blockedInProd: boolean }}
 */
export function resolveAuthBypass(flagValue, isProd) {
  const flagOn = String(flagValue || '').toLowerCase() === 'true';
  if (flagOn && isProd) {
    return { bypass: false, blockedInProd: true };
  }
  return { bypass: flagOn && !isProd, blockedInProd: false };
}
