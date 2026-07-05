const appName = import.meta.env.VITE_APP_NAME || 'Claimroom';
const appDomain = import.meta.env.VITE_APP_DOMAIN || 'claimroom.app';

export const appConfig = {
  name: appName,
  domain: appDomain,
  description: `${appName} turns bold creator claims into backed public events with pledges, proof, and verified outcomes.`,
  tagline: 'Say it. Stake it. Prove it.',
};
