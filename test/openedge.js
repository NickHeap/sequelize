'use strict';

const fs = require('fs'),
  path = require('path'),
  _ = require('lodash'),
  Sequelize = require(__dirname + '/../index'),
  DataTypes = require(__dirname + '/../lib/data-types'),
  Config = require(__dirname + '/config/config'),
  supportShim = require(__dirname + '/supportShim'),
  support = require(__dirname + '/support'),  
  chai = require('chai'),
  expect = chai.expect

chai.use(require('chai-spies'));
chai.use(require('chai-datetime'));
chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
chai.config.includeStack = true;
chai.should();

describe(support.getTestDialectTeaser('SQL'), () => {
  describe('Connection...', () => {
    it('should connect to the database with valid credentials', (done) => {
      var sequelize = new Sequelize('openedge', 'SYSPROGRESS', 'SYSPROGRESS', {
        host: 'localhost',
        port: '20666',
        dialect: 'openedge',
        dialectOptions: {
          //dsn: 'OpenEdgeODBC',
          driver: 'Progress Openedge 11.7 Driver'
        },
        logging: console.log
      });
      sequelize
        .authenticate()
        .then(() => {
          //console.log('Connection has been established successfully.');
          done();
        })
        .catch(err => {
          //console.error('Unable to connect to the database:', err);
          done(err);
        });
    });
    it('should fail to connect to the database with invalid credentials', (done) => {
      var sequelize = new Sequelize('openedge', 'NOTHING', 'NOTHING', {
        host: 'localhost',
        port: '20666',
        dialect: 'openedge',
        dialectOptions: {
          //dsn: 'OpenEdgeODBC',
          driver: 'Progress Openedge 11.7 Driver'
        },
        logging: console.log
      });
      sequelize
        .authenticate()
        .then(() => {
          //console.log('Connection has been established successfully.');
          done('Should not connect!');
        })
        .catch(err => {
          //console.error('Unable to connect to the database:', err);
          done();
        });
    });
    it('should get customers with a direct query', async () => {
      var sequelize = await createAndLogin();

      return sequelize.query('SELECT * FROM PUB.customer', { type: sequelize.QueryTypes.SELECT})
      .then(customers => {
        expect(customers).to.not.be.null;
        expect(customers).length.greaterThan(0);
      });
    });
    it('should fail the query if the table does not exist', async () => {
      var sequelize = await createAndLogin();

      return expect(sequelize.query('SELECT * FROM PUB.cthulhu', { type: sequelize.QueryTypes.SELECT}))
      .to.be.rejected;
    });
    it('should get customer 1 with a direct query and where', async () => {
      var sequelize = await createAndLogin();

      return sequelize.query('SELECT * FROM PUB.customer where customer.custnum = 1', { type: sequelize.QueryTypes.SELECT})
      .then(customers => {
        expect(customers).to.not.be.null;
        expect(customers).length.to.be(1);
      });
    });
    it('should not get customer 89273823 with a direct query and where', async () => {
      var sequelize = await createAndLogin();

      return sequelize.query('SELECT * FROM PUB.customer where customer.custnum = 89273823', { type: sequelize.QueryTypes.SELECT})
      .then(customers => {
        expect(customers).to.not.be.null;
        expect(customers).length.to.be(0);
      });
    });
    it.only('should not get list of tables', async () => {
      var sequelize = await createAndLogin();

      return sequelize.query('SELECT * FROM PUB."_file" WHERE PUB."_file"."_file-num" > 0 AND PUB."_file"."_file-num" < 32000', { type: sequelize.QueryTypes.SELECT})
      .then(tables => {
        expect(tables).to.not.be.null;
        expect(tables).length.to.be(0);
      });
    });
    it('should not get customer 89273823 with a direct query and where', async () => {
      var sequelize = await createAndLogin();

      const Bin = await sequelize.define('Bin', {
        WarehouseNum: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
        Itemnum: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
        Qty: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
        BinNum: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0, primaryKey: true },
        BinName: { type: Sequelize.STRING, allowNull: true, defaultValue: 0 }
      }, {
        timestamps: false,
        freezeTableName: true,
        version: false
      });
  
      return sequelize.sync();
    });


    async function createAndLogin() {
      var sequelize = new Sequelize('openedge', 'SYSPROGRESS', 'SYSPROGRESS', {
        host: 'localhost',
        port: '20666',
        dialect: 'openedge',
        dialectOptions: {
          //dsn: 'OpenEdgeODBC',
          driver: 'Progress Openedge 11.7 Driver'
        },
        logging: console.log
      });
      return sequelize
        .authenticate()
        .then(() => {
          return sequelize;
        });
    }
  });
})