import dotenv from "dotenv";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
dotenv.config();

export const MINTER = Keypair.fromSecretKey(
    bs58.decode(process.env.MINTER)
);
