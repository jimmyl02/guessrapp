'use strict';

var dbm;
var type;
var seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db) {
  return db.createTable('songs', {
    playlist_id: 'string',
    name: 'string',
    artists: 'string',
    image_url: 'string',
    preview_url: 'string'
  });
};

exports.down = function(db) {
  return db.dropTable('songs');
};

exports._meta = {
  "version": 1
};
