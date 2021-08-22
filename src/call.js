import {
	isOwner, getAccount,
} from './utils';

export const handleCall = async ({
	networkId,
	signature,
	request,
}) => {

	try {
		await isOwner(networkId, signature)
	} catch (e) {
		return new Response('unauthorized', { status: 403 })
	}

	const { accountId } = signature
	const account = getAccount(networkId, accountId)

	const response = await account.functionCall(await request.json())

	return new Response(JSON.stringify(response));
};
