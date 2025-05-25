import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import React, { useState } from 'react'
import { toast } from 'sonner';
import { PinataSDK } from "pinata-web3";
import { pack } from '@solana/spl-token-metadata';
import {
    TOKEN_2022_PROGRAM_ID,
    createMintToInstruction,
    createAssociatedTokenAccountInstruction,
    getMintLen,
    createInitializeMetadataPointerInstruction,
    createInitializeMintInstruction,
    TYPE_SIZE,
    LENGTH_SIZE,
    ExtensionType,
    getAssociatedTokenAddressSync,
    createInitializeInstruction
} from "@solana/spl-token"
import { Keypair, SystemProgram, Transaction } from '@solana/web3.js';

function CreateToken({darkMode,getBalance}) {
    const wallet = useWallet()
    const {connection} = useConnection()
    const pinata = new PinataSDK({
        pinataJwt: import.meta.env.VITE_PINATA_JWT,
        pinataGateway: import.meta.env.VITE_PINATA_GATEWAY_URL
    })
    const [tokenInfo, setTokenInfo] = useState({
        name: "",
        symbol: "",
        imageUrl: "",
        decimals: 9,
        totalSupply: 100,
        description: ""
    })
    const inputStyle = `w-full p-2 rounded-lg border ${
        darkMode 
        ? 'bg-black border-gray-800 text-white' 
        : 'bg-white border-gray-200 text-black'
    }`;
    const [loading, setLoading] = useState(false);

    // Default metadata if upload fails
    const DEFAULT_METADATA = {
        name: "Default Token",
        symbol: "DFLT",
        description: "This is a default token created when metadata upload fails",
        image: "https://placehold.co/600x400?text=Default+Token",
    };

    const constructMetadataUri = (ipfsHash) => {
        const gateway = import.meta.env.VITE_PINATA_GATEWAY_URL || 'gateway.pinata.cloud';
        return `https://${gateway}/ipfs/${ipfsHash}`;
    };

    // Updated uploadMetadata function with proper handling for Phantom wallet compatibility
    const uploadMetadata = async (name, symbol, description, image) => {
        // Ensure image URL is properly formatted and accessible
        let imageUrl = image || DEFAULT_METADATA.image;
        
        // If using robohash, ensure it has proper parameters and format
        if (imageUrl.includes('robohash.org')) {
            // Ensure the URL ends with a supported image format extension
            if (!imageUrl.endsWith('.png') && !imageUrl.endsWith('.jpg') && !imageUrl.endsWith('.jpeg')) {
                imageUrl = imageUrl + '.png';
            }
            
            // Optionally set size parameter if not present (recommended 400x400 for tokens)
            if (!imageUrl.includes('size=')) {
                const separator = imageUrl.includes('?') ? '&' : '?';
                imageUrl = `${imageUrl}${separator}size=400x400`;
            }
        }
        
        // Create metadata object with standard NFT/token format that wallets expect
        const metadata = {
            name: name || DEFAULT_METADATA.name,
            symbol: symbol || DEFAULT_METADATA.symbol,
            description: description || DEFAULT_METADATA.description,
            image: imageUrl,
            // Adding additional fields that help with wallet compatibility
            external_url: "", // Optional external URL
            attributes: [],   // Optional attributes array
            properties: {
                files: [
                    {
                        uri: imageUrl,
                        type: "image/png" // Use appropriate MIME type based on your image
                    }
                ],
                category: "image"
            }
        };
        
        console.log("Enhanced Metadata:", JSON.stringify(metadata, null, 2));

        const metadataFile = new File([JSON.stringify(metadata)], "metadata.json", { type: "application/json" });
        console.log("Metadata file:", metadataFile);    
        
        try {
            // Make sure pinata is properly initialized before this function is called
            if (!pinata || !pinata.upload) {
                console.error("Pinata is not properly initialized");
                return null;
            }
            
            const result = await pinata.upload.file(metadataFile);
            console.log("Upload result:", result);
            return result.IpfsHash;
        } catch (error) {
            console.error("Metadata upload failed:", error);
            return null;
        }
    };

    // Updated createDefaultMetadata function
    const createDefaultMetadata = async () => {
        try {
            // Ensure default image is a direct URL to an image file with proper format
            const defaultImage = "https://placehold.co/400x400/png/FFFFFF/000000?text=Default+Token";
            
            return await uploadMetadata(
                DEFAULT_METADATA.name,
                DEFAULT_METADATA.symbol,
                DEFAULT_METADATA.description,
                defaultImage
            );
        } catch (error) {
            console.error("Failed to create default metadata:", error);
            return null;
        }
    };
    
    async function createToken() {
        setLoading(true);
        if (!wallet?.publicKey) {
            toast.error("Wallet not connected");
            setLoading(false);
            return;
        }

        if (!tokenInfo.name.trim() || !tokenInfo.symbol.trim()) {
            toast.error("Token name and symbol are required");
            setLoading(false);
            return;
        }

        try {
            // Generate a new keypair for the token mint
            const mintKeypair = Keypair.generate();

            // Step 1: Upload metadata to IPFS
            let metadataIpfsHash = await uploadMetadata(
                tokenInfo.name, 
                tokenInfo.symbol, 
                tokenInfo.description, 
                tokenInfo.imageUrl
            );
            
            // If upload fails, use default metadata
            if (!metadataIpfsHash) {
                console.warn("Primary metadata upload failed, using default metadata");
                metadataIpfsHash = await createDefaultMetadata();
                
                // If even default metadata creation fails
                if (!metadataIpfsHash) {
                    // Try to use environment variable as last resort
                    metadataIpfsHash = import.meta.env.VITE_DEFAULT_METADATA_HASH;
                    if (!metadataIpfsHash) {
                        toast.error("Failed to create metadata. Please try again later.");
                        setLoading(false);
                        return;
                    }
                }
            }
            
            // Construct full metadata URI with gateway
            const metadataUri = constructMetadataUri(metadataIpfsHash);
            console.log("Metadata URI:", metadataUri);
            
            // Create token metadata object
            const metadata = {
                mint: mintKeypair.publicKey,
                name: tokenInfo.name,
                symbol: tokenInfo.symbol,
                description: tokenInfo.description || DEFAULT_METADATA.description,
                uri: metadataUri,
                additionalMetadata: [],
            };

            // Calculate required space and rent
            const mintLen = getMintLen([ExtensionType.MetadataPointer]);
            console.log("Mint length:", mintLen);
            const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;
            console.log("Metadata length:", metadataLen);
            const lamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);
            console.log("Lamports required:", lamports);

            // IMPROVED: Get latest blockhash with explicit commitment
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
            console.log("Blockhash:", blockhash);
            console.log("Last valid block height:", lastValidBlockHeight);

            // Create first transaction: create account and initialize mint with metadata
            const transaction = new Transaction().add(
                SystemProgram.createAccount({
                    fromPubkey: wallet.publicKey,
                    newAccountPubkey: mintKeypair.publicKey,
                    space: mintLen,
                    lamports,
                    programId: TOKEN_2022_PROGRAM_ID,
                }),
                createInitializeMetadataPointerInstruction(
                    mintKeypair.publicKey,  //mint
                    wallet.publicKey,  //authority
                    mintKeypair.publicKey, //metadata address
                    TOKEN_2022_PROGRAM_ID
                ),
                createInitializeMintInstruction(
                    mintKeypair.publicKey,  //mint
                    tokenInfo.decimals, 
                    wallet.publicKey, //mint authority
                    null, //freeze authority
                    TOKEN_2022_PROGRAM_ID
                ),
                createInitializeInstruction({
                    programId: TOKEN_2022_PROGRAM_ID,
                    metadata: mintKeypair.publicKey,
                    updateAuthority: wallet.publicKey,
                    mint: mintKeypair.publicKey,
                    mintAuthority: wallet.publicKey,
                    name: metadata.name,
                    symbol: metadata.symbol,
                    uri: metadata.uri,
                }),
            );

            // IMPROVED: Set transaction parameters with explicit recentBlockhash
            transaction.feePayer = wallet.publicKey;
            transaction.recentBlockhash = blockhash;
            transaction.partialSign(mintKeypair);

            // Using Sonner toast with ID for updating
            const toastId = toast.loading("Sending transaction...");

            // Send the first transaction
            const signature = await wallet.sendTransaction(transaction, connection, {
                skipPreflight: false,
                preflightCommitment: 'confirmed'
            });

            // Update the toast with Sonner's API
            toast.loading("Confirming transaction...", {
                id: toastId
            });

            // IMPROVED: Wait for confirmation with proper options and timeout handling
            try {
                // Using confirmTransaction with timeout handling
                const confirmation = await Promise.race([
                    connection.confirmTransaction({
                        signature,
                        blockhash,
                        lastValidBlockHeight
                    }, 'confirmed'),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error("Transaction confirmation timeout")), 60000)
                    )
                ]);
                
                // Close the loading toast
                toast.dismiss(toastId);
                
                if (confirmation.value && confirmation.value.err) {
                    toast.error("Transaction failed: " + JSON.stringify(confirmation.value.err));
                    setLoading(false);
                    return;
                }
                
                toast.success(`Token mint created successfully! Mint address: ${mintKeypair.publicKey.toBase58()}`);
            } catch (error) {
                toast.dismiss(toastId);
                toast.error(`Transaction confirmation failed: ${error.message}`);
                setLoading(false);
                return;
            }
                
            // Create associated token account and mint tokens
            const associatedToken = getAssociatedTokenAddressSync(
                mintKeypair.publicKey,
                wallet.publicKey,
                false,
                TOKEN_2022_PROGRAM_ID,
            );
            console.log("Associated token address:", associatedToken.toBase58());
            
            // IMPROVED: Get fresh blockhash for second transaction
            const { blockhash: blockhash2, lastValidBlockHeight: lastValidBlockHeight2 } = 
            await connection.getLatestBlockhash('confirmed');
            console.log("Blockhash for second transaction:", blockhash2);
            console.log("Last valid block height for second transaction:", lastValidBlockHeight2);  
            
            const transaction2 = new Transaction().add(
                createAssociatedTokenAccountInstruction(
                    wallet.publicKey, //payer
                    associatedToken,
                    wallet.publicKey,//owner
                    mintKeypair.publicKey,//mint
                    TOKEN_2022_PROGRAM_ID,
                ),
                createMintToInstruction(
                    mintKeypair.publicKey,//mint 
                    associatedToken, //destination
                    wallet.publicKey, //authority
                    tokenInfo.totalSupply * Math.pow(10, tokenInfo.decimals), //amount 
                    [], //multisigners
                    TOKEN_2022_PROGRAM_ID
                )
            );
            
            // IMPROVED: Set transaction parameters with explicit recentBlockhash
            transaction2.feePayer = wallet.publicKey;
            transaction2.recentBlockhash = blockhash2;
            
            // Using Sonner toast with ID for updating
            const toastId2 = toast.loading("Sending minting transaction...");
            
            // Send the second transaction
            const signature2 = await wallet.sendTransaction(transaction2, connection, {
                skipPreflight: false,
                preflightCommitment: 'confirmed'
            });
            
            if(!signature2){
                toast.dismiss(toastId2);
                toast.error("Transaction failed to send");
                setLoading(false);
                return;
            }
            
            // Update loading toast with Sonner's API
            toast.loading("Confirming minting transaction...", {
                id: toastId2
            });
            
            // IMPROVED: Wait for confirmation with proper options and timeout handling
            try {
                // Using confirmTransaction with timeout handling
                const confirmation2 = await Promise.race([
                    connection.confirmTransaction({
                        signature: signature2,
                        blockhash: blockhash2,
                        lastValidBlockHeight: lastValidBlockHeight2
                    }, 'confirmed'),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error("Minting transaction confirmation timeout")), 60000)
                    )
                ]);
                
                // Close the loading toast
                toast.dismiss(toastId2);
                
                if (confirmation2.value && confirmation2.value.err) {
                    toast.error("Minting transaction failed: " + JSON.stringify(confirmation2.value.err));
                    setLoading(false);
                    return;
                }
                setTokenInfo({
                    name: "",
                    symbol: "",
                    imageUrl: "",
                    decimals: 9,
                    totalSupply: 100,
                    description: ""
                })
                
                toast.success(`${tokenInfo.totalSupply} tokens minted successfully!`);
                getBalance();
                
                return {
                    mint: mintKeypair.publicKey.toBase58(),
                    metadataUri,
                    associatedToken: associatedToken.toBase58()
                };
            } catch (error) {
                toast.dismiss(toastId2);
                toast.error(`Minting transaction confirmation failed: ${error.message}`);
                setLoading(false);
                return null;
            }
            
        } catch (err) {
            console.error("Token creation failed:", err);
            toast.error(`Token creation failed: ${err.message || "Unknown error"}`);
            setLoading(false);
            return null;
        }finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            <div>
                <label className={`block mb-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Token Name
                </label>
                <input
                    type="text"
                    placeholder="My Token"
                    value={tokenInfo.name}
                    onChange={(e) => setTokenInfo({ ...tokenInfo, name: e.target.value })}
                    className={`${inputStyle} shadow-sm`}
                />
            </div>

            <div>
                <label className={`block mb-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Token Symbol
                </label>
                <input
                    type="text"
                    placeholder="MTK"
                    value={tokenInfo.symbol}
                    onChange={(e) => setTokenInfo({ ...tokenInfo, symbol: e.target.value })}
                    className={`${inputStyle} shadow-sm`}
                />
            </div>

            <div>
                <label className={`block mb-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Token Image URL
                </label>
                <input
                    type="url"
                    placeholder="https://example.com/token-image.png"
                    value={tokenInfo.imageUrl}
                    onChange={(e) => setTokenInfo({ ...tokenInfo, imageUrl: e.target.value })}
                    className={`${inputStyle} shadow-sm`}
                />
            </div>

            <div>
                <label className={`block mb-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Decimals
                </label>
                <input
                    type="number"
                    className={`${inputStyle} shadow-sm`}
                    min={0}
                    max={18}
                    value={tokenInfo.decimals}
                    onChange={(e) => setTokenInfo({ ...tokenInfo, decimals: e.target.value })}
                />
            </div>

            <div>
                <label className={`block mb-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Total Supply
                </label>
                <input
                    type="number"
                    min={1}
                    max={1000000000}
                    value={tokenInfo.totalSupply}
                    onChange={(e) => setTokenInfo({ ...tokenInfo, totalSupply: e.target.value })}
                    className={`${inputStyle} shadow-sm`}
                />
            </div>

            <div>
                <label className={`block mb-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Description
                </label>
                <textarea
                    placeholder="Describe your token..."
                    className={`${inputStyle} shadow-sm`}
                    value={tokenInfo.description}
                    onChange={(e) => setTokenInfo({ ...tokenInfo, description: e.target.value })}
                    rows="3"
                />
            </div>

            <button className={`w-full p-2 rounded-lg shadow-sm ${
                darkMode 
                ? 'bg-white text-black' 
                : 'bg-black text-white'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={createToken}
            disabled={loading}
            >
                {loading ? "Creating..." : "Create Token"}
            </button>
        </div>
    )
}

export default CreateToken