const assert = require('assert');
const fs = require('fs');
const fetch = require("node-fetch");
/// dev-1622483586098-7037602
const { near, keyStore, networkId, account, getSignature, GAS: gas } = require("./near-utils");
const nearAPI = require('near-api-js');
const {
	Account, KeyPair,
	utils: {
		format: {
			parseNearAmount
		}
	}
} = nearAPI;

const contractId = 'dev-1623990723679-78605620599599';
const tokenId = 'HipHopHead.10.143.11151512:1';
// consts
let domain = 'http://127.0.0.1:8787';
// domain = 'https://near-api-satori.near.workers.dev/'
const domainAndPath = domain + '/v1/contract/';
const testNFTPath = domainAndPath + contractId + '/nft_token/';
const batchPath = domain + '/v1/batch/';
const uploadPath = domain + '/v1/upload/';
const callPath = domain + '/v1/call/';
const sharePath = domain + '/v1/share/';

/** 
 * Batch near-api-js RPC calls.
 * 
 * Optionally flatten and sort arrays of objects.
 * 
 * ## 🚨 Warning this is WIP 🚨 
 * - Not officially supported (yet)
 * - Potential syntax changes
 * - For now route does nothing (v1/testnet/view only example)
 * 
 * ## Notes
 * I am aware snake_case and JSON in REST is ugly. However, not willing to convert all method names and args from what you would normally use with near-api-js. e.g. maintain consistency between these API calls and RPC calls as best I can.
 * 
 * ## Syntax
 * ```bash
 * # GET (note with http you need to escape the JSON with single quotes first)
 * http https://helper.nearapi.org/v1/contract/dev-1618440176640-7650905/nft_token/'{"token_id":"token-1619265007329"}'
 * ```
 * 
 * # Example calls from client side:
 * ```js
 * // consts
 * const domain = 'http://127.0.0.1:8787'; // wrangler dev local testing
 * // const domain = 'https://helper.nearapi.org/v1/contract/' // testnet helper domain
 * const domainAndPath = domain + '/v1/contract/';
 * const testNFTPath = domainAndPath + 'dev-1618440176640-7650905/nft_token/';
 * const batchPath = domain + '/v1/batch/';
```
 */
