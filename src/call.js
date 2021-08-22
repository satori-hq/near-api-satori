import { 
	accounts,
	getNestedField,
} from './utils';

export const handleCall = async ({
	event, url, params, corsHeaders, jsonHeaders, userAgent,
	cache, cacheKey, cacheMaxAge, networkId,
	request,
}) => {
	const { 
		contractId,
		methodName,
		args,
		gas,
		attachedDeposit,
	} = await request.json();

	return new Response(JSON.stringify({
		contractId,
		methodName,
		args,
		gas,
		attachedDeposit
	}));
};
