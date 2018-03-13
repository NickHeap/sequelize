'use strict';

const _ = require('lodash');
const AbstractDialect = require('../abstract');
const ConnectionManager = require('./connection-manager');
const Query = require('./query');
const QueryGenerator = require('./query-generator');
const DataTypes = require('../../data-types').openedge;

class OpenEdgeDialect extends AbstractDialect {
  constructor(sequelize) {
    super();
    this.sequelize = sequelize;
    this.connectionManager = new ConnectionManager(this, sequelize);
    this.QueryGenerator = _.extend({}, QueryGenerator, {
      options: sequelize.options,
      _dialect: this,
      sequelize
    });
  }
}

OpenEdgeDialect.prototype.supports = _.merge(_.cloneDeep(AbstractDialect.prototype.supports), {
  'DEFAULT VALUES': true,
  'EXCEPTION': true,
  'ON DUPLICATE KEY': false,
  'ORDER NULLS': true,
  returnValues: {
    returning: true
  },
  bulkDefault: true,
  schemas: true,
  lock: true,
  lockOf: true,
  lockKey: true,
  lockOuterJoinFailure: true,
  forShare: 'FOR SHARE',
  index: {
    concurrently: true,
    using: 2,
    where: true
  },
  NUMERIC: true,
  ARRAY: true,
  RANGE: true,
  GEOMETRY: true,
  REGEXP: true,
  GEOGRAPHY: true,
  JSON: true,
  JSONB: true,
  HSTORE: true,
  deferrableConstraints: true,
  searchPath: true
});

ConnectionManager.prototype.defaultVersion = '9.4.0';
OpenEdgeDialect.prototype.Query = Query;
OpenEdgeDialect.prototype.DataTypes = DataTypes;
OpenEdgeDialect.prototype.name = 'openedge';
OpenEdgeDialect.prototype.TICK_CHAR = '"';
OpenEdgeDialect.prototype.TICK_CHAR_LEFT = OpenEdgeDialect.prototype.TICK_CHAR;
OpenEdgeDialect.prototype.TICK_CHAR_RIGHT = OpenEdgeDialect.prototype.TICK_CHAR;

module.exports = OpenEdgeDialect;
module.exports.default = OpenEdgeDialect;
module.exports.OpenEdgeDialect = OpenEdgeDialect;
