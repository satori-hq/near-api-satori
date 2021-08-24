import {
	isOwner, getAccountWithKey, getAccountWithSecret, b642ab, transactions
} from './utils';

export const handleCall = async ({
	networkId,
	signature, credentials,
	request,
}) => {
	let account
	if (credentials.accountId) {
		account = getAccountWithSecret(networkId, credentials.accountId, credentials.secretKey)
	} else {
		await isOwner(networkId, signature)
		account = getAccountWithKey(networkId, signature.accountId)
	}

	const json = await request.json()
	const { method = 'functionCall' } = json
	switch (method) {
		case 'signAndSendTransaction':
			let actions = json.args[1]
			actions = json.args[1] = Object.entries(actions).map(([name, args]) => {
				switch (name) {
					case 'deployContract':
						/// contract bytes as base64 to Buffer
						args[0] = Buffer.from(args[0], 'base64')
						break;
				}
				/// action { name: [args] } -> instance
				return transactions[name](...Object.values(args))
			})
			break;
	}
	const response = await account[method](...(method !== 'functionCall' ? json.args : [json]))

	const { status, transaction: { hash } } = response
	return new Response(JSON.stringify({ status, hash }));
};
