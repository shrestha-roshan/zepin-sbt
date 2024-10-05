import dotenv from "dotenv";
import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
dotenv.config();

export const MINTER = Keypair.fromSecretKey(
  bs58.decode(process.env.MINT_AUHORITY_SECRET)
);

export const METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);
