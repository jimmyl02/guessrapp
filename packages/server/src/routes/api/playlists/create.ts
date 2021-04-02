import { Request, Response } from 'express';
import Ajv from 'ajv';
import { spotifyFetch, getPlaylistIdFromUrl } from '../../../util/spotify';
import * as db from '../../../database';

import { RequestResponse, ResponseStatus } from '../../../ts/types';

const ajv = new Ajv({ allErrors: true });

interface SpotifyApiTrack {
    track: {
        album: {
            images: { height: number, url: string, width: number }[]
        },
        artists: { name: string }[],
        name: string,
        preview_url: string
    }
}

interface SpotifyApiPlaylist {
    images: { height: number, url: string, width: number }[], 
    name: string,
    snapshot_id: string,
    tracks: {
        items: SpotifyApiTrack[],
        next: string | undefined
    }
}

const schema = {
    type: 'object',
    properties: {
        playlist_url: {
            type: 'string'
        }
    },
    required: ['playlist_url']
};

const validate = ajv.compile(schema);

/**
 * /api/playlists/create
 * Handles creating playlists and updating them if the snapshot id has changed
 */
const handler = async (req: Request, res: Response): Promise<any> => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const body = req.body;
    if (validate(body)) {
        const playlistId = getPlaylistIdFromUrl(body['playlist_url']);

        if (playlistId) {
            // found playlist id
            let fieldsParam = 'fields=(snapshot_id)';
            let apiSongListUrl = 'https://api.spotify.com/v1/playlists/' + playlistId + '?' + fieldsParam;
            let songDataRequest = await spotifyFetch(apiSongListUrl);

            if (songDataRequest.status == ResponseStatus.success) {
                // we were able to pull song data from spotify, now process and add to db
                let songData = <SpotifyApiPlaylist>songDataRequest['data'];
                const playlistSnapshot = songData['snapshot_id'];
                const currentPlayListWithId = await db.playlists.getPlaylistById(playlistId);

                // if snapshot ids are the same then we know they are currently the same
                if (currentPlayListWithId && currentPlayListWithId.snapshot_id == playlistSnapshot) {
                    // the snapshots are the same and we are done because all the data is in db already
                    return res.send(<RequestResponse>({ status: ResponseStatus.success, data: 'playlist is stored and ready to be played' }));
                } else {
                    // snapshots are different, we first delete existing snapshot and songs from database then add new ones
                    await db.playlists.deletePlaylistById(playlistId);
                    await db.songs.deleteSongByPlaylistId(playlistId);

                    fieldsParam = 'fields=(snapshot_id%2C%20name%2C%20images%2C%20tracks(next)%2C%20tracks.items(track(name%2C%20artists(name)%2C%20preview_url%2C%20album.images)))';
                    apiSongListUrl = 'https://api.spotify.com/v1/playlists/' + playlistId + '?' + fieldsParam;
                    songDataRequest = await spotifyFetch(apiSongListUrl);
                    songData = <SpotifyApiPlaylist>songDataRequest['data'];

                    if (songDataRequest.status == ResponseStatus.success) {
                        // logic to add new songs and playlist into database
                        await db.playlists.insertNewPlaylist(playlistId, songData['name'], playlistSnapshot, songData['images'][0]['url']);

                        let cont;
                        do {
                            cont = false;
                            if (!songData['tracks']) break; // special case where there is 100 songs then next query will be totally empty

                            const tracks = songData['tracks']['items'];

                            for (const trackObj of tracks) {
                                const track = trackObj['track'];
                                if (track['preview_url']) {
                                    let artistsString = '';
                                    track['artists'].forEach((artist) => {
                                        artistsString += artist['name'];
                                    });
                                    await db.songs.insertNewSong(playlistId, track['name'], artistsString, track['album']['images'][0]['url'], track['preview_url']);
                                }
                            }

                            // use the next and add fieldsParam to get all songs in the playlist
                            let nextUrl = songData['tracks']['next'];
                            if (nextUrl) {
                                cont = true;
                                nextUrl += '&' + fieldsParam;
                                songDataRequest = await spotifyFetch(nextUrl);
                                songData = <SpotifyApiPlaylist>songDataRequest['data'];            
                            }
                        } while (cont); // there is another offset we must visit

                        return res.send(<RequestResponse>({ status: ResponseStatus.success, data: 'playlist is stored and ready to be played' }));
                    } else {
                        return res.send(<RequestResponse>({ status: ResponseStatus.error, data: 'an error occured, please try again at a later time' }));
                    }
                }
            } else {
                return res.send(<RequestResponse>({ status: ResponseStatus.error, data: 'an error occured, please try again at a later time' }));
            }
        } else {
            return res.send(<RequestResponse>({ status: ResponseStatus.error, data: 'the url did not match a playlist url' }));
        }
    } else {
        return res.send(<RequestResponse>({ status: ResponseStatus.error, data: validate.errors }));
    }
};

export default handler;