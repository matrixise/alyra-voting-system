// Reading: https://hardhat.org/tutorial/testing-contracts#writing-tests
import { loadFixture } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers';

const { expect } = require('chai');
import hre from 'hardhat';
import { getAddress } from 'viem';

enum WorkflowStatus {
  RegisteringVoters = 0,
  ProposalsRegistrationStarted = 1,
  ProposalsRegistrationEnd = 2,
  VotingSessionStarted = 3,
  VotingSessionEnded = 4,
  VotesTallied = 5,
}

async function deployVotingFixture() {
  const [owner, addr1, addr2] = await hre.viem.getWalletClients();
  const voting = await hre.viem.deployContract('Voting');
  return { voting, owner, addr1, addr2 };
}

describe('Voting System', function () {
  let voting: {
      read: {
        owner: () => any;
        getWinner: () => any;
        workflowStatus: () => any;
      };
      write: {
        startProposalsRegistration: () => any;
        endProposalsRegistration: () => any;
        startVotingSession: () => any;
        endVotingSession: () => any;
        registerVoter: (p: any[]) => any;
        vote: (numbers: number[], p: { account: { address: any } }) => any;
        registerProposal: (strings: string[]) => any;
      };
      getEvents: {
        WorkflowStatusChange: () => any;
        ProposalRegistered: () => any;
        VoterRegistered: () => any;
      };
    },
    owner: { account: { address: any } },
    addr1: { account: { address: any } },
    addr2: { account: { address: any } };

  beforeEach(async function () {
    ({ voting, owner, addr1, addr2 } = await loadFixture(deployVotingFixture));
  });

  it('Should deploy the contract and set the owner', async function () {
    expect(await voting.read.owner()).to.equal(
      getAddress(owner.account.address),
    );
  });

  it('Should return the initial winningProposalId as 0', async function () {
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
      const workflowStatus = await voting.read.workflowStatus();
      expect(workflowStatus).to.equal(0);
    });
  });

  describe('Proposal Registration', function () {
    it("Can't register a proposal (workflow not started)", async function () {
      await expect(
        voting.write.registerProposal(['Proposal 1']),
      ).to.be.rejectedWith('Workflow must be ProposalsRegistrationStarted');
    });

    it('Verify startProposalsRegistration Event', async function () {
      await voting.write.startProposalsRegistration();

      let events = await voting.getEvents.WorkflowStatusChange();
      expect(events).to.have.lengthOf(1);
      expect(events[0].args.previousStatus).to.equal(
        WorkflowStatus.RegisteringVoters,
      );
      expect(events[0].args.newStatus).to.equal(
        WorkflowStatus.ProposalsRegistrationStarted,
      );
    });

    it("Can't register an empty proposal", async function () {
      await voting.write.startProposalsRegistration();
      await expect(voting.write.registerProposal([''])).to.be.rejectedWith(
        "The description can't be empty",
      );
    });

    it("Can't register an existing proposal", async function () {
      await voting.write.startProposalsRegistration();
      await voting.write.registerProposal(['Proposal 1']);
      await expect(
        voting.write.registerProposal(['Proposal 1']),
      ).to.be.rejectedWith('Proposal already exists');
    });

    it("Can't stop the registration (workflow not started)", async function () {
      await expect(voting.write.endProposalsRegistration()).to.be.rejectedWith(
        'Workflow must be ProposalsRegistrationStarted',
      );
    });

    it('Get Event from registerProposal', async function () {
      await voting.write.startProposalsRegistration();

      await voting.write.registerProposal(['Proposal 1']);

      let events = await voting.getEvents.ProposalRegistered();
      expect(events).to.have.lengthOf(1);
      expect(events[0].args.proposalId).to.equal(0n);

      await voting.write.registerProposal(['Proposal 2']);

      events = await voting.getEvents.ProposalRegistered();
      expect(events).to.have.lengthOf(1);
      expect(events[0].args.proposalId).to.equal(1n);
    });

    it('Get Event from endProposalsRegistration', async function () {
      await voting.write.startProposalsRegistration();

      await voting.write.endProposalsRegistration();
      let events = await voting.getEvents.WorkflowStatusChange();
      expect(events).to.have.lengthOf(1);
      expect(events[0].args.previousStatus).to.equal(
        WorkflowStatus.ProposalsRegistrationStarted,
      );
      expect(events[0].args.newStatus).to.equal(
        WorkflowStatus.ProposalsRegistrationEnd,
      );
    });
  });

  describe('Voting Session', function () {
    beforeEach(async function () {
      await voting.write.registerVoter([addr1.account.address]);
      await voting.write.startProposalsRegistration();
      await voting.write.registerProposal(['Proposal 1']);
      await voting.write.endProposalsRegistration();
    });

    it('Get Event for startVotingSession', async function () {
      await voting.write.startVotingSession();

      const events = await voting.getEvents.WorkflowStatusChange();

      expect(events).to.have.lengthOf(1);
      expect(events[0].args.previousStatus).to.equal(
        WorkflowStatus.ProposalsRegistrationEnd,
      );
      expect(events[0].args.newStatus).to.equal(
        WorkflowStatus.VotingSessionStarted,
      );
    });

    it('Get Event for endVotingSession', async function () {
      await voting.write.startVotingSession();
      await voting.write.endVotingSession();

      const events = await voting.getEvents.WorkflowStatusChange();

      expect(events).to.have.lengthOf(1);
      expect(events[0].args.previousStatus).to.equal(
        WorkflowStatus.VotingSessionStarted,
      );
      expect(events[0].args.newStatus).to.equal(
        WorkflowStatus.VotingSessionEnded,
      );
    });

    it('User is not a voter', async function () {
      // the current sender (aka owner) is not a voter
      const voteCall = voting.write.vote([0], { account: owner.account });
      await expect(voteCall).to.be.rejectedWith('Voter is not registered');
    });

    it('User is a voter', async function () {
      // addr1 is a voter
      const voteCall = voting.write.vote([0], { account: addr1.account });
      await expect(voteCall).to.be.rejectedWith(
        'Workflow must be VotingSessionStarted',
      );
    });

    it('Voter votes for an invalid proposal', async function () {
      // addr1 is a voter
      await voting.write.startVotingSession();
      const voteCall = voting.write.vote([20], { account: addr1.account });
      await expect(voteCall).to.be.rejectedWith('Invalid proposal');
    });

    it('Voter has already voted', async function () {
      await voting.write.startVotingSession();
      voting.write.vote([0], { account: addr1.account });
      const voteCall = voting.write.vote([0], { account: addr1.account });
      await expect(voteCall).to.be.rejectedWith('Voter has already voted');
    });
  });

  describe('Events', function () {
    it('Should emit an event on VoterRegistered', async function () {
      await voting.write.registerVoter([addr1.account.address]);
      const events = await voting.getEvents.VoterRegistered();
      expect(events).to.have.lengthOf(1);
      expect(events[0].args.voterAddress).to.equal(
        getAddress(addr1.account.address),
      );
    });

    it('Should emit an event on WorkflowStatusChange', async function () {
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
      // Register the voter
      await voting.write.registerVoter([addr1.account.address]);
      // I am already registered -> rejected
      await expect(
        voting.write.registerVoter([addr1.account.address]),
      ).to.be.rejectedWith('Voter already registered');
    });
  });
});
