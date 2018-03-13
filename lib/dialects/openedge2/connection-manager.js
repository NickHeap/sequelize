'use strict';

const _ = require('lodash');
const AbstractConnectionManager = require('../abstract/connection-manager');
const Utils = require('../../utils');
const debug = Utils.getLogger().debugContext('connection:openedge');
const Promise = require('../../promise');
const sequelizeErrors = require('../../errors');
const semver = require('semver');
const dataTypes = require('../../data-types');
const moment = require('moment-timezone');

class ConnectionManager extends AbstractConnectionManager {
  constructor(dialect, sequelize) {
    super(dialect, sequelize);

    this.sequelize = sequelize;
    this.sequelize.config.port = this.sequelize.config.port || 20666;
    try {
      let odbcLib;
      if (sequelize.config.dialectModulePath) {
        odbcLib = require(sequelize.config.dialectModulePath);
      } else {
        odbcLib = require('odbc');
      }
      this.lib = sequelize.config.native ? odbcLib.native : odbcLib;
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') {
        throw new Error('Please install \'' + (sequelize.config.dialectModulePath || 'odbc') + '\' module manually');
      }
      throw err;
    }

    this._clearTypeParser();
    this.refreshTypeParser(dataTypes.openedge);
  }

  // Expose this as a method so that the parsing may be updated when the user has added additional, custom types
  _refreshTypeParser(dataType) {
    if (dataType.types.openedge.oids) {
      for (const oid of dataType.types.openedge.oids) {
        this.oidMap[oid] = value => dataType.parse(value, oid, this.lib.types.getTypeParser);
      }
    }

    if (dataType.types.openedge.array_oids) {
      for (const oid of dataType.types.openedge.array_oids) {
        this.arrayOidMap[oid] = value => {
          return this.lib.types.arrayParser.create(value, v =>
            dataType.parse(v, oid, this.lib.types.getTypeParser)
          ).parse();
        };
      }
    }
  }

  _clearTypeParser() {
    this.oidMap = {};
    this.arrayOidMap = {};
  }

  getTypeParser(oid) {
    if (this.oidMap[oid]) {
      return this.oidMap[oid];
    } else if (this.arrayOidMap[oid]) {
      return this.arrayOidMap[oid];
    }

    return this.lib.types.getTypeParser.apply(undefined, arguments);
  }

  connect(config) {
    config.user = config.username;
    const connectionConfig = _.pick(config, [
      'dsn', 'user', 'password', 'host', 'database', 'port'
    ]);
    //const connectionConfig = 'DSN=' + config.dsn + ';HOST=' + config.host + ';PORT=' + config.port + ';DATABASE=' + config.database + ';UID=' + config.user + ';PASSWORD=' + config.password;

    connectionConfig.types = {
      getTypeParser: ConnectionManager.prototype.getTypeParser.bind(this)
    };

    if (config.dialectOptions) {
      _.merge(connectionConfig,
        _.pick(config.dialectOptions, [
          'dsn',
          'driver'
        ]));
    }

    return new Promise((resolve, reject) => {
      let responded = false;

      var connectionString = 'HOST=' + connectionConfig.host + ';PORT=' + connectionConfig.port + ';DATABASE=' + connectionConfig.database + ';UID=' + connectionConfig.user + ';PASSWORD=' + connectionConfig.password;
      if (connectionConfig.dsn) {
        connectionString = 'DSN=' + connectionConfig.dsn + ';' + connectionString;
      } else {
        connectionString = 'Driver=' + connectionConfig.driver + ';' + connectionString;
      }

      require("odbc").open(connectionString, function (err, connection){
        //db is already open now if err is falsy 
        if (err) {
          if (err.code) {
            switch (err.code) {
              case 'ECONNREFUSED':
                reject(new sequelizeErrors.ConnectionRefusedError(err));
                break;
              case 'ENOTFOUND':
                reject(new sequelizeErrors.HostNotFoundError(err));
                break;
              case 'EHOSTUNREACH':
                reject(new sequelizeErrors.HostNotReachableError(err));
                break;
              case 'EINVAL':
                reject(new sequelizeErrors.InvalidConnectionError(err));
                break;
              default:
                reject(new sequelizeErrors.ConnectionError(err));
                break;
            }
          } else {
            reject(new sequelizeErrors.ConnectionError(err));
          }
          return;
        }
        responded = true;
        debug('connection acquired');
        resolve(connection);
      })
    });

    return new Promise((resolve, reject) => {

      // If we didn't ever hear from the client.connect() callback the connection timeout, node-postgres does not treat this as an error since no active query was ever emitted
      connection.on('end', () => {
        debug('connection timeout');
        if (!responded) {
          reject(new sequelizeErrors.ConnectionTimedOutError(new Error('Connection timed out')));
        }
      });

      // Don't let a Postgres restart (or error) to take down the whole app
      connection.on('error', err => {
        debug(`connection error ${err.code}`);
        connection._invalid = true;
      });
    }).tap(connection => {
      // Disable escape characters in strings, see https://github.com/sequelize/sequelize/issues/3545
      let query = '';

      // if (this.sequelize.options.databaseVersion !== 0 && semver.gte(this.sequelize.options.databaseVersion, '8.2.0')) {
      //   query += 'SET standard_conforming_strings=on;';
      // }

      // if (!this.sequelize.config.keepDefaultTimezone) {
      //   const isZone = !!moment.tz.zone(this.sequelize.options.timezone);
      //   if (isZone) {
      //     query += 'SET client_min_messages TO warning; SET TIME ZONE \'' + this.sequelize.options.timezone + '\';';
      //   } else {
      //     query += 'SET client_min_messages TO warning; SET TIME ZONE INTERVAL \'' + this.sequelize.options.timezone + '\' HOUR TO MINUTE;';
      //   }
      // }

      if (query) {
        return connection.query(query);
      }
    });
    // .tap(connection => {
    //   if (
    //     dataTypes.GEOGRAPHY.types.openedge.oids.length === 0 &&
    //     dataTypes.GEOMETRY.types.openedge.oids.length === 0 &&
    //     dataTypes.HSTORE.types.openedge.oids.length === 0 &&
    //     dataTypes.ENUM.types.openedge.oids.length === 0
    //   ) {
    //     return this._refreshDynamicOIDs(connection);
    //   }
    // });
  }

  disconnect(connection) {
    return new Promise(resolve => {
      connection.closeSync();
      resolve();
    });
  }

  validate(connection) {
    return connection._invalid === undefined;
  }

  _refreshDynamicOIDs(connection) {
    const databaseVersion = this.sequelize.options.databaseVersion;
    const supportedVersion = '8.3.0';

    // Check for supported version
    if ( (databaseVersion && semver.gte(databaseVersion, supportedVersion)) === false) {
      return Promise.resolve();
    }

    // Refresh dynamic OIDs for some types
    // These include, Geometry / HStore / Enum
    return (connection || this.sequelize).query(
      "SELECT typname, typtype, oid, typarray FROM pg_type WHERE (typtype = 'b' AND typname IN ('hstore', 'geometry', 'geography')) OR (typtype = 'e')"
    ).then(results => {
      let result = Array.isArray(results) ? results.pop() : results;

      // When searchPath is prepended then two statements are executed and the result is
      // an array of those two statements. First one is the SET search_path and second is
      // the SELECT query result.
      if (Array.isArray(result)) {
        if (result[0].command === 'SET') {
          result = result.pop();
        }
      }

      // Reset OID mapping for dynamic type
      [
        dataTypes.openedge.GEOMETRY,
        dataTypes.openedge.HSTORE,
        dataTypes.openedge.GEOGRAPHY,
        dataTypes.openedge.ENUM
      ].forEach(type => {
        type.types.openedge.oids = [];
        type.types.openedge.array_oids = [];
      });

      for (const row of result.rows) {
        let type;

        if (row.typname === 'geometry') {
          type = dataTypes.openedge.GEOMETRY;
        } else if (row.typname === 'hstore') {
          type = dataTypes.openedge.HSTORE;
        } else if (row.typname === 'geography') {
          type = dataTypes.openedge.GEOGRAPHY;
        } else if (row.typtype === 'e') {
          type = dataTypes.openedge.ENUM;
        }

        type.types.openedge.oids.push(row.oid);
        type.types.openedge.array_oids.push(row.typarray);
      }

      this.refreshTypeParser(dataTypes.openedge);
    });
  }
}

_.extend(ConnectionManager.prototype, AbstractConnectionManager.prototype);

module.exports = ConnectionManager;
module.exports.ConnectionManager = ConnectionManager;
module.exports.default = ConnectionManager;
