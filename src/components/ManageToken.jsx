import { getTokenMetadata } from '@solana/spl-token';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import React, { useState, useEffect } from 'react';

function ManageToken({ darkMode }) {
const wallet = useWallet();
const { connection } = useConnection();
const [tokens, setTokens] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
    if (wallet.connected) {
        fetchTokens();
    }
}, [wallet.connected, connection]);

async function fetchTokens() {
    try {
        setLoading(true);
        setError(null);
        const tokenList = await fetchAllTokensWithMetadata();
        setTokens(tokenList);
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
                .map(async ({ account }) => {
                const info = account.data.parsed.info;
                const mint = new PublicKey(info.mint);
                const balance = info.tokenAmount.uiAmount;

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

const handleViewMore = (token) => {
    const explorerUrl = `https://explorer.solana.com/address/${token.mint}?cluster=${getClusterParam()}`;
    window.open(explorerUrl, '_blank');
};

const getClusterParam = () => {
    const url = connection.rpcEndpoint;
    if (url.includes('devnet')) return 'devnet';
    if (url.includes('testnet')) return 'testnet';
    return 'mainnet-beta'; 
};

return (
    <div className={`p-6 rounded-lg ${darkMode ? 'bg-black text-white' : 'bg-white text-gray-800'}`}>
        <h2 className="text-2xl font-bold mb-6">Manage Tokens</h2>
    
        {!wallet.connected ? (
            <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg">
            <p className="text-lg mb-4">Please connect your wallet first</p>
            <button 
                className={`px-6 py-2 rounded-md ${darkMode ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                onClick={() => wallet.connect()}
            >
                Connect Wallet
            </button>
            </div>
        ) : (
            <div>
                {loading ? (
                    <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : error ? (
                    <div className="text-red-500 p-4 text-center">{error}</div>
                ) : tokens.length === 0 ? (
                    <div className="text-center p-8">
                    <p>No tokens found in your wallet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                    <table className={`min-w-full ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <tr>
                            <th className="py-3 px-4 text-left">TOKEN</th>
                            <th className="py-3 px-4 text-left">NAME</th>
                            <th className="py-3 px-4 text-left">SYMBOL</th>
                            <th className="py-3 px-4 text-right">BALANCE</th>
                            <th className="py-3 px-4 text-center">VIEW MORE</th>
                        </tr>
                        </thead>
                        <tbody>
                        {tokens.map((token, index) => (
                            <tr 
                            key={`${token.mint}-${index}`} 
                            className={`border-b ${darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}
                            >
                            <td className="py-4 px-4">
                                <div className="flex items-center">
                                {token.image ? (
                                    <img src={token.image} alt={token.symbol} className="w-8 h-8 rounded-full mr-3" />
                                ) : (
                                    <div className={`w-8 h-8 rounded-full mr-3 flex items-center justify-center ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                                    {token.symbol.charAt(0)}
                                    </div>
                                )}
                                <span className="font-mono text-sm">{`${token.mint.slice(0, 4)}...${token.mint.slice(-4)}`}</span>
                                </div>
                            </td>
                            <td className="py-4 px-4">{token.name}</td>
                            <td className="py-4 px-4">{token.symbol}</td>
                            <td className="py-4 px-4 text-right">{token.balance.toLocaleString()}</td>
                            <td className="py-4 px-4 text-center">
                                <button 
                                onClick={() => handleViewMore(token)}
                                className={`px-3 py-1 rounded text-sm ${darkMode ? 'bg-white text-black'   : 'bg-black text-white'}`}
                                >
                                View in Explorer
                                </button>
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    </div>
                )}
            
            <div className="mt-6 flex justify-end">
                <button 
                onClick={fetchTokens} 
                className={`px-4 py-2 rounded ${darkMode ? 'bg-white text-black' : 'bg-black text-white'} `}
                >
                Refresh Tokens
                </button>
            </div>
            </div>
        )}
    </div>
);
}

export default ManageToken; 