describe('NEAR API Helper', function () {
	this.timeout(30000);

	/** 
	 * Working for regular functionCall
	 * NFT contract from:
	 * https://github.com/near-apps/nft-market/tree/main/contracts/nft-simple/src
	 */
	it('should return call args', async function () {
		const { contractId } = account;
		const signature = await getSignature(account);

		const response = await fetch(callPath, {
			method: 'POST',
			headers: {
				'near-signature': JSON.stringify(signature),
			},
			body: JSON.stringify({
				contractId,
				methodName: 'set_contract_royalty',
				args: {
					contract_royalty: 1000
				},
				gas,
				// attachedDeposit: '0',
			})
		}).then((res) => res.text());

		console.log(response)
	});

	/** 
	 * Mainnet Test of batch call against NFT contract enumerable methods - uhhmnft.near
	 */
	it('should return a batched response from a mainnet nft contract', async function() {

		const batch = [{
			contract: 'uhhmnft.near',
			method: 'nft_tokens',
			args: {},
			batch: {
				from_index: '0', // must be name of contract arg (above)
				limit: '100', // must be name of contract arg (above)
				step: '50', // divides contract arg 'limit'
				flatten: [], // how to combine results
			},
		}];

		const url = batchPath + JSON.stringify(batch);
		console.log('\n URL:\n', url, '\n');

		const response = await fetch(url, {
			headers: {
				'near-network': 'mainnet'
			}
		}).then((res) => res.json());

		assert.strictEqual(response[0].length > 50, true);
	});

	/**
	 * Get the share link only using fn -> uploaded image url and bot response
	 */
	 it('should get a share link and check the bot response', async function() {
		// account is NFT owner in contractId and owns the nft in tokenId
		const { contractId, tokenId } = account;
		const nft = { contractId, tokenId };

		const title = 'hello world!';
		const url = sharePath + JSON.stringify({
			title,
			description: 'this is a test',
			nft,
			redirect: "https%3A%2F%2Fmobile.twitter.com%2Fhome"
		});
		console.log('\n URL:\n', url, '\n');

		const response = await fetch(url).then((res) => res.json());

		// console.log(response)

		assert.strictEqual(!!response.encodedUrl, true);

		const response2 = await fetch(response.encodedUrl, {
			headers: {
				'user-agent': 'facebookexternalhit'
			}
		}).then((res) => res.text());

		// console.log(response2)

		assert.strictEqual(response2.indexOf(response.fn) > -1, true);
		assert.strictEqual(response2.indexOf(title) > -1, true);
	});

	/** 
	 * Returns a raw response for a given view near-api-js call (viewFunction)
	 */
	it('should have the whole rpc response', async function() {  
		const args = JSON.stringify({
			token_id: tokenId
		});
		const url = testNFTPath + args;
		console.log('\n URL:\n', url, '\n');
		const response = await fetch(url).then((res) => res.json());

		assert.strictEqual(Object.keys(response).length > 1, true);
	});

	/** 
	 * Use this to drill into JSON responses (e.g. get metadata for a token)
	 */
	it('should return just a field with the last field name as key', async function() {  
		const args = JSON.stringify({
			token_id: tokenId
		});
		const actions = JSON.stringify({
			field: 'metadata.media'
		});
		const url = testNFTPath + args + '/' + actions;
		console.log('\n URL:\n', url, '\n');
		const response = await fetch(url).then((res) => res.json());

		assert.strictEqual(Object.keys(response).length, 1);
	});

	/** 
	 * Creates a bot response for when you share your links (link previews with images etc...)
	 */
	it('should have a bot response with customized fields', async function() {  
		const args = JSON.stringify({
			token_id: tokenId
		});
		const actions = JSON.stringify({
			botMap: {
				'og:title': 'MEOW',
				'og:image': { field: 'metadata.media' }
			}
		});
		const url = testNFTPath + args + '/' + actions;
		console.log('\n URL:\n', url, '\n');
		const response = await fetch(url, {
			headers: {
				'user-agent': 'facebookexternalhit'
			}
		}).then((res) => res.text());

		console.log(response);

		assert.strictEqual(response.indexOf('MEOW') > -1, true);
	});

	/** 
	 * Turn your call into an encoded URL that you can use for sharing (prettier than JSON in REST)
	 * 
	 * botMap for bots -> link preview
	 * redirect for users -> NFT item
	 */
	it('should return an encoded url', async function() {
		const args = JSON.stringify({
			token_id: tokenId
		});
		const actions = JSON.stringify({
			botMap: {
				'og:title': 'MEOW',
				'og:image': { field: 'metadata.media' }
			},
			redirect: 'https%3A%2F%2Fnear-apps.github.io%2Fnft-market%2F',
			encodeUrl: true,
		});
		const url = testNFTPath + args + '/' + actions;
		console.log('\n URL:\n', url, '\n');
		const response = await fetch(url).then((res) => res.json());
		assert.strictEqual(Object.keys(response)[0], 'encodedUrl');

		// redirect will return html from market which should not contain the string MEOW
		const encodedUrl = Object.values(response)[0];
		console.log('\n URL:\n', encodedUrl, '\n');
		const response2 = await fetch(encodedUrl).then((res) => res.text());
		assert.strictEqual(response2.indexOf('MEOW') === -1, true);
	});

	/** 
	 * Use this to get a lot of data at once.
	 * 
	 * Call different view methods.
	 * 
	 * Within each call, the first and second arguments of batch must have names matching the contract arguments used for offset and limit.
	 * 
	 * e.g. if the contract has args like "offset" and "num", you need to use: batch: { offset: '0', num: '100', step: '10' }
	 * 
	 * This means "start at '0' and keep making RPC calls until '100' increasing by '10' each time." creating a total of 10 RPC calls in the helper, but only 1 call and reponse for the user.
	 * 
	 * flatten: [] combines results into an array vs. separate RPC results
	 * 
	 * WIP
	 * sort.field: what field on the objects to use for sorting
	 * sort.parse: how to treat the field "int": parseInt or "bn": parseFloat(parseNearAmount(val, 8)) // 8 decimal approximation of NEAR
	 */
	it('should return a batched response', async function() {

		/// uhhhm testnet
		const contract = 'dev-1623990723679-78605620599599'

		const batch = [{
			contract,
			method: 'nft_tokens',
			args: {},
			batch: {
				from_index: '0', // must be name of contract arg (above)
				limit: '20', // must be name of contract arg (above)
				step: '10', // divides contract arg 'limit'
				flatten: [], // how to combine results
			},
			sort: {
				path: 'metadata.issued_at',
			}
		},
		{
			contract: 'market.' + contract,
			method: 'get_sales_by_nft_contract_id',
			args: {
				nft_contract_id: contract
			},
			batch: {
				from_index: '0', // must be name of contract arg (above)
				limit: '20', // must be name of contract arg (above)
				step: '10', // divides contract arg 'limit'
				flatten: [], // how to combine results
			},
			sort: {
				path: 'conditions.near',
				parse: 'bn'
			}
		}];

		const url = batchPath + JSON.stringify(batch);
		console.log('\n URL:\n', url, '\n');

		const response = await fetch(url).then((res) => res.json());

		assert.strictEqual(response.length, 2);
		assert.strictEqual(response[0].length > 10, true);
		assert.strictEqual(response[1].length > 0, true);
	});


	/** 
	 * Use this to split a call that requires sending an array of ids to a view method.
	 * 
	 * The array of ids will be automatically split up into separate RPC calls and the results will be flattened back together.
	 * 
	 * WIP
	 * sort.field: what field on the objects to use for sorting
	 * sort.parse: how to treat the field "int": parseInt or "bn": parseFloat(parseNearAmount(val, 8)) // 8 decimal approximation of NEAR
	 */
	it('should process a batch of input (token_ids) sent via POST', async function() {

		const batch = [{
			contract: contractId,
			method: 'nft_tokens',
			args: {},
			batch: {
				from_index: '0', // must be name of contract arg (above)
				limit: '200', // must be name of contract arg (above)
				step: '10', // divides contract arg 'limit'
				flatten: [], // how to combine results
			},
			sort: {
				path: 'metadata.issued_at',
			}
		}];

		const url = batchPath + JSON.stringify(batch);
		console.log('\n URL:\n', url, '\n');
		const response = await fetch(url).then((res) => res.json());

		const token_ids = response[0].map(({ token_id }) => token_id);

		const batch2 = [{
			contract: contractId,
			method: 'nft_tokens_batch',
			args: {
				token_ids
			},
			batch: {
				from_index: '0',
				limit: '2000',
				step: '50', // divides batch above
				flatten: [],
			},
			sort: {
				path: 'metadata.issued_at',
			}
		}];

		// use POST - token_ids array too large for GET url
		const url2 = batchPath + JSON.stringify({});
		console.log('\n URL:\n', url2, '\n');
		const response2 = await fetch(url2, {
			method: 'POST',
			body: JSON.stringify(batch2)
		}).then((res) => res.json());

		assert.strictEqual(response2.length, 1);
		assert.strictEqual(response2[0].length > 20, true);
	});



	/** 
	 * Can create account and deploy contract, functionCall with batch TX actions
	 * 
	 * Commented because it's expensive to repeat this test
	 */
	// it('should return call args', async function () {

	// 	/// dev-1622483586098-7037602
	// 	const signature = await getSignature(account);
	// 	const newAccountId = 'test-' + Date.now()
	// 	const keyPair = KeyPair.fromRandom('ed25519')

	// 	const response = await fetch(callPath, {
	// 		method: 'POST',
	// 		headers: {
	// 			'near-signature': JSON.stringify(signature),
	// 		},
	// 		body: JSON.stringify({
	// 			/// createAccount(newAccountId: string, publicKey: string | PublicKey, amount: BN)
	// 			args: [
	// 				newAccountId,
	// 				keyPair.publicKey.toString(),
	// 				parseNearAmount('4'),
	// 			],
	// 			method: 'createAccount',
	// 		})
	// 	}).then((res) => res.text());
	// 	console.log(response)

	// 	/// must preprare bytes as base64 for POST body
	// 	const b64 = fs.readFileSync('./test/main.wasm').toString('base64')

	// 	const actions = {
	// 		deployContract: [b64],
	// 		functionCall: ['new', {
	// 			owner_id: newAccountId,
	// 			metadata: {
	// 				spec: 'nft-1.0.0',
	// 				name: 'Satori NFTs',
	// 				symbol: 'SNFT',
	// 			},
	// 		}, gas]
	// 	}

	// 	const response2 = await fetch(callPath, {
	// 		method: 'POST',
	// 		headers: {
	// 			'near-credentials': JSON.stringify({ accountId: newAccountId, secretKey: keyPair.secretKey })
	// 		},
	// 		body: JSON.stringify({
	// 			args: [
	// 				newAccountId,
	// 				actions
	// 			],
	// 			method: 'signAndSendTransaction',
	// 		})
	// 	}).then((res) => res.text());
	// 	console.log(response2)
	// });

	// /** 
	//  * Using backblaze as image store (S3 style service) and then caching that image for link previews
	//  * 
	//  * Commented because this service might not be available
	//  * 
	//  * Also should be limited to specific NFT contracts we know have paid the storage amount (either in NEAR as a wash from FIAT or pre-approved partners)
	//  */
	// it('should upload an image if account owns NFT', async function() {
	// 	// account is NFT owner in contractId and owns the nft in tokenId
	// 	const signature = await getSignature(account);
	// 	const { contractId, tokenId } = account;
	// 	const nft = { contractId, tokenId };

	// 	const url = uploadPath + JSON.stringify({
	// 		nft,
	// 		redirect: "https%3A%2F%2Fmobile.twitter.com%2Fhome"
	// 	});
	// 	console.log('\n URL:\n', url, '\n');

	// 	const response = await fetch(url, {
	// 		headers: {
	// 			'near-signature': JSON.stringify(signature),
	// 		},
	// 		method: 'POST',
	// 		body: 'test'
	// 	}).then((res) => res.json());

	// 	// console.log(response)

	// 	assert.strictEqual(!!response.encodedUrl, true);

	// 	const response2 = await fetch(response.encodedUrl, {
	// 		headers: {
	// 			'user-agent': 'facebookexternalhit'
	// 		}
	// 	}).then((res) => res.text());

	// 	// console.log(response2)

	// 	assert.strictEqual(response2.indexOf(response.fn) > -1, true);
	// });

});