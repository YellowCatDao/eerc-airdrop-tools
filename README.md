# EERC Airdrop Tools

A comprehensive toolkit for managing encrypted ERC20 (EERC) token operations on Avalanche, including robust airdrop functionality with state tracking and recovery capabilities.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file with your configuration:
   ```
   cp .env.example .env
   ```
   Then edit the `.env` file to include your actual values.

3. Download the ZK circuit files from the EERC Github repository using the instructions above.

4. Build the TypeScript files:
   ```
   npm run build
   ```

## ZK Circuit Files

This project requires ZK circuit files to be downloaded from
the [EncryptedERC](https://github.com/ava-labs/EncryptedERC) repository. Use the following commands to download all the
necessary circuit files:

```bash
# Create directory structure
mkdir -p data/zk_files/registration data/zk_files/transfer data/zk_files/mint data/zk_files/withdraw data/zk_files/burn

# Download registration circuit files
wget -O data/zk_files/registration/registration.wasm https://github.com/ava-labs/EncryptedERC/raw/refs/heads/main/circom/build/registration/registration.wasm
wget -O data/zk_files/registration/circuit_final.zkey https://github.com/ava-labs/EncryptedERC/raw/refs/heads/main/circom/build/registration/circuit_final.zkey

# Download transfer circuit files
wget -O data/zk_files/transfer/transfer.wasm https://github.com/ava-labs/EncryptedERC/raw/refs/heads/main/circom/build/transfer/transfer.wasm
wget -O data/zk_files/transfer/transfer.zkey https://github.com/ava-labs/EncryptedERC/raw/refs/heads/main/circom/build/transfer/transfer.zkey

# Download mint circuit files
wget -O data/zk_files/mint/mint.wasm https://github.com/ava-labs/EncryptedERC/raw/refs/heads/main/circom/build/mint/mint.wasm
wget -O data/zk_files/mint/mint.zkey https://github.com/ava-labs/EncryptedERC/raw/refs/heads/main/circom/build/mint/mint.zkey

# Download withdraw circuit files
wget -O data/zk_files/withdraw/withdraw.wasm https://github.com/ava-labs/EncryptedERC/raw/refs/heads/main/circom/build/withdraw/withdraw.wasm
wget -O data/zk_files/withdraw/circuit_final.zkey https://github.com/ava-labs/EncryptedERC/raw/refs/heads/main/circom/build/withdraw/circuit_final.zkey

# Download burn circuit files
wget -O data/zk_files/burn/burn.wasm https://github.com/ava-labs/EncryptedERC/raw/refs/heads/main/circom/build/burn/burn.wasm
wget -O data/zk_files/burn/burn.zkey https://github.com/ava-labs/EncryptedERC/raw/refs/heads/main/circom/build/burn/burn.zkey
```

## Available Tools

All tools support the following parameters:

- `--env-file=.env.custom` - Specify a different environment file
- `--chain=fuji|mainnet` - Specify which Avalanche chain to use (defaults to 'fuji')
- `--help` - Show help information for the tool

### Admin Tools

#### Set Auditor

Checks registration status and sets the contract auditor public key. You should do this one time after deploying the
EERC contract.

```
npm run set-auditor
```

```
npm run set-auditor -- --chain=mainnet
```

### Utility Tools

#### Check Balance

Displays both regular token balance and encrypted balance in the EERC contract.

```
npm run check-balance
```

```
npm run check-balance -- --token-address=0x123... --chain=mainnet
```

#### Deposit

Deposit regular tokens into your EERC encrypted balance.

```
npm run deposit -- --amount=1.0
```

Required parameters:

- `--amount=1.0` - Amount to deposit (in ETH)

This script automatically handles token approval and transfers tokens from your regular balance into the encrypted EERC system.

#### Withdraw

Withdraw tokens from your EERC encrypted balance back to regular token balance.

```
npm run withdraw -- --amount=0.5
```

Required parameters:

- `--amount=0.5` - Amount to withdraw (in ETH)

This script moves tokens from your encrypted balance back to your regular token balance.

#### Transfer

Transfer EERC tokens to another registered account.

```
npm run transfer -- --to=0x123... --amount=0.01
```

Required parameters:

- `--to=0x...` - The recipient address (must be registered)
- `--amount=0.01` - Amount to transfer (in ETH)

### Airdrop Tools

#### Send Airdrop

**🚀 Advanced bulk token distribution with robust state tracking and recovery capabilities.**

```
npm run send-airdrop -- --file=recipients.csv
```

**Key Features:**
- **State Tracking**: Maintains progress across interruptions and restarts
- **User Categorization**: Automatically separates registered vs unregistered users
- **Error Recovery**: Records and categorizes all failures for manual review
- **Resumable Operations**: Continue from where you left off after interruption
- **Safe Interruption**: 5-second pauses between transfers with Ctrl+C support

**Required parameters:**
- `--file=recipients.csv` - Path to a CSV file with recipient addresses and amounts

**Optional parameters:**
- `--token-address=0x...` - Specify a token address
- `--dry-run` - Run the airdrop in dry-run mode without making actual transfers

**Recipients file format:**
```csv
address,amount
0x1111111111111111111111111111111111111111,0.01
0x2222222222222222222222222222222222222222,0.02
```

**State Files Created:**
The script creates a state directory (e.g., `recipients_airdrop_state/`) containing:
- `remaining_work.csv` - Recipients still to be processed
- `users_not_registered.csv` - Users without EERC public keys  
- `transfer_succeeded.csv` - Successful transfers with transaction hashes
- `failed_to_transfer.csv` - Failed transfers with detailed error messages

**Usage Tips:**
- Run with `--dry-run` first to validate your recipient list
- The script can be safely interrupted (Ctrl+C) and resumed later
- Check the state files to monitor progress and handle any issues
- Unregistered users are moved to a separate file for manual follow-up

### Testing Tools

#### Simple Steps

Performs basic EERC operations: check balances, deposit, withdraw.

```
npm run simple-steps
```

```
npm run simple-steps -- --chain=mainnet
```

## Configuration

All scripts use a common configuration system based on environment variables from a `.env` file:

- `EERC_CONTRACT_ADDRESS` - The EERC contract address (required)
- `REGISTRAR_ADDRESS` - The Registrar contract address (required)
- `PRIVATE_KEY` - Your private key (required, never commit this to a repository)
- `TOKEN_ADDRESS` - The token address to interact with (required for most scripts)

You can create multiple environment files (e.g., `.env.testnet`, `.env.mainnet`) and specify which to use with the
`--env-file` parameter:

```
npm run check-balance -- --env-file=.env.testnet
```

The `--chain` parameter selects between Avalanche Fuji (testnet) or Avalanche C-Chain (mainnet):

```
npm run check-balance -- --chain=mainnet
```

All command-line arguments override corresponding values from the environment file.

## Project Structure

The project is organized into modular components for maintainability and reuse:

```
src/
├── common/                    # Shared utilities and modules
│   ├── config/               # Configuration and environment management
│   │   ├── args-utils.ts     # Command-line argument parsing with validation
│   │   ├── env-utils.ts      # Environment variable loading
│   │   ├── types.ts          # Configuration type definitions
│   │   └── validation.ts     # Configuration validation logic
│   ├── eerc/                 # EERC SDK integration and operations
│   │   ├── eerc-utils.ts     # Core EERC operations (registration, balance queries)
│   │   ├── eerc-write-utils.ts # Write operations (deposit, withdraw, transfer)
│   │   ├── zk-utils.ts       # Zero-knowledge circuit management and proof generation
│   │   └── types.ts          # EERC and ZK type definitions
│   ├── web3/                 # Blockchain client and ERC20 utilities
│   │   ├── client-utils.ts   # Blockchain client creation and management
│   │   ├── erc20-utils.ts    # ERC20 token operations and utilities
│   │   └── types.ts          # Web3 client type definitions
│   └── index.ts              # Unified re-exports for easy importing
└── scripts/                  # Executable scripts organized by function
    ├── admin/                # Administrative operations
    │   └── set-auditor.ts    # Set contract auditor public key after deployment
    ├── airdrop/              # Bulk distribution tools
    │   └── send-airdrop.ts   # Robust airdrop system with state tracking (405 lines)
    ├── testing/              # Test and example scripts
    │   └── simple-steps.ts   # Demonstrates registration, deposit, transfer, and withdrawal
    └── utilities/            # Individual operation tools
        ├── check-balance.ts  # Check encrypted and token balances
        └── transfer.ts       # Transfer EERC tokens between accounts
```

### Architecture Highlights

**Modular Design**: The codebase totals **1,555 lines** across 19 TypeScript files, with clear separation of concerns:

- **Configuration Layer**: Unified argument parsing and environment management
- **EERC Integration**: Complete SDK wrapper with zero-knowledge proof handling  
- **Web3 Utilities**: Blockchain client management and ERC20 operations
- **Script Layer**: Purpose-built tools for specific operations

**Key Shared Functions**:
- `createEERCInstance()` - Complete EERC SDK initialization with all dependencies
- `ensureRegistration()` - Account registration verification and automatic registration
- `transferTokens()` - EERC token transfer operations with proof generation
- `getDecryptedBalance()` - Encrypted balance retrieval and decryption
- `parseArgs()` - Unified command-line parsing with validation

**Common Patterns**:
- ESM module structure with proper TypeScript imports
- Strict typing throughout the codebase
- Environment-based configuration with CLI override support
- Zero-knowledge circuit file management and validation
- Comprehensive error handling and logging
- Consistent async/await patterns for blockchain operations

All scripts use the `createEERCInstance()` function as the foundation for EERC operations. This provides a consistent template for adding new functionality while maintaining the same configuration and initialization patterns.