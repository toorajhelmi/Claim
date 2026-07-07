const appName = import.meta.env.VITE_APP_NAME || 'Klaimd';
const appDomain = import.meta.env.VITE_APP_DOMAIN || 'klaimd.app';
const configuredAuthRedirectOrigin = import.meta.env.VITE_AUTH_REDIRECT_ORIGIN;

export const appConfig = {
  name: appName,
  domain: appDomain,
  authRedirectOrigin: configuredAuthRedirectOrigin,
  description: `${appName} turns bold future goals into backed public events with pledges, proof, and verified outcomes.`,
  tagline: 'Say it. Stake it. Prove it.',
};
