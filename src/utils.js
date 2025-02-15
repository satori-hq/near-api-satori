import * as nearAPI from 'near-api-js';
const nacl = require('tweetnacl');
const crypto = require('crypto');
const bs58 = require('bs58');

export const {
	Near, Account, KeyPair, keyStores, transactions,
	utils: { format: { parseNearAmount } }, 
} = nearAPI

const n2f = (amount) => parseFloat(parseNearAmount(amount, 8));

export const credentials = [
	JSON.parse(ACCOUNT_0)
];
export const accounts = {};
export const networks = {};
export const keys = {};
export const explorerUrls = {
	testnet: 'https://explorer.testnet.near.org/',
	mainnet: 'https://explorer.near.org/'
};
/// testnet
keys['testnet'] = new keyStores.InMemoryKeyStore()
const nearTestnet = new Near({
	networkId: 'testnet',
	nodeUrl: 'https://rpc.testnet.near.org',
	deps: {
		keyStore: keys['testnet']
	},
});
networks.testnet = nearTestnet;
accounts.testnet = new Account(nearTestnet.connection, 'testnet');
/// mainnet
keys['mainnet'] = new keyStores.InMemoryKeyStore()
const nearMainnet = new Near({
	networkId: 'mainnet',
	nodeUrl: 'https://rpc.mainnet.near.org',
	deps: {
		keyStore: keys['mainnet']
	},
});
networks.mainnet = nearMainnet;
accounts.mainnet = new Account(nearMainnet.connection, 'near');

export const getNear = (networkId) => networks[networkId]
export const getAccount = (networkId, accountId) => new Account(networks[networkId].connection, accountId)
export const getAccountWithKey = (networkId, accountId) => {
	const credential = credentials.find((c) => c.account_id === accountId)
	if (!credential) {
		throw 'no credentials found for ' + accountId
	}
	keys[networkId].setKey(networkId, accountId, KeyPair.fromString(credential.private_key));
	return getAccount(networkId, accountId)
}
export const getAccountWithSecret = (networkId, accountId, secretKey) => {
	if (!secretKey) {
		throw 'no credentials received for ' + accountId
	}
	keys[networkId].setKey(networkId, accountId, KeyPair.fromString(secretKey));
	return getAccount(networkId, accountId)
}

/// signature verification

const VALID_BLOCK_AGE = 100;

const validBlock = async (blockNumber) => {
	const currentBlock = (await connection.provider.status()).sync_info.latest_block_height;
	const givenBlock = Number(blockNumber);
	if (givenBlock <= currentBlock - VALID_BLOCK_AGE || givenBlock > currentBlock) {
		return false;
	}
	return true;
};

export const verifySignature = async (networkId, data) => {
	const near = getNear(networkId)

	const { accountId, blockNumber, blockNumberSignature } = data;
	if (!validBlock(blockNumber)) {
		console.error('Invalid block');
		return false;
	}
	const account = await near.account(accountId);

	try {
		const hash = crypto.createHash('sha256').update(blockNumber).digest();
		let accessKeys = await account.getAccessKeys();
		return accessKeys.some(({ public_key }) => {
			const publicKey = public_key.replace('ed25519:', '');
			return nacl.sign.detached.verify(hash, Buffer.from(blockNumberSignature, 'base64'), bs58.decode(publicKey));
		});
	} catch (e) {
		console.error(e);
		return false;
	}
};

export const isOwner = async (networkId, signature) => {
	if (!signature.accountId) {
		throw 'method requires signature from account';
	}
	if (!await verifySignature(networkId, signature)) {
		throw 'invalid signature';
	}
};

export const nftOwner = async (networkId, signature, nft) => {
	isOwner(networkId, signature);
    
	const { contractId, tokenId } = nft;
	if (!contractId || !tokenId) {
		throw 'method requires near-nft header with { contractId, tokenId }';
	}
	const account = accounts[networkId];
	const token = await account.viewFunction(contractId, 'nft_token', {
		token_id: tokenId
	});
	if (token.owner_id !== signature.accountId) {
		throw 'method requires signature.accountId === token.owner_id';
	}
};

/// JS
export const getNestedField = (obj, field, parse) => {
	const path = field.split('.');
	try {
		for (let i = 0; i < path.length; i++) {
			obj = obj[path[i]];
		}
		if (parse === 'int') {
			return !!obj ? parseInt(obj) : 0;
		}
		if (parse === 'bn') {
			return !!obj ? n2f(obj) : n2f('0');
		}
		return obj;
	} catch (e) { }
	// error finding field
	if (parse === 'int') {
		return 0;
	}
	if (parse === 'bn') {
		return n2f('0');
	}
	return obj;
};

// CFW

export const getParamsObj = (params) => {
	const paramsObj = {};
	for (let [k, v] of params.entries()) {
		paramsObj[k] = v;
	}
	return paramsObj;
};