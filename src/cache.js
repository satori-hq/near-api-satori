const sha256 = async (message) => {
	const msgBuffer = new TextEncoder().encode(message);
	const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray.map(b => ("00" + b.toString(16)).slice(-2)).join("");
	return hashHex;
};

export const checkCache = async ({ request, params, url, corsHeaders, cacheMaxAge }) => {
	let { method } = request;

	const cache = caches.default;

	if (cacheMaxAge === '0') {
		return {cache, cacheKey: url.toString(), cachedResponse: false };
	}

	const body = method === 'POST' && await request.clone().text();
	const hash = await sha256(url.toString() + body);
	const cacheUrl = new URL(url.origin);
	cacheUrl.pathname = '/c/' + hash;
	const cacheKey = cacheUrl.toString();

	let cachedResponse = await cache.match(cacheKey);

	if (!params.skipcache && cachedResponse) {
		cachedResponse = new Response(cachedResponse.body, {
			headers: Object.assign(corsHeaders, cachedResponse.headers)
		});
		cachedResponse.headers.append('cached', 'true');
		return { cache, cachedResponse, cacheKey };
	}
    
	return {cache, cacheKey, cachedResponse: false };
};