import { startSiteServer, stopSiteServer } from '../../scripts/serve-site.mjs';

export default async function globalSetup() {
  await startSiteServer();
  return async () => {
    await stopSiteServer();
  };
}
