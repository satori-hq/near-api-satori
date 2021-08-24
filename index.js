import { handleOptions, corsHeaders, jsonHeaders } from './src/cors';
import { checkCache } from './src/cache';
import { handleView } from './src/view';
import { handleCall } from './src/call';
import { handleBatch } from './src/batch'
import { handleUpload, handleShare } from './src/upload'
import { handleRedirect } from './src/redirect'
import { getParamsObj } from './src/utils';
import { pathToArgs } from './src/path';

const skipCache = /upload|call/

async function handleRequest(event) {
	/// unpack all the request info we can
	const { request } = event
	const { headers } = request
    const userAgent = headers.get('user-agent') || ''
    const networkId = headers.get('near-network') || 'testnet'
    const signature = JSON.parse(headers.get('near-signature') || '{}')
    const credentials = JSON.parse(headers.get('near-credentials') || '{}')
	const url = new URL(request.url)
	const { searchParams, pathname } = url
	if (pathname === '/favicon.ico') return new Response('')
	let params = getParamsObj(searchParams)
    let cacheMaxAge = headers.get('max-age') || '60'
	const pathArgs = pathToArgs(pathname)
	Object.assign(params, pathArgs)

	// CACHING - '0' means "skip cache"
	if (skipCache.test(params.type)) {
		cacheMaxAge = '0'
	}
	/// if there's a cached response, serve it
	const { cache, cachedResponse, cacheKey } = await checkCache({ request, params, url, corsHeaders, cacheMaxAge })
	if (cachedResponse) {
		return cachedResponse
	}
	/// reset for future calls
	if (cacheMaxAge === '0') {
		cacheMaxAge = '60'
	}

	/// HANDLERS
	const methodArgs = {
		event, request, url, params, userAgent, signature, credentials,
		jsonHeaders, corsHeaders,
		cache, cacheKey, cacheMaxAge, networkId,
	}
	switch (request.method) {
		case 'GET': 
			switch (params.type) {
				case 'share': return await handleShare(methodArgs)
				case 'view': return await handleView(methodArgs)
				case 'batch': return await handleBatch(methodArgs)
			}
		case 'POST': 
			switch (params.type) {
				case 'call': return await handleCall(methodArgs)
				case 'batch': 
					params.views = await request.json()
					return await handleBatch(methodArgs)
				case 'upload': return await handleUpload(methodArgs)
				case 'redirect': return await handleRedirect(methodArgs)
			}
	}
}

addEventListener('fetch', (event) => {
	const { request } = event
	if (request.method === "OPTIONS") {
		event.respondWith(handleOptions(request))
		return
	}
	event.respondWith(wrapRequest(event))
})

async function wrapRequest(event) {
	try {
		return await handleRequest(event)
	} catch(e) {
		console.warn(e)
		return new Response(JSON.stringify({ error: e.toString() }), {
			headers: jsonHeaders,
			status: 500,
		})
	}
}