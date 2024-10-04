import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    clusterApiUrl,
    sendAndConfirmTransaction,
  } from "@solana/web3.js";
  import {
    ExtensionType,
    TOKEN_2022_PROGRAM_ID,
    createInitializeMintInstruction,
    createInitializeNonTransferableMintInstruction,
    getMintLen,
    mintTo,
    createAccount,
  } from "@solana/spl-token";
import { MINTER } from "./utils";
  
  // Initialize connection and wallet
  const payer = MINTER;
  console.log("Payer Address:", payer.publicKey.toString());
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  
  // Constants
  const decimals = 2; // Decimals for Mint Account
  const mintAuthority = payer.publicKey; // Authority that can mint new tokens
  const mintKeypair = Keypair.generate(); // Generate new keypair for Mint Account
  const mint = mintKeypair.publicKey; // Address for Mint Account
  
  async function createMint() {
    try {
      // Size of Mint Account with extension
      const mintLen = getMintLen([ExtensionType.NonTransferable]);
      // Minimum lamports required for Mint Account
      const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);
  
      // Create Mint Account instruction
      const createAccountInstruction = SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mint,
        space: mintLen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      });
  
      // Instructions to initialize Mint Account
      const initializeNonTransferableMintInstruction = createInitializeNonTransferableMintInstruction(
        mint,
        TOKEN_2022_PROGRAM_ID,
      );
  
      const initializeMintInstruction = createInitializeMintInstruction(
        mint,
        decimals,
        mintAuthority,
        null,
        TOKEN_2022_PROGRAM_ID,
      );
  
      // Create and send transaction
      const transaction = new Transaction().add(
        createAccountInstruction,
        initializeNonTransferableMintInstruction,
        initializeMintInstruction,
      );
  
      const transactionSignature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [payer, mintKeypair],
      );
  
      console.log(
        "\nCreate Mint Account:",
        `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`,
      );
  
    } catch (error) {
      console.error("Error creating mint account:", error);
    }
  }
  
  async function createTokenAccounts() {
    try {
      // Create Token Account for Playground wallet
      const sourceTokenAccount = await createAccount(
        connection,
        payer,
        mint,
        payer.publicKey,
        undefined,
        undefined,
        TOKEN_2022_PROGRAM_ID,
      );
  
      // Create a random keypair for a destination Token Account
      const randomKeypair = new Keypair();
      const destinationTokenAccount = await createAccount(
        connection,
        payer,
        mint,
        randomKeypair.publicKey,
        undefined,
        undefined,
        TOKEN_2022_PROGRAM_ID,
      );
  
      console.log("Source Token Account:", sourceTokenAccount.toString());
      console.log("Destination Token Account:", destinationTokenAccount.toString());
  
      return destinationTokenAccount;
  
    } catch (error) {
      console.error("Error creating token accounts:", error);
    }
  }
  
  async function mintTokens(destinationTokenAccount: PublicKey) {
    try {
      // Mint tokens to sourceTokenAccount
      const transactionSignature = await mintTo(
        connection,
        payer,
        mint,
        destinationTokenAccount,
        mintAuthority,
        100,
        undefined,
        undefined,
        TOKEN_2022_PROGRAM_ID,
      );
  
      console.log(
        "\nMint Tokens:",
        `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`,
      );
  
    } catch (error) {
      console.error("Error minting tokens:", error);
    }
  }
  
  // Execute functions
  (async () => {
    await createMint();
    const destinationTokenAccount = await createTokenAccounts();
    await mintTokens(destinationTokenAccount);
  })();
  