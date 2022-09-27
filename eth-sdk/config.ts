import {defineConfig} from '@dethcrypto/eth-sdk';

export default defineConfig({
  outputPath: 'src/eth-sdk-build',
  contracts: {
    mainnet: {
      job: '0xa61d82a9127B1c1a34Ce03879A068Af5b786C835',
    },
  },
});
