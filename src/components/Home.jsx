import React, { useState } from 'react';
import Navbar from './Navbar';
import WalletSection from './WalletSection';
import TokenSection from './TokenSection';
import Footer from './Footer';
import { useConnection } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js';


function Home() {
    const [darkMode, setDarkMode] = useState(true);
    const [balance, setBalance] = useState(0);
    const [pubKey, setPubKey] = useState('');
    const {connection} = useConnection()
    async function getBalance() { 
        if (pubKey) {
            const balance = await connection.getBalance(pubKey);
            setBalance(balance / LAMPORTS_PER_SOL)
        }
    }
    return (
        <div className={`min-h-screen ${darkMode ? 'dark bg-black' : 'bg-gray-50'}`}>
            <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />
            <main className="container mx-auto px-4 py-8">
                <div className="text-center mb-8">
                    <h1 className={`text-4xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-black'}`}>
                        Decentralized Application
                    </h1>
                    <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Built on Solana blockchain for token management
                    </p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="shadow-lg">
                        <WalletSection darkMode={darkMode} setPubKey={setPubKey} getBalance = {getBalance} balance={balance} setBalance={setBalance} />
                    </div>
                    <div className="shadow-lg">
                        <TokenSection darkMode={darkMode} getBalance = {getBalance} balance={balance} />
                    </div>
                </div>
            </main>
            <Footer darkMode={darkMode} />
        </div>
    );
}

export default Home;