import fetch, { RequestInit } from 'node-fetch';
import client from '../cache';

import { ResponseStatus, FetchResponse } from '../ts/types';

/**
 * 
 * @param playlistUrl 
 * @returns 
 */
export const getPlaylistIdFromUrl = (playlistUrl: string): string | null => {
    const regex = /(https|http):\/\/open.spotify.com\/playlist\/([a-zA-Z0-9]+)\/{0,1}/
    const found = playlistUrl.match(regex);

    if (found && typeof found == 'object') {
        return found[2];
    } else {
        return null;
    }
}

/**
 * Helper function which returns a client credential token
 * @returns string which is access_token
 */
const getAuthToken = async (): Promise<string> => {
    const authHeaderData = 'Basic ' + Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64');
    const fetchParams = new URLSearchParams();
    fetchParams.append('grant_type', 'client_credentials');

    const credentialRequest = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Authorization': authHeaderData
        },
        body: fetchParams
    });
    const parsedCredentialRequest = await credentialRequest.json();
    
    return parsedCredentialRequest['access_token'];
}

/**
 * Wrapper around fetch to ensure target is spotify api
 * @param url URL which is attempted to being reached
 * @param options Additional Fetch options
 * @returns Data from request parsed with json
 */
export const spotifyFetch = async (url : string, options = <RequestInit>{}): Promise<FetchResponse> => {
    // Validate that the url is actually going to the spotify api
    const targetURL = new URL(url);
    if (targetURL.hostname == 'api.spotify.com') {
        // Get credentials
        const spotifyTokenExists = await client.exists('config:spotify-oauth-token');
        let spotifyToken;

        if (!spotifyTokenExists) {
            // Get client credential and retry
            spotifyToken = await getAuthToken();
            await client.set('config:spotify-oauth-token', spotifyToken);
        }

        spotifyToken = await client.get('config:spotify-oauth-token');
        const fetchHeaders = {
            ...options.headers,
            Authorization : 'Bearer ' + spotifyToken
        }

        // Make fetch request via node-fetch
        let requestAttempt = await fetch(url, {
            ...options,
            headers: fetchHeaders
        });

        if (requestAttempt.status == 200) {
            // Return retrieved data
            const parsedData = await requestAttempt.json();
            return <FetchResponse>({ status: ResponseStatus.success, data: parsedData });
        } else if (requestAttempt.status == 401) {
            // Regenerate credentials and try again
            const newAuthToken = await getAuthToken();
            await client.set('config:spotify-oauth-token', newAuthToken);

            requestAttempt = await fetch(url, {
                ...options,
                headers: fetchHeaders
            });

            if (requestAttempt.status == 200) {
                const parsedData = await requestAttempt.json();
                return <FetchResponse>({ status: ResponseStatus.success, data: parsedData });
            } else {
                return <FetchResponse>({ status: ResponseStatus.error });
            }
        } else {
            return <FetchResponse>({ status: ResponseStatus.error });
        }

    }else{
        return <FetchResponse>({ status: ResponseStatus.error });
    }
}