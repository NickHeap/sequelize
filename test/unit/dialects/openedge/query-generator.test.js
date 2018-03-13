'use strict';

const chai = require('chai'),
  expect = chai.expect,
  Support = require(__dirname + '/../../support'),
  dialect = Support.getTestDialect(),
  _ = require('lodash'),
  Operators = require('../../../../lib/operators'),
  QueryGenerator = require('../../../../lib/dialects/openedge/query-generator');

if (dialect === 'openedge') {
  describe('[OpenEdge Specific] QueryGenerator', () => {
    const suites = {
      arithmeticQuery: [
        {
          title: 'Should use the plus operator',
          arguments: ['+', 'myTable', { foo: 'bar' }, {}, {}],
          expectation: 'UPDATE `myTable` SET `foo`=`foo`+ \'bar\' '
        }
      ],
      attributesToSQL: [
        {
          arguments: [{id: 'INTEGER'}],
          expectation: {id: 'INTEGER'}
        }
      ],

      createTableQuery: [
        {
          arguments: ['myTable', {title: 'VARCHAR(255)', name: 'VARCHAR(255)'}],
          expectation: 'CREATE TABLE IF NOT EXISTS `myTable` (`title` VARCHAR(255), `name` VARCHAR(255)) ENGINE=InnoDB;'
        }
      ],

      dropTableQuery: [
        {
          arguments: ['myTable'],
          expectation: 'DROP TABLE IF EXISTS `myTable`;'
        }
      ],

      selectQuery: [
        {
          arguments: ['myTable'],
          expectation: 'SELECT * FROM `myTable`;',
          context: QueryGenerator
        }
      ],

      insertQuery: [
        {
          arguments: ['myTable', {name: 'foo'}],
          expectation: "INSERT INTO `myTable` (`name`) VALUES ('foo');"
        }
      ],

      bulkInsertQuery: [
        {
          arguments: ['myTable', [{name: 'foo'}, {name: 'bar'}]],
          expectation: "INSERT INTO `myTable` (`name`) VALUES ('foo'),('bar');"
        }
      ],

      updateQuery: [
        {
          arguments: ['myTable', {name: 'foo', birthday: new Date(Date.UTC(2011, 2, 27, 10, 1, 55))}, {id: 2}],
          expectation: "UPDATE `myTable` SET `name`='foo',`birthday`='2011-03-27 10:01:55' WHERE `id` = 2"
        }
      ]
    };

    _.each(suites, (tests, suiteTitle) => {
      describe(suiteTitle, () => {
        tests.forEach(test => {
          const title = test.title || 'OpenEdge correctly returns ' + test.expectation + ' for ' + JSON.stringify(test.arguments);
          it(title, function() {
            // Options would normally be set by the query interface that instantiates the query-generator, but here we specify it explicitly
            const context = test.context || {options: {}};
            if (test.needsSequelize) {
              if (_.isFunction(test.arguments[1])) test.arguments[1] = test.arguments[1](this.sequelize);
              if (_.isFunction(test.arguments[2])) test.arguments[2] = test.arguments[2](this.sequelize);
            }
            QueryGenerator.options = _.assign(context.options, { timezone: '+00:00' });
            QueryGenerator._dialect = this.sequelize.dialect;
            QueryGenerator.sequelize = this.sequelize;
            QueryGenerator.setOperatorsAliases(Operators.LegacyAliases);
            const conditions = QueryGenerator[suiteTitle].apply(QueryGenerator, test.arguments);
            expect(conditions).to.deep.equal(test.expectation);
          });
        });
      });
    });
  });
}
