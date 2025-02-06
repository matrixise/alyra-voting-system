// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import '@openzeppelin/contracts/access/Ownable.sol';
import 'hardhat/console.sol';

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

    uint private winningProposalId;
    WorkflowStatus public workflowStatus;
    mapping(address => Voter) private voters;
    uint private proposalCount;
    Proposal[] private proposals;
    mapping(string => bool) private existingProposals;

    event VoterRegistered(address voterAddress);
    event WorkflowStatusChange(
        WorkflowStatus previousStatus,
        WorkflowStatus newStatus
    );
    event ProposalRegistered(uint proposalId);
    event Voted(address voter, uint proposalId);

    constructor() Ownable(msg.sender) {}

    function registerVoter(address _voter) external onlyOwner {
        require(
            workflowStatus == WorkflowStatus.RegisteringVoters,
            'Workflow must be RegisteringVoters'
        );
        require(!voters[_voter].isRegistered, 'Voter already registered');
        voters[_voter].isRegistered = true;
        emit VoterRegistered(_voter);
    }

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

    function registerProposal(string calldata _description) external onlyOwner {
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

    function getWinner() external view returns (uint) {
        require(
            workflowStatus == WorkflowStatus.VotesTallied,
            'Votes not tallied yet'
        );
        return winningProposalId;
    }
}
