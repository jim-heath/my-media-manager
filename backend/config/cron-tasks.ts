export default {
  enrichPendingAlbums: {
    task: async ({ strapi }) => {
      strapi.log.info('[Cron] Running scheduled metadata enrichment...');
      try {
        const metadataService = strapi.service('api::metadata.metadata');
        if (metadataService) {
          await metadataService.enrichPendingAlbums();
          strapi.log.info('[Cron] Metadata enrichment completed');
        } else {
          strapi.log.error('[Cron] Metadata service not found');
        }
      } catch (error: any) {
        strapi.log.error('[Cron] Error during enrichment:', error.message);
      }
    },
    options: {
      rule: '* 0 * * *',  // Every day at midnight
    },
  },
};
