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
    returning: false
  },
  bulkDefault: false,
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
  ARRAY: false,
  RANGE: false,
  GEOMETRY: false,
  REGEXP: false,
  GEOGRAPHY: false,
  JSON: false,
  JSONB: false,
  HSTORE: false,
  deferrableConstraints: true,
  searchPath: false
});

ConnectionManager.prototype.defaultVersion = '11.7.2';
OpenEdgeDialect.prototype.Query = Query;
OpenEdgeDialect.prototype.DataTypes = DataTypes;
OpenEdgeDialect.prototype.name = 'openedge';
OpenEdgeDialect.prototype.TICK_CHAR = '"';
OpenEdgeDialect.prototype.TICK_CHAR_LEFT = OpenEdgeDialect.prototype.TICK_CHAR;
OpenEdgeDialect.prototype.TICK_CHAR_RIGHT = OpenEdgeDialect.prototype.TICK_CHAR;

module.exports = OpenEdgeDialect;
module.exports.default = OpenEdgeDialect;
module.exports.OpenEdgeDialect = OpenEdgeDialect;
