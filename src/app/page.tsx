"use client";
import Image from "next/image";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { ETHRegistrarABI } from "../../abis/ETHRegistrarController";
import { publicResolver } from "../../abis/PublicResolver";
import {
  useAccount,
  useBalance,
  useContractRead,
  useContractWrite,
} from "wagmi";
import {
  createWalletClient,
  createPublicClient,
  http,
  custom,
  parseGwei,
  parseEther,
  namehash,
  toBytes,
  stringToBytes,
  labelhash,
  toHex
} from "viem";
import { sepolia, holesky } from "viem/chains";
import { normalize } from "viem/ens";
import bs58 from "bs58";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});

export const walletClient = createWalletClient({
  chain: sepolia,
  transport: custom(window.ethereum),
});

const ETHRegistrarContractAddress =
  "0xFED6a969AaA60E4961FCD3EBF1A2e8913ac65B72";
const resolverAddress = "0x8FADE66B79cC9f707aB26799354482EB93a5B7dD";

export default function Home() {
  const [ensName, setEnsName] = useState("");
  const { address } = useAccount();
  const balance = useBalance({ address });
  const [available, setAvailable] = useState<boolean | unknown>();
  const [commitHash, setCommitHash] = useState<string | unknown>();
  const [price, setPrice] = useState<any>();

  const nameAvailable = async (e: any) => {
    setEnsName(e.target.value);
    try {
      const data = await publicClient.readContract({
        address: ETHRegistrarContractAddress,
        abi: ETHRegistrarABI,
        functionName: "available",
        args: [e.target.value],
      });

      setAvailable(data);
    } catch (e) {
      console.log("availble error", e);
    }
  };

  const registerCommit = async () => {
    if (address) {
      try {
        const makeCommit = await publicClient.readContract({
          address: ETHRegistrarContractAddress,
          abi: ETHRegistrarABI,
          functionName: "makeCommitment",
          args: [
            ensName,
            address,
            2592000,
            `0x0000000000000000000000000000000000000000000000000000000000000000`,
            resolverAddress,
            [],
            false,
            0,
          ],
        });

        const rentPrice = await publicClient.readContract({
          address: ETHRegistrarContractAddress,
          abi: ETHRegistrarABI,
          functionName: "rentPrice",
          args: [ensName, 2592000],
        });

        const [account] = await walletClient.getAddresses();

        const { request } = await publicClient.simulateContract({
          address: ETHRegistrarContractAddress,
          abi: ETHRegistrarABI,
          functionName: "commit",
          args: [makeCommit],
          account,
        });

        await walletClient.writeContract(request);

        setPrice(rentPrice);

        console.log("commit hash", { makeCommit, rentPrice });
      } catch (e) {
        console.log("making commitment hash error", e);
      }
    } else {
      console.log("Wallet not connected");
    }
  };

  const registerEns = async () => {
    try {
      const [account] = await walletClient.getAddresses();

      const { request } = await publicClient.simulateContract({
        address: ETHRegistrarContractAddress,
        abi: ETHRegistrarABI,
        functionName: "register",
        args: [
          ensName,
          address,
          2592000,
          `0x0000000000000000000000000000000000000000000000000000000000000000`,
          resolverAddress,
          [],
          false,
          0,
        ],
        value: parseEther("0.05"),
        account,
      });

      const ensHash = await walletClient.writeContract(request);

      console.log("ens hash: ", ensHash);
    } catch (e) {
      console.log("register error: ", e);
    }
  };

  useEffect(() => {
    // const getResolver = async () => {
    //   const resolverAddress = await publicClient.getEnsResolver({
    //     name: normalize('greenghostwealth.eth')
    //   })
    //   console.log("resolver address", resolverAddress)
    // }
    // getResolver()
  }, []);

  const setContenthash = async () => {
    const contentHash =
      "bafybeibhbxstjb7kkr4dejwo5xnqvaq2fxl3mp3mbfa6n2n3spfbxvsw3m";
    const bytesContentHash = toHex(contentHash)
    const nameAsBytes32 = namehash("greenghostwealth.eth");
    console.log("name hash", nameAsBytes32)
    const [account] = await walletClient.getAddresses();
    const { request } = await publicClient.simulateContract({
      address: resolverAddress,
      abi: publicResolver,
      functionName: "setContenthash",
      args: [nameAsBytes32, bytesContentHash],
      account
    });
    const contenthashtx = await walletClient.writeContract(request);
    console.log("content hash:", contenthashtx)
    console.log("name hash", namehash("greenghostwealth.eth"))
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <ConnectButton />
      <div className="w-96 m-auto flex flex-col gap-5">
        <label>ENS Name</label>
        <input
          className="outline-stone-600 border-stone-500 border border-solid"
          value={ensName}
          onChange={nameAvailable}
        />
        <div>
          {ensName !== "" && (
            <>
              {available ? (
                <div className="text-green-500">available</div>
              ) : (
                <div className="text-red-500">unavailable</div>
              )}
            </>
          )}
        </div>
        <div className="flex flex-row justify-between">
          <button className="bg-blue-100" onClick={registerCommit}>
            commit
          </button>
          <button className="bg-blue-100" onClick={registerEns}>
            Register
          </button>
        </div>
      </div>

      <button className="bg-blue-100" onClick={setContenthash}>
        Set Content hash
      </button>
      <button
        className="bg-black text-white p-3 rounded2"
        onClick={() => signOut()}
      >
        Sign Out
      </button>
    </main>
  );
}
