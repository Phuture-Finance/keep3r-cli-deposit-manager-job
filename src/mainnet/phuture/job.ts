import {Job, JobWorkableGroup, makeid, prelog, toKebabCase} from '@keep3r-network/cli-utils';
import {getMainnetSdk} from '../../eth-sdk-build';
import metadata from './metadata.json';

const getWorkableTxs: Job['getWorkableTxs'] = async (args) => {
  // Setup logs
  const correlationId = toKebabCase(metadata.name);
  const logMetadata = {
    job: metadata.name,
    block: args.advancedBlock,
    logId: makeid(5),
  };
  const logConsole = prelog(logMetadata);

  // Skip job if already in progress
  if (args.skipIds.includes(correlationId)) {
    logConsole.log(`Skipping job`);
    args.subject.complete();
    return;
  }

  logConsole.log(`Trying to work`);

  // Setup job
  const signer = args.fork.ethersProvider.getSigner(args.keeperAddress);
  const {job} = getMainnetSdk(signer);

  try {
    // Check if job is workable
    const canUpdate = await job.canUpdateDeposits({blockTag: args.advancedBlock});

    const notOrNull = canUpdate ? `` : `not`;
    logConsole.warn(`Job ${job.address} can ${notOrNull} update deposits`);

    if (!canUpdate) {
      args.subject.complete();
      return;
    }

    await job.callStatic.updateDeposits({
      blockTag: args.advancedBlock,
    });

    const tx = await job.populateTransaction.updateDeposits({
      nonce: args.keeperNonce,
      gasLimit: 2_000_000,
      type: 2,
    });

    // Create a workable group every bundle burst
    const workableGroups: JobWorkableGroup[] = Array.from({length: args.bundleBurst}, (_, index) => ({
      targetBlock: args.targetBlock + index,
      txs: [tx],
      logId: `${logMetadata.logId}-${makeid(5)}`,
    }));

    // Submit all bundles
    args.subject.next({
      workableGroups,
      correlationId,
    });
  } catch {
    logConsole.warn('Simulation failed, probably in cool-down');
  }

  // Finish job process
  args.subject.complete();
};

const job: Job = {
  getWorkableTxs,
};

module.exports = job;
