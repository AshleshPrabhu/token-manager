import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, SystemProgram, Transaction, PublicKey } from '@solana/web3.js';
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import bs58 from 'bs58';

import {
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    getAssociatedTokenAddress,
    createTransferCheckedInstruction,
    getAccount,
    getMint,
    getOrCreateAssociatedTokenAccount,
    getTokenMetadata,
    createAssociatedTokenAccountIdempotentInstruction
} from '@solana/spl-token';

function SendToken({ darkMode, getBalance,balance }) {
    const wallet = useWallet();
    const { connection } = useConnection();
    
    // States
    const [tokens, setTokens] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [sending, setSending] = useState(false);
    const [selectedToken, setSelectedToken] = useState('SOL');
    const [receiverAddress, setReceiverAddress] = useState("");
    const [amount, setAmount] = useState("");
    
    // Styles
    const inputStyle = `w-full p-3 rounded-lg border ${
        darkMode 
            ? 'bg-gray-900 border-gray-700 text-white' 
            : 'bg-white border-gray-200 text-black'
    }`;
    
    const buttonStyle = `w-full p-3 rounded-lg shadow-sm font-medium transition-colors ${
        wallet.connected && !sending
            ? darkMode 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            : darkMode 
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
    } ${sending ? 'opacity-50 cursor-not-allowed' : ''}`;

    // Get selected token details
    const selectedTokenInfo = useMemo(() => {
        if (selectedToken === 'SOL') {
            return {
                name: 'Solana',
                symbol: 'SOL',
                mint: 'SOL',
                decimals: 9,
                balance: wallet.publicKey ? balance : 0
            };
        }
        return tokens.find(token => token.mint === selectedToken) || null;
    }, [selectedToken, tokens, wallet.publicKey]);

    // Effects
    useEffect(() => {
        if (wallet.connected) {
            fetchTokens();
            getBalance();
            
            // Poll for SOL balance updates
            const intervalId = setInterval(() => {
                getBalance();
            }, 30000); // every 30 seconds
            
            return () => clearInterval(intervalId);
        } else {
            setTokens([]);
        }
    }, [wallet.connected, connection]);

    // Fetch tokens with metadata
    async function fetchTokens() {
        if (!wallet.publicKey) return;
        
        try {
            setLoading(true);
            setError(null);
            const tokenList = await fetchAllTokensWithMetadata();
            
            // Add SOL as the first option
            setTokens(tokenList);
            setSelectedToken('SOL'); // Default to SOL
        } catch (err) {
            console.error("Error fetching tokens:", err);
            setError("Failed to load tokens. Please try again.");
        } finally {
            setLoading(false);
        }
    }
    
    async function fetchAllTokensWithMetadata() {
        if (!wallet.publicKey) return [];
        
        const programs = [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID];
        const allTokens = [];
    
        for (const programId of programs) {
        try {
            const response = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, {
            programId,
            });
            console.log(response.value)
    
            const tokens = await Promise.all(
            response.value
                .filter(({ account }) => {
                // Filter out tokens with zero balance
                const info = account.data.parsed.info;
                return info.tokenAmount.uiAmount > 0;
                })
                .map(async ({ pubkey,account }) => {
                const info = account.data.parsed.info;
                const mint = new PublicKey(info.mint);
                const balance = info.tokenAmount.uiAmount;
                const decimals = info.tokenAmount.decimals;
    
                let name = "Unknown";
                let symbol = "UNK";
                let image = '';
    
                try {
                    const meta = await getTokenMetadata(connection, mint, 'confirmed', programId);
                    console.log(meta)
                    if (meta?.uri) {
                        const res = await fetch(meta.uri);
                        const data = await res.json();
                        console.log(data)
                        name = data.name || meta.name || "Unknown";
                        symbol = data.symbol || meta.symbol || "UNK";
                        image = data.image || '';
                    }
                } catch (e) {
                    console.warn(`Failed to fetch metadata for ${mint.toBase58()}`);
                }
                return {
                    mint: mint.toBase58(),
                    balance,
                    name,
                    symbol,
                    image,
                    programId: programId.toBase58(),
                    decimals,
                    account: pubkey?.toBase58()|| '',
                    tokenProgram:programId.toBase58()
                };
                })
            );
            allTokens.push(...tokens);
        } catch (err) {
            console.error(`Error fetching tokens for program ${programId.toBase58()}:`, err);
        }
        }
        return allTokens;
    }
    // Validate Solana address
    function isValidSolanaAddress(address) {
        try {
            new PublicKey(address);
            return true;
        } catch {
            return false;
        }
    }

    async function handleSendToken() {
        if (!wallet?.publicKey) return toast.error("Wallet not connected");
        if (!receiverAddress.trim()) return toast.error("Please enter a receiver address");
        if (!isValidSolanaAddress(receiverAddress)) return toast.error("Invalid address");

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0)
            return toast.error("Amount must be greater than 0");

        if (receiverAddress === wallet.publicKey.toBase58())
            return toast.error("Cannot send to yourself");

        if (selectedTokenInfo && parsedAmount > selectedTokenInfo.balance) {
            return toast.error(
                `Insufficient balance: ${selectedTokenInfo.balance} ${selectedTokenInfo.symbol}`
            );
        }

        setSending(true);
        toast.loading("Preparing transaction...");

        try {
            if (!wallet.connected) {
                toast.dismiss();
                toast.error("Wallet connection lost. Please reconnect.");
                setSending(false);
                return;
            }

            const receiver = new PublicKey(receiverAddress);

            // Get latest SOL balance
            const solBalance = await connection.getBalance(wallet.publicKey);
            
            // Higher estimated fee to account for potential ATA creation
            const estimatedFee = 10000; // Increased from 5000 to account for potential ATA creation

            // Check if there's enough SOL for fees
            if (solBalance < estimatedFee && selectedToken !== "SOL") {
                toast.dismiss();
                toast.error("Insufficient SOL for transaction fees");
                setSending(false);
                return;
            }

            // Get latest blockhash before building transaction
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
            
            const transaction = new Transaction();
            transaction.feePayer = wallet.publicKey;
            transaction.recentBlockhash = blockhash;

            if (selectedToken === "SOL") {
                // For SOL transfers
                const totalNeeded = parsedAmount * LAMPORTS_PER_SOL + estimatedFee;
                if (solBalance < totalNeeded) {
                    toast.dismiss();
                    toast.error(`Insufficient SOL balance for transfer plus fees`);
                    setSending(false);
                    return;
                }

                transaction.add(
                    SystemProgram.transfer({
                        fromPubkey: wallet.publicKey,
                        toPubkey: receiver,
                        lamports: parsedAmount * LAMPORTS_PER_SOL,
                    })
                );
            } else {
                // For SPL token transfers
                if (!selectedTokenInfo) {
                    toast.dismiss();
                    toast.error("Invalid token selected");
                    setSending(false);
                    return;
                }

                const mint = new PublicKey(selectedToken);
                const decimals = selectedTokenInfo.decimals;
                
                // Use the TOKEN_PROGRAM_ID constant from @solana/spl-token if available
                // Otherwise, ensure selectedTokenInfo.tokenProgram is correct
                // Typical value for SPL tokens: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
                const tokenProgramId = new PublicKey(selectedTokenInfo.tokenProgram);
                
                // Calculate token amount with proper decimals
                const adjustedAmount = BigInt(Math.round(parsedAmount * Math.pow(10, decimals)));
                const sourceTokenAccount = new PublicKey(selectedTokenInfo.account);
                
                // Try-catch for getting the destination token account
                let destinationTokenAccount;
                try {
                    destinationTokenAccount = await getAssociatedTokenAddress(
                        mint,
                        receiver,
                        false,
                        tokenProgramId
                    );
                } catch (error) {
                    console.error("Error getting associated token address:", error);
                    toast.dismiss();
                    toast.error("Error calculating receiver token address");
                    setSending(false);
                    return;
                }

                // Check if the destination account exists
                let destinationAccountInfo;
                try {
                    destinationAccountInfo = await connection.getAccountInfo(destinationTokenAccount);
                } catch (accountError) {
                    console.error("Error checking destination account:", accountError);
                }

                // Add create account instruction if needed
                if (!destinationAccountInfo) {
                    try {
                        transaction.add(
                            createAssociatedTokenAccountIdempotentInstruction(
                                wallet.publicKey,
                                destinationTokenAccount,
                                receiver,
                                mint,
                                tokenProgramId  // Make sure to pass the token program ID here
                            )
                        );
                    } catch (createError) {
                        console.error("Error creating account instruction:", createError);
                        toast.dismiss();
                        toast.error("Error preparing receiver token account creation");
                        setSending(false);
                        return;
                    }
                }

                // Add transfer instruction
                try {
                    transaction.add(
                        createTransferCheckedInstruction(
                            sourceTokenAccount,
                            mint,
                            destinationTokenAccount,
                            wallet.publicKey,
                            adjustedAmount,
                            decimals,
                            [],
                            tokenProgramId
                        )
                    );
                } catch (transferError) {
                    console.error("Error creating transfer instruction:", transferError);
                    toast.dismiss();
                    toast.error("Error preparing transfer instruction");
                    setSending(false);
                    return;
                }
            }

            // Simulate the transaction before sending
            try {
                const simulation = await connection.simulateTransaction(transaction);
                if (simulation.value.err) {
                    console.error("Transaction simulation error:", simulation.value.err);
                    toast.dismiss();
                    toast.error(`Simulation failed: ${JSON.stringify(simulation.value.err)}`);
                    setSending(false);
                    return;
                }
            } catch (simError) {
                console.error("Error simulating transaction:", simError);
                // Continue anyway as this is just an extra check
            }finally{
                setSending(false);
            }

            toast.dismiss();
            toast.loading("Signing transaction...");

            let signature;
            try {
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Transaction signing timed out")), 60000)
                );

                signature = await Promise.race([
                    wallet.sendTransaction(transaction, connection),
                    timeoutPromise
                ]);
            } catch (sendError) {
                toast.dismiss();
                console.error("Transaction send error:", sendError);

                if (sendError.message?.includes("User rejected")) {
                    toast.error("Transaction rejected by user");
                } else if (sendError.message?.includes("timeout")) {
                    toast.error("Transaction signing timed out. Please try again.");
                } else {
                    toast.error(`Transaction error: ${sendError.message || "Unknown error"}`);
                }

                setSending(false);
                return;
            }

            toast.dismiss();
            toast.loading("Processing transaction...");

            try {
                const confirmationTimeout = 60000;
                const confirmationPromise = connection.confirmTransaction(
                    {
                        signature,
                        blockhash,
                        lastValidBlockHeight,
                    },
                    "confirmed"
                );

                const confirmation = await Promise.race([
                    confirmationPromise,
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error("Confirmation timed out")), confirmationTimeout)
                    )
                ]);

                toast.dismiss();

                if (confirmation.value.err) {
                    console.error("Transaction error:", confirmation.value.err);
                    return toast.error("Transaction failed: " + JSON.stringify(confirmation.value.err));
                }

                toast.success(
                    `Sent ${parsedAmount} ${selectedTokenInfo?.symbol || selectedToken} to ${receiverAddress.slice(
                        0,
                        4
                    )}...${receiverAddress.slice(-4)}`
                );

                setAmount("");
                setReceiverAddress("");
                getBalance?.();
                fetchTokens?.();
            } catch (confirmError) {
                toast.dismiss();
                console.error("Confirmation error:", confirmError);
                toast.info(
                    `Transaction sent but confirmation timed out. Signature: ${signature.slice(0, 8)}...`
                );
            }
        } catch (err) {
            toast.dismiss();
            console.error("Error sending token:", err);
            toast.error(err.message || "Transaction failed.");
        } finally {
            setSending(false);
        }
    }

    // Shortcuts for max amount
    const handleSetMaxAmount = () => {
        if (!selectedTokenInfo) return;
        
        // For SOL, leave some for transaction fees
        if (selectedToken === 'SOL') {
            // Leave 0.01 SOL for fees
            const maxAmount = Math.max(0, selectedTokenInfo.balance - 0.01);
            setAmount(maxAmount.toString());
        } else {
            setAmount(selectedTokenInfo.balance.toString());
        }
    };

    return (
        <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
            <h2 className="text-2xl font-bold mb-6">Send Tokens</h2>
            
            {!wallet.connected ? (
                <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg">
                    <p className="text-lg mb-4">Please connect your wallet to send tokens</p>
                    <button 
                        className={`px-6 py-2 rounded-md ${darkMode ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                        onClick={() => wallet.connect()}
                    >
                        Connect Wallet
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Token Selection */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Select Token
                            </label>
                            {loading && (
                                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Loading tokens...
                                </span>
                            )}
                        </div>
                        <select 
                            className={`${inputStyle} shadow-sm`} 
                            value={selectedToken} 
                            onChange={(e) => setSelectedToken(e.target.value)}
                            disabled={loading || sending}
                        >
                            <option value="SOL">
                                Solana (SOL) - {balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                            </option>
                            
                            {tokens.map((token) => (
                                <option key={token.mint} value={token.mint}>
                                    {token.name} ({token.symbol}) - {token.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Recipient Address */}
                    <div>
                        <label className={`block mb-1 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Recipient Address
                        </label>
                        <input
                            type="text"
                            placeholder="Enter Solana address"
                            value={receiverAddress}
                            onChange={(e) => setReceiverAddress(e.target.value)}
                            className={`${inputStyle} shadow-sm`}
                            disabled={sending}
                        />
                        {receiverAddress && !isValidSolanaAddress(receiverAddress) && (
                            <p className="mt-1 text-red-500 text-sm">Invalid Solana address</p>
                        )}
                    </div>

                    {/* Amount */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Amount
                            </label>
                            {selectedTokenInfo && (
                                <button 
                                    type="button" 
                                    onClick={handleSetMaxAmount}
                                    className={`text-xs ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                                    disabled={sending}
                                >
                                    Max: {selectedTokenInfo.balance?.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                                </button>
                            )}
                        </div>
                        
                        <div className="relative">
                            <input
                                type="number"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                min="0"
                                step="0.000001"
                                className={`${inputStyle} shadow-sm`}
                                disabled={sending}
                            />
                            {selectedTokenInfo && (
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {selectedTokenInfo.symbol}
                                    </span>
                                </div>
                            )}
                        </div>
                        
                        {parseFloat(amount) > 0 && selectedTokenInfo && parseFloat(amount) > selectedTokenInfo.balance && (
                            <p className="mt-1 text-red-500 text-sm">Insufficient balance</p>
                        )}
                    </div>

                    {/* Send Button */}
                    <button 
                        className={buttonStyle}
                        onClick={handleSendToken}
                        disabled={!wallet.connected || sending}
                    >
                        {sending ? 'Sending...' : 'Send Tokens'}
                    </button>
                    
                    {/* Network Fee Info */}
                    {selectedToken === 'SOL' && (
                        <p className={`text-xs text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Network fee: ~0.000005 SOL
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

export default SendToken;