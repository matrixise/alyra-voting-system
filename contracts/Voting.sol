// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import '@openzeppelin/contracts/access/Ownable.sol';

/**
 * @title Voting Smart Contract
 * @notice Manages a decentralized voting process with proposals and votes.
 * @dev Implements a structured voting workflow.
 */
contract Voting is Ownable {
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedProposalId;
    }

    struct Proposal {
        string description;
        uint voteCount;
    }

    enum WorkflowStatus {
        RegisteringVoters,
        ProposalsRegistrationStarted,
        ProposalsRegistrationEnd,
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied
    }

    uint[] private winningProposalIds;
    WorkflowStatus public workflowStatus;
    mapping(address => Voter) private voters;
    Proposal[] private proposals;
    mapping(string => bool) private existingProposals;

    event VoterRegistered(address voterAddress);
    event WorkflowStatusChange(
        WorkflowStatus previousStatus,
        WorkflowStatus newStatus
    );
    event ProposalRegistered(uint proposalId);
    event Voted(address voter, uint proposalId);

    modifier onlyVoter() {
        require(voters[msg.sender].isRegistered, 'Voter is not registered');
        _;
    }

    /**
     * @notice Deploys the Voting contract and assigns the deployer as the owner.
     */
    constructor() Ownable(msg.sender) {}

    /**
     * @notice Registers a new voter.
     * @dev
     * - Can only be called by the contract owner.
     * - The workflow status must be `RegisteringVoters`.
     * - The voter must not already be registered.
     * @param _voter Address of the voter to be registered.
     */
    function registerVoter(address _voter) external onlyOwner {
        require(address(0) != _voter, "Voter can't be the zero address");
        require(
            workflowStatus == WorkflowStatus.RegisteringVoters,
            'Workflow must be RegisteringVoters'
        );
        require(!voters[_voter].isRegistered, 'Voter already registered');
        voters[_voter].isRegistered = true;
        emit VoterRegistered(_voter);
    }

    /**
     * @notice Starts the proposal registration phase.
     * @dev
     * - Only the owner can start the proposals registration.
     * - the workflow status must be 'RegisteringVoters'.
     * - Emits a {WorkflowStatusChange} event.
     */
    function startProposalsRegistration() external onlyOwner {
        require(
            workflowStatus == WorkflowStatus.RegisteringVoters,
            'Workflow must be RegisteringVoters'
        );
        workflowStatus = WorkflowStatus.ProposalsRegistrationStarted;
        emit WorkflowStatusChange(
            WorkflowStatus.RegisteringVoters,
            workflowStatus
        );
    }

    /**
     * @notice Registers a new proposal.
     * @dev
     * - Only the voter can register proposals.
     * - The workflow status must be 'ProposalsRegistrationStarted'.
     * - The proposal description can't be empty.
     * - The proposal description must be unique.
     * - Emits a {ProposalRegistered} event.
     * @param _description The description of the proposal.
     */
    function registerProposal(string calldata _description) external onlyVoter {
        require(
            workflowStatus == WorkflowStatus.ProposalsRegistrationStarted,
            'Workflow must be ProposalsRegistrationStarted'
        );
        require(
            bytes(_description).length > 0,
            "The description can't be empty"
        );
        require(!existingProposals[_description], 'Proposal already exists');

        proposals.push(Proposal(_description, 0));
        existingProposals[_description] = true;
        uint proposalId = proposals.length - 1;

        emit ProposalRegistered(proposalId);
    }

    /**
     * @notice Ends the proposal registration phase.
     * @dev
     * - Only the owner can stop the proposals registration.
     * - The workflow status must be 'ProposalsRegistrationStarted'.
     * - Emits a {WorkflowStatusChange} event.
     */
    function endProposalsRegistration() external onlyOwner {
        require(
            workflowStatus == WorkflowStatus.ProposalsRegistrationStarted,
            'Workflow must be ProposalsRegistrationStarted'
        );
        workflowStatus = WorkflowStatus.ProposalsRegistrationEnd;
        emit WorkflowStatusChange(
            WorkflowStatus.ProposalsRegistrationStarted,
            workflowStatus
        );
    }

    /**
     * @notice Starts the voting session.
     * @dev
     * - Only the owner can register proposals.
     * - The workflow status must be 'ProposalsRegistrationEnd'.
     * - Emits a {WorkflowStatusChange} event.
     */
    function startVotingSession() external onlyOwner {
        require(
            workflowStatus == WorkflowStatus.ProposalsRegistrationEnd,
            'Workflow must be ProposalsRegistrationEnd'
        );

        workflowStatus = WorkflowStatus.VotingSessionStarted;
        emit WorkflowStatusChange(
            WorkflowStatus.ProposalsRegistrationEnd,
            workflowStatus
        );
    }

    /**
     * @notice Votes for a proposal.
     * @dev
     * - The voter must be registered (`onlyVoter` modifier ensures this).
     * - The workflow status must be 'VotingSessionStarted'.
     * - The voting session must be active.
     * - The proposal ID must be valid.
     * - The voter must not have already voted.
     * - Emits {Voted} event.
     * @param _proposalId The ID of the proposal to vote for.
     */
    function vote(uint _proposalId) external onlyVoter {
        require(
            workflowStatus == WorkflowStatus.VotingSessionStarted,
            'Workflow must be VotingSessionStarted'
        );
        require(_proposalId < proposals.length, 'Invalid proposal');
        require(!voters[msg.sender].hasVoted, 'Voter has already voted');

        voters[msg.sender].hasVoted = true;
        voters[msg.sender].votedProposalId = _proposalId;
        proposals[_proposalId].voteCount++;

        emit Voted(msg.sender, _proposalId);
    }

    /**
     * @notice Ends the voting session.
     * @dev
     * - Only the owner can register proposals.
     * - The workflow status must be 'VotingSessionStarted'.
     * - Emits a {WorkflowStatusChange} event.
     */
    function endVotingSession() external onlyOwner {
        require(
            workflowStatus == WorkflowStatus.VotingSessionStarted,
            'Workflow must be VotingSessionStarted'
        );

        workflowStatus = WorkflowStatus.VotingSessionEnded;
        emit WorkflowStatusChange(
            WorkflowStatus.VotingSessionStarted,
            workflowStatus
        );
    }

    /**
     * @notice Tally votes and determine the winning proposal.
     * @dev
     * - Only the owner can register proposals.
     * - The workflow status must be 'VotingSessionEnded'.
     * - Emits a {WorkflowStatusChange} event.
     */
    function tallyVotes() external onlyOwner {
        // TODO: Handle when there is no votes...
        require(
            workflowStatus == WorkflowStatus.VotingSessionEnded,
            'Workflow must be VotingSessionEnded'
        );

        uint maxVoteCount = 0;
        uint currentVoteCount;

        for (uint i = 0; i < proposals.length; i++) {
            currentVoteCount = proposals[i].voteCount;
            if (currentVoteCount > maxVoteCount) {
                maxVoteCount = currentVoteCount;
                delete winningProposalIds;
                winningProposalIds.push(i);
            } else if (currentVoteCount == maxVoteCount) {
                winningProposalIds.push(i);
            }
        }

        workflowStatus = WorkflowStatus.VotesTallied;

        emit WorkflowStatusChange(
            WorkflowStatus.VotingSessionEnded,
            workflowStatus
        );
    }

    /**
     * @notice Retrieves the winning proposal.
     * @dev
     * - The workflow status must be 'VotesTallied'.
     * @return The description of the winning proposal.
     */
    function getWinnerProposalsIds() external view returns (uint[] memory) {
        require(
            workflowStatus == WorkflowStatus.VotesTallied,
            'Workflow must be VotesTallied'
        );
        return winningProposalIds;
    }
}
