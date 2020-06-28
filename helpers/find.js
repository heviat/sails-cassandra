/*
    A module for finding a record in a Cassandra keyspace
    @author: Sebastian Wilke
*/
module.exports = require('machine')({

    friendlyName: 'Find Records',
    description: 'Finds records in a Cassandra table.',
    sync: false,

    inputs: {
        models: {
            description: 'An object containing all of the Waterline models for this datastore.',
            required: true,
            type: 'ref'
        },
        datastore: {
            description: 'The registered datastore.',
            required: true,
            type: 'ref'
        },
        query: {
            description: 'A valid Waterline query.',
            required: true,
            type: 'ref'
        }
    },
    exits: {
        success: {
            description: 'Executed the query successfully.'
        },
        error: {
            description: 'An error occured.'
        }
    },

    fn: async function find(inputs, exits) {
        var _ = require('@sailshq/lodash');
        var utils = require('waterline-utils');
        var Helpers = require('./private');
        const util = require('./util');

        var model = inputs.models[inputs.query.using];
        if(!model)
            return exits.error('Invalid datastore.');

        //Convert Waterline query into Waterline statement - makes it easy to generate a CQL query statement

        var statement;
        try {
            statement = utils.query.converter({
                model: inputs.query.using,
                method: 'find',
                criteria: inputs.query.criteria
            });
        } catch (e) {
            return exits.error('ERROR: ' + e);
        }
        
        //Parse where clause
        var where = Helpers.parseCriteria(statement.where);
        //Parse select clause
        var select = '';

        if(_.isArray(statement.select) && statement.select.length > 0) {
            statement.select.forEach(element => {
                select = select.concat(element + ',');
            });
            select = select.substring(0, select.length - 1);
        } else {
            select = '*';
        }
        //parse limit
        var limit = (statement.limit && statement.limit !== 9007199254740991 ? statement.limit : '');

        //search for sort clause - but not the best solution for cassandra (!)
        var sort = statement.sort ? ' ORDER BY ' + statement.sort : '';

        if(_.isArray(statement.sort)) {
            var tmp = [];
            statement.sort.forEach(element => {
                _.forOwn(element, (value, key) => {
                    tmp.push(key + ' ' + value);
                })
            });
            sort = ' ORDER BY ' + tmp.join(' AND ');
        }

        //construct the query
        var query = 'SELECT ' + select + ' FROM ' + model.tableName + ' WHERE ' + ( where.query === '' ? '' : where.query) + (limit ? ' LIMIT ' : '') + limit + sort + ' ALLOW FILTERING;';

        var results = [];
        //send the query using the cassandra NodeJS driver by datastax with streams
        inputs.datastore.client.eachRow(query, where.values, { prepare : true }, function(n, row) {
            var result = {};
            //iterate through every row
            _.forOwn(row, (value, key) => {
                //get the original attribute name from the Waterline model
                var attributeName = Object.keys(model.definition).filter(attribute => model.definition[attribute].columnName !== undefined && model.definition[attribute].columnName === key)[0];
                result[attributeName] = util.castFromCassandraToWaterline(value);       
            });
            results.push(result);
        }, function(err, count) {
            if(err) {
                return exits.error(err);
            }
            //successful. exit.
            return exits.success(results);
        });
    }
})