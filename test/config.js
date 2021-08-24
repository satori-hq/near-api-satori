module.exports = function getConfig(networkId) {
	let config = {
		networkId,
		nodeUrl: 'https://rpc.testnet.near.org',
		walletUrl: 'https://wallet.testnet.near.org',
		helperUrl: 'https://helper.testnet.near.org',
	};
    
	if (networkId !== undefined) {
		config = {
			...config,
			GAS: '200000000000000',
			DEFAULT_NEW_ACCOUNT_AMOUNT: '5',
			contractMethods: {
				changeMethods: ['new', 'create', 'purchase'],
				viewMethods: ['get_message'],
			},
		};
	}
    
	if (networkId === 'prod') {
		config = {
			...config,
			networkId: 'mainnet',
			nodeUrl: 'https://rpc.mainnet.near.org',
			walletUrl: 'https://wallet.near.org',
			helperUrl: 'https://helper.mainnet.near.org',
		};
	}

	return config;
};
