import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import React, { useState } from 'react';
import { toast } from 'sonner';
import CreateToken from './CreateToken';
import SendToken from './SendToken';
import ManageToken from './ManageToken';

function TokenSection({ darkMode,getBalance ,balance}) {
  const [activeTab, setActiveTab] = useState('create');
  
  const tabStyle = (isActive) => `px-4 py-2 rounded-lg text-sm ${
    isActive
      ? darkMode 
        ? 'bg-white text-black' 
        : 'bg-black text-white'
      : darkMode
        ? 'text-gray-400'
        : 'text-gray-600'
  }`;

  return (
    <div className={`p-6 rounded-lg border ${
      darkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-200'
    } shadow-sm`}>
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('create')}
          className={tabStyle(activeTab === 'create')}
        >
          Create Token
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={tabStyle(activeTab === 'manage')}
        >
          Manage Tokens
        </button>
        <button
          onClick={() => setActiveTab('send')}
          className={tabStyle(activeTab === 'send')}
        >
          Send Tokens
        </button>
      </div>

      {activeTab === 'create' && (
        <CreateToken darkMode={darkMode} getBalance={getBalance} />
      )}

      {activeTab === 'manage' && (
        <ManageToken darkMode={darkMode} getBalance={getBalance}/>
      )}

      {activeTab === 'send' && (
        <SendToken darkMode={darkMode} getBalance={getBalance}  balance={balance}  />
      )}
    </div>
  );
}

export default TokenSection;