import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import React, { useEffect, useState } from 'react';
import bs58 from 'bs58';
import {ed25519} from '@noble/curves/ed25519'
import { toast } from 'sonner';

function WalletSection({ darkMode , getBalance ,setPubKey,balance,setBalance}) {
  const [airdropAmount, setAirdropAmount] = useState(0.1);
  const {connection} = useConnection()
  const { publicKey, connected ,signMessage} = useWallet();
  const [walletAddress, setWalletAddress] = useState('Not connected');
  const [isAirdroping, setIsAirdroping] = useState(false);
  const [isSigning, setIsSigning] = useState(false)
  const [message, setMessage] = useState('');

  const handleAirdropChange = (e) => {
    let value = parseFloat(e.target.value);
    if (value > 5) value = 5;
    if (value < 0.1) value = 0.1;
    setAirdropAmount(value);
  };

  useEffect(() => {
    if (publicKey) {
        setPubKey(publicKey);
    }
  }, [publicKey, setPubKey]);

  async function requestAirdrop() {

    if (!publicKey) {
      toast.error("Wallet not connected");
      return;
    };
      

    try {
      setIsAirdroping(true)
      const signature = await connection.requestAirdrop(
        publicKey,
        airdropAmount * LAMPORTS_PER_SOL
      );

      const latestBlockhash = await connection.getLatestBlockhash();

      const result = await connection.confirmTransaction(
        {
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        "confirmed"
      );

      if (result.value.err) {
        toast.error("Airdrop failed");
        setIsAirdroping(false);
      } else {
        toast.success("Airdrop successful");
        getBalance();
      }

    } catch (error) {
      setIsAirdroping(false); 
      if (error.message?.includes("timeout")) {
        toast.error("Airdrop request timed out. The network may be congested.");
      } else if (error.message?.includes("429")) {
        toast.error("Too many airdrop requests. Please try again later.");
      } else if (error.message?.includes("insufficient")) {
        toast.error("Airdrop failed: Insufficient funds in the faucet.");
      } else {
        toast.error("An error occurred while requesting airdrop");
      }
    }finally{
      setIsAirdroping(false);
    }
  }

  async function SignMessage() {
    if (!publicKey) {
      toast.error("Wallet not connected");
      return;
    };
    if(!signMessage) {
      toast.error("Wallet does not support message signing");
      return;
    }
    try {
      if(!message) {
        toast.error("Please enter a message to sign");
        return;
      }
      setIsSigning(true);
      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await signMessage(encodedMessage);
      if(!ed25519.verify(signedMessage, encodedMessage, publicKey.toBytes())) {
        toast.error("Signature verification failed");
        setIsSigning(false);
        return;
      }
      const signature = bs58.encode(signedMessage);             
      toast.success(`Message signed successfully. Signature: ${signature}`);
      setMessage('');
    } catch (error) {
      if (error.message?.includes("User rejected")) {
        toast.error("Message signing rejected by user");
      } else if (error.message?.includes("timeout")) {
        toast.error("Message signing timed out. Please try again.");
      } else {
        toast.error("An error occurred while signing the message");
      }
    }finally{
      setIsSigning(false);
    }
  }



  useEffect(() => {
    if (connected && publicKey) {
      setWalletAddress(publicKey.toBase58());
      getBalance();
    } else {
      setWalletAddress('Not connected');
    }
  }, [connected, publicKey]);

  return (
    <div className={`p-6 rounded-lg border ${
      darkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-200'
    } shadow-sm`}>
      <h2 className={`text-xl font-semibold mb-6 ${darkMode ? 'text-white' : 'text-black'}`}>
        Wallet
      </h2>

      <div className="space-y-4">
        <div>
          <label className={`block mb-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Address
          </label>
          <div className="flex">
            <input
              type="text"
              value={walletAddress}
              readOnly
              className={`w-full p-2 rounded-lg border text-sm ${
                darkMode 
                  ? 'bg-black border-gray-800 text-white' 
                  : 'bg-white border-gray-200 text-black'
              } shadow-sm`}
            />
            <button className={`ml-2 p-2 rounded-lg border ${
              darkMode 
                ? 'border-gray-800 text-gray-400' 
                : 'border-gray-200 text-gray-600'
            } shadow-sm`}
            onClick={() => {
              if (connected && publicKey) {
                navigator.clipboard.writeText(publicKey.toBase58());
                alert('Address copied!');
              }
            }}
            >
              Copy
            </button>
          </div>
        </div>

        <div>
          <label className={`block mb-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Balance
          </label>
          <div className="flex">
            <input
              type="text"
              value={`${balance} SOL`}
              readOnly
              className={`w-full p-2 rounded-lg border text-sm ${
                darkMode 
                  ? 'bg-black border-gray-800 text-white' 
                  : 'bg-white border-gray-200 text-black'
              } shadow-sm`}
            />
            <button className={`ml-2 p-2 rounded-lg border ${
              darkMode 
                ? 'border-gray-800 text-gray-400' 
                : 'border-gray-200 text-gray-600'
            } shadow-sm`}
            onClick={() => {
              if (connected && publicKey) {
                getBalance();
              }
            }}
            >
              Refresh
            </button>
          </div>
        </div>

        <div>
          <label className={`block mb-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Sign Message
          </label>
          <textarea
            placeholder="Enter message to sign"
            onChange={(e) => setMessage(e.target.value)}
            value={message}
            className={`w-full p-2 rounded-lg border text-sm ${
              darkMode 
                ? 'bg-black border-gray-800 text-white' 
                : 'bg-white border-gray-200 text-black'
              } shadow-sm`}
            rows="3"
          />
        </div>

        <button className={`w-full p-2 rounded-lg shadow-sm ${
          darkMode 
            ? 'bg-white text-black' 
            : 'bg-black text-white'
        } ${isSigning ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={SignMessage}
        disabled={isSigning}
        >
          {isSigning ? 'Signing...' : 'Sign Message'}
        </button>

        <div>
          <label className={`block mb-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Airdrop Amount (0.1 - 5 SOL)
          </label>
          <input
            type="number"
            value={airdropAmount}
            onChange={handleAirdropChange}
            step="0.1"
            min="0.1"
            max="5"
            className={`w-full p-2 rounded-lg border text-sm ${
              darkMode 
                ? 'bg-black border-gray-800 text-white' 
                : 'bg-white border-gray-200 text-black'
              } shadow-sm`}
          />
        </div>

        <button className={`w-full p-2 rounded-lg shadow-sm ${
          darkMode 
            ? 'bg-white text-black' 
            : 'bg-black text-white'
        } ${isAirdroping ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={requestAirdrop}
        disabled={isAirdroping}
        
        >
          {isAirdroping ? 'Requesting...' : 'Request Airdrop'}
        </button>
      </div>
    </div>
  );
}

export default WalletSection;