# Voting Smart Contract

This project contains a **Voting Smart Contract** written in Solidity and tested using **Hardhat** and **Viem**.

## 📌 Features
- **Whitelist system:** Only registered voters can participate.
- **Proposal submission:** Voters can submit proposals during the registration phase.
- **Voting process:** Each voter can vote for one proposal.
- **Workflow management:** The contract follows a structured workflow.
- **Event logging:** Key actions emit events for tracking.

## 🚀 Getting Started
### 1️⃣ Install Dependencies
Run the following command to install Hardhat and other dependencies:
```sh
npm install
```

### 2️⃣ Compile the Smart Contract
Compile the Solidity contract with:
```sh
npx hardhat compile
```

### 3️⃣ Deploy the Smart Contract
To deploy the contract locally using Hardhat:
```sh
npx hardhat node
```
Then, in a separate terminal:
```sh
npx hardhat run scripts/deploy.ts --network localhost
```

### 4️⃣ Run Tests
Execute the test suite using:
```sh
npx hardhat test
```
For a gas usage report:
```sh
REPORT_GAS=true npx hardhat test
```

## 📝 Contract Workflow
The `Voting` contract follows these phases:
1. **RegisteringVoters** - Admin registers voters.
2. **ProposalsRegistrationStarted** - Voters can submit proposals.
3. **ProposalsRegistrationEnded** - Proposal submission ends.
4. **VotingSessionStarted** - Voters can vote.
5. **VotingSessionEnded** - Voting ends.
6. **VotesTallied** - Winner is determined.

## 🔧 Interacting with the Contract
### Registering a Voter (Only Owner)
```ts
await voting.write.registerVoter([voterAddress]);
```

### Starting Proposal Registration
```ts
await voting.write.startProposalsRegistration();
```

### Submitting a Proposal
```ts
await voting.write.registerProposal(["New Proposal"]);
```

### Ending Proposal Registration
```ts
await voting.write.endProposalsRegistration();
```

### Starting Voting Session
```ts
await voting.write.startVotingSession();
```

### Casting a Vote
```ts
await voting.write.vote([proposalId], { account: voterAddress });
```

### Ending Voting Session
```ts
await voting.write.endVotingSession();
```

### Getting the Winner
```ts
const winner = await voting.read.getWinner();
console.log("Winning Proposal ID:", winner);
```

## 📌 Useful Hardhat Commands
```sh
npx hardhat accounts       # List accounts
npx hardhat compile        # Compile contracts
npx hardhat test           # Run tests
npx hardhat node           # Start a local blockchain
# npx hardhat run scripts/deploy.ts --network localhost  # Deploy locally
```

## 📄 License
This project is licensed under the MIT License.

