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
  getOrCreateAssociatedTokenAccount,
  TYPE_SIZE,
  LENGTH_SIZE,
  createInitializeMetadataPointerInstruction,
} from "@solana/spl-token";
import { MINTER, RECEIVER_ADDRESSES } from "./utils";
import fs from "fs";
import {
  createInitializeInstruction,
  pack,
  TokenMetadata,
} from "@solana/spl-token-metadata";

const payer = MINTER;
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

const decimals = 1; // Decimals for Mint Account
const mintAuthority = payer.publicKey; // Authority that can mint new tokens
console.log("Mint Authority Address:", payer.publicKey.toString());
const mintKeypair = Keypair.generate(); // Generate new keypair for Mint Account
const mint = mintKeypair.publicKey; // Address for Mint Account

async function createMint() {
  try {
    const mintLen = getMintLen([
      ExtensionType.NonTransferable,
      ExtensionType.MetadataPointer,
    ]);

    const metadataExtension = TYPE_SIZE + LENGTH_SIZE;

    // read json from metadata.json
    const metadataFile = JSON.parse(fs.readFileSync("metadata.json", "utf-8"));

    const metaData: TokenMetadata = {
      updateAuthority: payer.publicKey,
      mint: mint,
      name: metadataFile.name,
      symbol: metadataFile.symbol,
      uri: "https://raw.githubusercontent.com/shrestha-roshan/zepin-sbt/refs/heads/main/metadata.json",
      additionalMetadata: [["ZePin", "Zebec Network ZePIN"]],
    };
    const metadataLen = pack(metaData).length;

    // Minimum lamports required for Mint Account
    const lamports = await connection.getMinimumBalanceForRentExemption(
      mintLen + metadataExtension + metadataLen
    );

    const createAccountInstruction = SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    });

    const initializeMetadataPointerInstruction =
      createInitializeMetadataPointerInstruction(
        mint, // Mint Account address
        mintAuthority, // Authority that can set the metadata address
        mint, // Account address that holds the metadata
        TOKEN_2022_PROGRAM_ID
      );

    const initializeNonTransferableMintInstruction =
      createInitializeNonTransferableMintInstruction(
        mint,
        TOKEN_2022_PROGRAM_ID
      );

    const initializeMintInstruction = createInitializeMintInstruction(
      mint,
      decimals,
      mintAuthority,
      null,
      TOKEN_2022_PROGRAM_ID
    );

    const initializeMetadataInstruction = createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID, // Token Extension Program as Metadata Program
      metadata: mint, // Account address that holds the metadata
      updateAuthority: mintAuthority, // Authority that can update the metadata
      mint: mint, // Mint Account address
      mintAuthority: mintAuthority, // Designated Mint Authority
      name: metaData.name,
      symbol: metaData.symbol,
      uri: metaData.uri,
    });

    // Create and send transaction
    const transaction = new Transaction().add(
      createAccountInstruction,
      initializeMetadataPointerInstruction,
      initializeNonTransferableMintInstruction,
      initializeMintInstruction,
      initializeMetadataInstruction
    );

    const transactionSignature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer, mintKeypair]
    );

    console.log(
      "\nCreate Mint Account:",
      `https://solscan.io/tx/${transactionSignature}?cluster=devnet`
    );
  } catch (error) {
    console.error("Error creating mint account:", error);
  }
}

async function createTokenAccounts(address: PublicKey) {
  try {
    const sbtHolderTokenAccount = (
      await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mint,
        address,
        true,
        "confirmed",
        undefined,
        TOKEN_2022_PROGRAM_ID
      )
    ).address;
    console.log("SBT holder Token Account:", sbtHolderTokenAccount.toString());
    return sbtHolderTokenAccount;
  } catch (error) {
    console.error("Error creating token accounts:", error);
  }
}

async function mintTokens(receiverAddress: PublicKey) {
  try {
    const destinationTokenAccount = await createTokenAccounts(receiverAddress);
    const transactionSignature = await mintTo(
      connection,
      payer,
      mint,
      destinationTokenAccount,
      mintAuthority,
      1 * 10 ** decimals,
      undefined,
      {
        commitment: "confirmed",
      },
      TOKEN_2022_PROGRAM_ID
    );

    console.log(
      "\nMinted:",
      `https://solscan.io/tx/${transactionSignature}?cluster=devnet`
    );

    if (!fs.existsSync("output/sbtHolder.csv")) {
      fs.mkdirSync("output", { recursive: true });
      fs.writeFileSync(
        "output/sbtHolder.csv",
        "Mint Address,Holder Token Account,Signature\n"
      );
    }
    fs.appendFileSync(
      "output/sbtHolder.csv",
      `${mint.toString()},${destinationTokenAccount.toString()},${transactionSignature}\n`
    );
  } catch (error) {
    console.error("Error minting tokens:", error);
  }
}

(async () => {
  await createMint();
  for (let i = 0; i < RECEIVER_ADDRESSES.length; i++) {
    const receiverAddress = new PublicKey(RECEIVER_ADDRESSES[i]);
    await mintTokens(receiverAddress);
  }
})();
