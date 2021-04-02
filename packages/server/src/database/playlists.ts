import db from './db';

export interface Playlist {
    playlist_id: string,
    name: string,
    snapshot_id: string,
    image_url: string
}

export const insertNewPlaylist = async (playlist_id: string, name: string, snapshot_id: string, image_url: string): Promise<void> => {
    await db.query('INSERT INTO playlists (playlist_id, name, snapshot_id, image_url) VALUES ($1, $2, $3, $4)', [playlist_id, name, snapshot_id, image_url])
}

export const getPlaylistById = async (playlist_id: string): Promise<Playlist | undefined> => {
    const queryResult = await db.query('SELECT * FROM playlists WHERE playlist_id = $1', [playlist_id]);
    return queryResult.rows[0];
}

export const deletePlaylistById = async (playlist_id: string): Promise<void> => {
    await db.query('DELETE FROM playlists WHERE playlist_id = $1', [playlist_id]);
}