/*
    A module for updating a record in a Cassandra keyspace
    @author: Sebastian Wilke
*/
module.exports = require('machine').build({

    friendlyName: 'Update Record',
    description: 'Updates a record in a Cassandra keyspace.',
    sync: true,

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
            description: 'The record was updated successfully.'
        },
        error: {
            description: 'An error occured.'
        }
    },

    fn: function update(inputs, exits) {
        var _ = require('@sailshq/lodash');
        var utils = require('waterline-utils');
        var TimeUuid = require('cassandra-driver').types.TimeUuid;
        var Helpers = require('./private');

        var model = inputs.models[inputs.query.using];
        if(!model)
            return exits.error(new Error('Invalid datastore.'));

        utils.eachRecordDeep([ inputs.query.valuesToSet ], function iterator(record, WLModel, depth) {
            if (depth !== 1) {
              return exits.error(new Error('Consistency violation: Incoming new records in a s3q should never necessitate deep iteration!  If you are seeing this error, it is probably because of a bug in this adapter, or in Waterline core.'));
            }
        
            _.each(WLModel.definition, function checkAttributes(attrDef) {
              var columnName = attrDef.columnName;
        
              // JSON stringify the values provided for any `type: 'json'` attributes
              // because Cassandra can't store JSON.
              if (attrDef.type === 'json' && _.has(record, columnName)) {
        
                // Special case: If this is the `null` literal, leave it alone.
                // But otherwise, stringify it into a JSON string.
                // (even if it's already a string!)
                if (!_.isNull(record[columnName])) {
                  record[columnName] = JSON.stringify(record[columnName]);
                }
        
              }
        
            });
        }, true, inputs.query.using, { collections: inputs.models });

        //Convert Waterline query into Waterline statement - makes it easy to generate a CQL query statement

        var statement;
        try {
            statement = utils.query.converter({
                model: inputs.query.using,
                method: 'update',
                criteria: inputs.query.criteria,
                values: inputs.query.valuesToSet
            });
        } catch (e) {
            return exits.error(e);
        }

        //Check if adapter should return inserted values
        var fetchRecords = false;
        if (_.has(inputs.query.meta, 'fetch') && inputs.query.meta.fetch) {
            fetchRecords = true;
        }

        if(!_.isObject(statement.update)) {
            return exits.error(new Error('Invalid values.'));
        }

        var where = Helpers.parseCriteria(statement.where);

        var queryString = 'UPDATE ' + model.tableName + ' SET ';
        var queryValues = [];
        var queryParameterValues = '';

        _.forOwn(statement.update, function(value, key) {
           queryValues.push(value);
           queryParameterValues += key + ' = ?,';
        });

        queryString += (queryParameterValues.substr(0, queryParameterValues.length - 1) + ( where.query === '' ? '' : ' WHERE ' + where.query));

        inputs.datastore.client.execute(queryString, queryValues.concat(where.values), { prepare: true })
            .then(result => {
                return exits.success();
            });

    }
});