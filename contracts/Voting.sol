// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import '@openzeppelin/contracts/access/Ownable.sol';
import 'hardhat/console.sol';

contract Voting is Ownable {
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedPropposalId;
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

    uint winningProposalId;
    WorkflowStatus public workflowStatus;
    mapping(address => Voter) voters;

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
            'The workflow has to be in Registering mode'
        );
        require(!voters[_voter].isRegistered, 'Voter already registered');
        voters[_voter].isRegistered = true;
        emit VoterRegistered(_voter);
    }

    function getWinner() external view returns (uint) {
        require(
            workflowStatus == WorkflowStatus.VotesTallied,
            'Votes not tallied yet'
        );
        return winningProposalId;
    }
}
