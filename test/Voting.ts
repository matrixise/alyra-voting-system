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
  const [owner, addr1, addr2, addr3] = await hre.viem.getWalletClients();
  const voting = await hre.viem.deployContract('Voting');
  return { voting, owner, addr1, addr2, addr3 };
}

describe('Voting System', function () {
  let voting: {
      read: {
        owner: () => any;
        workflowStatus: () => any;
        getWinnerProposalsIds: () => any;
        getProposalDescription: (numbers: number[]) => any;
        proposalHasBeenVoted: (numbers: number[]) => any;
      };
      write: {
        startProposalsRegistration: () => any;
        endProposalsRegistration: () => any;
        startVotingSession: () => any;
        endVotingSession: () => any;
        registerVoter: (p: any[]) => any;
        vote: (numbers: number[], p: { account: { address: any } }) => any;
        registerProposal: (
          strings: string[],
          p: { account: { address: any } },
        ) => number;
        tallyVotes: () => any;
      };
      getEvents: {
        WorkflowStatusChange: () => any;
        ProposalRegistered: () => any;
        VoterRegistered: () => any;
      };
    },
    owner: { account: { address: any } },
    addr1: { account: { address: any } },
    addr2: { account: { address: any } },
    addr3: { account: { address: any } };

  beforeEach(async function () {
    ({ voting, owner, addr1, addr2, addr3 } =
      await loadFixture(deployVotingFixture));
  });

  it('Should deploy the contract and set the owner', async function () {
    expect(await voting.read.owner()).to.equal(
      getAddress(owner.account.address),
    );
  });

  it('Should return the initial winningProposalId as 0', async function () {
    await expect(voting.read.getWinnerProposalsIds()).to.be.rejectedWith(
      'Workflow must be VotesTallied',
    );
  });

  describe('Workflow Status', function () {
    it('Should be equal to RegisteringVoters (0)', async function () {
      const workflowStatus = await voting.read.workflowStatus();
      expect(workflowStatus).to.equal(0);
    });
  });

  it('At least one voter to vote', async function () {
    await expect(voting.write.startProposalsRegistration()).to.be.rejectedWith(
      'At least one voter',
    );
  });

  describe('Proposal Registration', function () {
    beforeEach(async function () {
      await voting.write.registerVoter([addr1.account.address]);
      await voting.write.registerVoter([addr2.account.address]);
      await voting.write.registerVoter([addr3.account.address]);
    });
    it("Can't register a proposal (workflow not started)", async function () {
      await expect(
        voting.write.registerProposal(['Proposal 1'], {
          account: addr1.account,
        }),
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
      await expect(
        voting.write.registerProposal([''], { account: addr1.account }),
      ).to.be.rejectedWith("The description can't be empty");
    });

    it('Register a proposal', async function () {
      await voting.write.startProposalsRegistration();
      await voting.write.registerProposal(['Proposal 1'], {
        account: addr1.account,
      });

      const events = await voting.getEvents.ProposalRegistered();
      expect(events).to.have.lengthOf(1);
      expect(events[0].args.proposalId).to.equal(0n);
    });

    it('Read the description of a proposal', async function () {
      await voting.write.startProposalsRegistration();
      await voting.write.registerProposal(['Proposal 1'], {
        account: addr1.account,
      });
      const events = await voting.getEvents.ProposalRegistered();
      const proposalId = events[0].args.proposalId;
      const description = await voting.read.getProposalDescription([
        proposalId,
      ]);
      expect(description).to.equal('Proposal 1');
    });

    it("Can't register an existing proposal", async function () {
      await voting.write.startProposalsRegistration();
      await voting.write.registerProposal(['Proposal 1'], {
        account: addr1.account,
      });

      const events = await voting.getEvents.ProposalRegistered();
      expect(events).to.have.lengthOf(1);
      await expect(
        voting.write.registerProposal(['Proposal 1'], {
          account: addr2.account,
        }),
      ).to.be.rejectedWith('Proposal already exists');
    });

    it("Can't stop the registration (workflow not started)", async function () {
      await expect(voting.write.endProposalsRegistration()).to.be.rejectedWith(
        'Workflow must be ProposalsRegistrationStarted',
      );
    });

    it('Get Event from registerProposal', async function () {
      await voting.write.startProposalsRegistration();

      await voting.write.registerProposal(['Proposal 1'], {
        account: addr1.account,
      });

      let events = await voting.getEvents.ProposalRegistered();
      expect(events).to.have.lengthOf(1);
      expect(events[0].args.proposalId).to.equal(0n);

      await voting.write.registerProposal(['Proposal 2'], {
        account: addr1.account,
      });

      events = await voting.getEvents.ProposalRegistered();
      expect(events).to.have.lengthOf(1);
      expect(events[0].args.proposalId).to.equal(1n);
    });

    it('At least one proposal', async function () {
      await voting.write.startProposalsRegistration();
      await expect(voting.write.endProposalsRegistration()).to.be.rejectedWith(
        'At least one proposal',
      );
    });

    it('Get Event from endProposalsRegistration', async function () {
      await voting.write.startProposalsRegistration();
      await voting.write.registerProposal(['Proposal 1'], {
        account: addr1.account,
      });

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
      await voting.write.registerVoter([addr2.account.address]);
      await voting.write.registerVoter([addr3.account.address]);
      await voting.write.startProposalsRegistration();
      await voting.write.registerProposal(['Proposal 1'], {
        account: addr1.account,
      });
      await voting.write.registerProposal(['Proposal 2'], {
        account: addr2.account,
      });
      await voting.write.registerProposal(['Proposal 3'], {
        account: addr2.account,
      });
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

    it('At least one vote', async function () {
      await voting.write.startVotingSession();
      await expect(voting.write.endVotingSession()).to.be.rejectedWith(
        'At least one vote',
      );
    });

    it('Get Event for endVotingSession', async function () {
      await voting.write.startVotingSession();
      await voting.write.vote([0], { account: addr1.account });
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

    it('Proposal has been voted', async function () {
      await voting.write.startVotingSession();
      await voting.write.vote([0], { account: addr1.account });
      await voting.write.endVotingSession();

      const hasBeenVoted = await voting.read.proposalHasBeenVoted([0]);
      expect(hasBeenVoted).to.equal(true);
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
      await voting.write.vote([0], { account: addr1.account });
      const voteCall = voting.write.vote([0], { account: addr1.account });
      await expect(voteCall).to.be.rejectedWith('Voter has already voted');
    });

    it('tallyVote has to be in VotingSessionEnd', async function () {
      const call = voting.write.tallyVotes();
      await expect(call).to.be.rejectedWith(
        'Workflow must be VotingSessionEnded',
      );
    });

    it('Get the winner', async function () {
      await voting.write.startVotingSession();
      await voting.write.vote([0], { account: addr1.account });
      await voting.write.vote([1], { account: addr2.account });
      await voting.write.vote([1], { account: addr3.account });
      await voting.write.endVotingSession();
      await voting.write.tallyVotes();

      const events = await voting.getEvents.WorkflowStatusChange();
      expect(events).to.have.lengthOf(1);
      expect(events[0].args.previousStatus).to.equal(
        WorkflowStatus.VotingSessionEnded,
      );
      expect(events[0].args.newStatus).to.equal(WorkflowStatus.VotesTallied);

      const winners = await voting.read.getWinnerProposalsIds();
      expect(winners).to.have.lengthOf(1);
      expect(winners[0]).to.equal(1n);
    });

    it('Get the winners ex-aequo', async function () {
      await voting.write.startVotingSession();
      await voting.write.vote([0], { account: addr1.account });
      await voting.write.vote([1], { account: addr2.account });
      await voting.write.endVotingSession();
      await voting.write.tallyVotes();

      const events = await voting.getEvents.WorkflowStatusChange();
      expect(events).to.have.lengthOf(1);
      expect(events[0].args.previousStatus).to.equal(
        WorkflowStatus.VotingSessionEnded,
      );
      expect(events[0].args.newStatus).to.equal(WorkflowStatus.VotesTallied);

      const winners = await voting.read.getWinnerProposalsIds();
      expect(winners).to.have.lengthOf(2);
      // expect(winners[0]).to.equal(1n);
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
      await voting.write.registerVoter([addr1.account.address]);
      await voting.write.startProposalsRegistration();
      const events = await voting.getEvents.WorkflowStatusChange();
      expect(events).to.have.lengthOf(1);

      await voting.write.registerProposal(['Proposal 1'], {
        account: addr1.account,
      });

      await voting.write.endProposalsRegistration();
      const eventsForEndProposal =
        await voting.getEvents.WorkflowStatusChange();
      expect(eventsForEndProposal).to.have.lengthOf(1);
    });
  });

  describe('Errors', function () {
    it("A voter can't be the zero address", async function () {
      const zeroAddress = getAddress(
        '0x0000000000000000000000000000000000000000',
      );
      await expect(
        voting.write.registerVoter([zeroAddress]),
      ).to.be.rejectedWith("Voter can't be the zero address");
    });
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
