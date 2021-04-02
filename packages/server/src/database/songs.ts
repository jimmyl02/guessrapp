import db from './db';

export interface Song {
    playlist_id: string,
    name: string,
    artists: string,
    image_url: string,
    preview_url: string
}

export const insertNewSong = async (playlist_id: string, name: string, artists: string, image_url: string, preview_url: string): Promise<void> => {
    await db.query('INSERT INTO songs (playlist_id, name, artists, image_url, preview_url) VALUES ($1, $2, $3, $4, $5)', [playlist_id, name, artists, image_url, preview_url])
}

export const getSongsByPlaylistId = async (playlist_id: string): Promise<Song[]> => {
    const queryResult = await db.query('SELECT * FROM songs WHERE playlist_id = $1', [playlist_id]);
    return queryResult.rows;
}

export const deleteSongByPlaylistId = async (playlist_id: string): Promise<void> => {
    await db.query('DELETE FROM songs WHERE playlist_id = $1', [playlist_id]);
}