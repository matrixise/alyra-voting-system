// Reading: https://hardhat.org/tutorial/testing-contracts#writing-tests
import { loadFixture } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers';

const { expect } = require('chai');
import hre from 'hardhat';
import { getAddress } from 'viem';

async function deployVotingFixture() {
  const [owner, addr1, addr2] = await hre.viem.getWalletClients();
  const voting = await hre.viem.deployContract('Voting');
  return { voting, owner, addr1, addr2 };
}

describe('Voting System', function () {
  it('Should deploy the contract and set the owner', async function () {
    const { voting, owner } = await loadFixture(deployVotingFixture);
    expect(await voting.read.owner()).to.equal(
      getAddress(owner.account.address),
    );
  });

  it('Should return the initial winningProposalId as 0', async function () {
    const { voting } = await loadFixture(deployVotingFixture);
    await expect(voting.read.getWinner()).to.be.rejectedWith(
      'Votes not tallied yet',
    );
  });

  // it('Should return the initial winningProposalId as 0', async function () {
  //   const { voting } = await loadFixture(deployVotingFixture);
  //   expect(await voting.read.getWinner()).to.equal(0n);
  // });
  //
  describe('Workflow Status', function () {
    it('Should be equal to RegisteringVoters (0)', async function () {
      const { voting } = await loadFixture(deployVotingFixture);
      const workflowStatus = await voting.read.workflowStatus();
      expect(workflowStatus).to.equal(0);
    });
  });

  describe('Events', function () {
    it('Should emit an event on VoterRegistered', async function () {
      const { voting, addr1 } = await loadFixture(deployVotingFixture);
      await voting.write.registerVoter([addr1.account.address]);
      const events = await voting.getEvents.VoterRegistered();
      expect(events).to.have.lengthOf(1);
      expect(events[0].args.voterAddress).to.equal(
        getAddress(addr1.account.address),
      );
    });

    it('Should emit an event on WorkflowStatusChange', async function () {
      const { voting } = await loadFixture(deployVotingFixture);
      await voting.write.startProposalsRegistration();
      const events = await voting.getEvents.WorkflowStatusChange();
      expect(events).to.have.lengthOf(1);

      await voting.write.endProposalsRegistration();
      const eventsForEndProposal =
        await voting.getEvents.WorkflowStatusChange();
      expect(eventsForEndProposal).to.have.lengthOf(1);
    });

    it('Should emit an event on ProposalRegistered');
    it('Should emit an event on Voted');
  });

  describe('Errors', function () {
    it('A voter is already registered', async function () {
      // First call, new instance of the SC
      const { voting, addr1 } = await loadFixture(deployVotingFixture);
      // Register the voter
      await voting.write.registerVoter([addr1.account.address]);
      // I am already registered -> rejected
      await expect(
        voting.write.registerVoter([addr1.account.address]),
      ).to.be.rejectedWith('Voter already registered');
    });
  });
});
