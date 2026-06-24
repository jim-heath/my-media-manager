export default () => {
  return {
    upload: {
      config: {
        providerOptions: {
          localServer: {
            maxage: 300000
          }
        },
        sizeLimit: 1000000 // 1MB limit per SRS
      }
    }
  };
};
