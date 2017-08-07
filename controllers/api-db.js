var config = require("bolt-internal-config");
var errors = require("bolt-internal-errors");
var models = require("bolt-internal-models");
var utils = require("bolt-internal-utils");

var fs = require('fs');
var path = require("path");
var mongodb = require('mongodb');
var mongoose = require('mongoose');
var superagent = require('superagent');

var __dbOp = function(options, callback){
	var MongoClient = mongodb.MongoClient;
	MongoClient.connect(process.env.MONGODB_URI || process.env.MONGOLAB_URI || process.env.BOLT_DB_URI, function(error, db) {
		if (!utils.Misc.isNullOrUndefined(db)) {
			if (options.operation == "dropdb") {
				models.collection.find({ app: options.db }, function(collError, colls){
					if (!utils.Misc.isNullOrUndefined(colls)) {
						colls.forEach(function (coll) {
							var collectionFullname = options.db + '/' + coll.name;
							var collection = db.collection(collectionFullname);
							collection.drop(function (err, result) {
								//
							});
						});
					}

					callback(null, true);
				});
			}
			else {
				var collectionFullname = options.db + '/' + options.collection;

				if (options.operation == "drop") {
					var collection = db.collection(collectionFullname);
					collection.drop(function(err, result){
						callback(err, result);
						db.close();
					});
				}
				else if (options.operation == "find") {
					var collection = db.collection(collectionFullname);
					if (!utils.Misc.isNullOrUndefined(options.query._id) && options.query._id.constructor == String) {
						options.query._id = new mongoose.mongo.ObjectId(options.query._id);
					}
					collection.find(options.query, options.map, function(err, docs){
						docs.toArray(callback);
						db.close();
					});
				}
				else if (options.operation == "findone") {
					var collection = db.collection(collectionFullname);
					if (!utils.Misc.isNullOrUndefined(options.query._id) && options.query._id.constructor == String) {
						options.query._id = new mongoose.mongo.ObjectId(options.query._id);
					}
					collection.findOne(options.query, options.map, function(err, doc){
						callback(err, doc);
						db.close();
					});
				}
				else if (options.operation == "insert") {
					var collection = db.collection(collectionFullname);
					collection.insert(options.object, function(err, docs){
						var meta = {
							object: options.object
						};
						callback(err, docs, meta);
						db.close();
					});
				}
				else if (options.operation == "remove") {
					var collection = db.collection(collectionFullname);
					/*
					collection.find(options.query, function(err, docs){
						//store the array in a temp array before calling 'remove' cuz 'remove' will clear 'docs'
						var tempArray = [];
						function tempCallback(tempErr, tempDocs) {
							tempArray = tempDocs;
						}
						docs.toArray(tempCallback);
						collection.remove(options.query, function(err2, result){
							callback(err2, tempArray);
							//originally the above line was: docs.toArray(callback);
							//but I noticed the array was always empty (the call to 'remove' was clearing the array produced by 'find')
							//so, now I store that array in a temp array (tempArray) before calling remove
							db.close();
						});
					});
					*/

					if (!utils.Misc.isNullOrUndefined(options.query._id) && options.query._id.constructor == String) {
						options.query._id = new mongoose.mongo.ObjectId(options.query._id);
					}
					collection.remove(options.query, function(err, result){
						var meta = {
							query: options.query
						};
						callback(err, result, meta);
						db.close();
					});
				}
				else if (options.operation == "update") {
					var collection = db.collection(collectionFullname);
					if (!utils.Misc.isNullOrUndefined(options.query._id) && options.query._id.constructor == String) {
						options.query._id = new mongoose.mongo.ObjectId(options.query._id);
					}
					collection.update(options.query, options.values, options.options, function(err, doc){
						var meta = {
							query: options.query,
							values: options.values,
							options: options.options
						};
						callback(err, doc, meta);
						db.close();
					});
				}
			}
		}
		else {
			callback(error);
		}
	});
}

module.exports = {
	delete: function(request, response){
		__dbOp({ db: request.db, operation: "dropdb" }, 
		function(err, result){
			if(!utils.Misc.isNullOrUndefined(err)) {
				utils.Events.fire('app-db-drop-failed', { body: { app: request.db, error: err }, subscribers: [request.db] }, 
					request.bolt.token, function(eventError, eventResponse) {});
			}
			else if(!utils.Misc.isNullOrUndefined(result)) {
				utils.Events.fire('app-db-dropped', { body: { app: request.db, result: result }, subscribers: [request.db] }, 
					request.bolt.token, function(eventError, eventResponse) {});
			}
			response.send(utils.Misc.createResponse(result, err));
		});
	},
	deleteCollection: function(request, response){
		__dbOp({ db: request.db, collection: request.params.collection, operation: "drop" }, 
		function(err, result){
			if(!utils.Misc.isNullOrUndefined(err)) {
				utils.Events.fire('app-collection-drop-failed', { body: { app: request.db, collection: request.params.collection, error: err }, subscribers: [request.db] }, 
					request.bolt.token, function(eventError, eventResponse) {});
			}
			else if(!utils.Misc.isNullOrUndefined(result)) {
				utils.Events.fire('app-collection-dropped', { body: { app: request.db, collection: request.params.collection, result: result }, subscribers: [request.db] }, 
					request.bolt.token, function(eventError, eventResponse) {});
			}
			response.send(utils.Misc.createResponse(result, err));
		});
	},
	postCollectionFind: function(request, response){
		/*if(utils.Misc.isNullOrUndefined(request.body.query) && utils.Misc.isNullOrUndefined(request.body.object) && utils.Misc.isEmptyObject(request.query)) {
			var error = new Error(errors['710']);
			response.end(utils.Misc.createResponse(null, error, 710));
			return;
		}*/

		__dbOp({ db: request.db, collection: request.params.collection, operation: "find", query: request.body.query || request.body.object || request.query, 
			map: request.body.map || request.body.projection || {} }, 
		function(err, docs){
			response.send(utils.Misc.createResponse(docs, err));
		});
	},
	postCollectionFindOne: function(request, response){
		if(utils.Misc.isNullOrUndefined(request.body.query) && utils.Misc.isNullOrUndefined(request.body.object) && utils.Misc.isEmptyObject(request.query)) {
			var error = new Error(errors['710']);
			response.end(utils.Misc.createResponse(null, error, 710));
			return;
		}

		__dbOp({ db: request.db, collection: request.params.collection, operation: "findone", query: request.body.query || request.body.object || request.query, 
			map: request.body.map || request.body.projection || {} }, 
		function(err, doc){
			response.send(utils.Misc.createResponse(doc, err));
		});
	},
	postCollectionInsert: function(request, response){
		if(utils.Misc.isNullOrUndefined(request.body.object)) {
			var error = new Error(errors['710']);
			response.end(utils.Misc.createResponse(null, error, 710));
			return;
		}

		__dbOp({ db: request.db, collection: request.params.collection, operation: "insert", object: request.body.object }, 
		function(err, docs, meta){
			if(!utils.Misc.isNullOrUndefined(err)) {
				utils.Events.fire('app-collection-insert-failed', { body: { app: request.db, collection: request.params.collection, error: err, meta: meta }, subscribers: [request.db] }, 
					request.bolt.token, function(eventError, eventResponse) {});
			}
			else if(!utils.Misc.isNullOrUndefined(docs)) {
				utils.Events.fire('app-collection-inserted', { body: { app: request.db, collection: request.params.collection, result: docs, meta: meta }, subscribers: [request.db] }, 
					request.bolt.token, function(eventError, eventResponse) {});
			}
			response.send(utils.Misc.createResponse(docs, err));
		});
	},
	postCollectionRemove: function(request, response){
		if(utils.Misc.isNullOrUndefined(request.body.query) && utils.Misc.isNullOrUndefined(request.body.object) && utils.Misc.isEmptyObject(request.query)) {
			var error = new Error(errors['710']);
			response.end(utils.Misc.createResponse(null, error, 710));
			return;
		}

		__dbOp({ db: request.db, collection: request.params.collection, operation: "remove", query: request.body.query || request.body.object || request.query }, 
		function(err, docs, meta){
			if(!utils.Misc.isNullOrUndefined(err)) {
				utils.Events.fire('app-collection-remove-failed', { body: { app: request.db, collection: request.params.collection, error: err, meta: meta }, subscribers: [request.db] }, 
					request.bolt.token, function(eventError, eventResponse) {});
			}
			else if(!utils.Misc.isNullOrUndefined(docs)) {
				utils.Events.fire('app-collection-removed', { body: { app: request.db, collection: request.params.collection, result: docs, meta: meta }, subscribers: [request.db] }, 
					request.bolt.token, function(eventError, eventResponse) {});
			}
			response.send(utils.Misc.createResponse(docs, err));
		});
	},
	postCollectionReplace: function(request, response){
		if(utils.Misc.isNullOrUndefined(request.body.query) && utils.Misc.isNullOrUndefined(request.body.object) && utils.Misc.isEmptyObject(request.query)) {
			var error = new Error(errors['710']);
			response.end(utils.Misc.createResponse(null, error, 710));
			return;
		}

		__dbOp({ db: request.db, collection: request.params.collection, operation: "update", query: request.body.query || request.body.object || request.query, 
			values: request.body.values, options: { upsert: request.body.upsert || false, multi: request.body.multi || false } }, 
		function(err, docs, meta){
			if(!utils.Misc.isNullOrUndefined(err)) {
				utils.Events.fire('app-collection-replace-failed', { body: { app: request.db, collection: request.params.collection, error: err, meta: meta }, subscribers: [request.db] }, 
					request.bolt.token, function(eventError, eventResponse) {});
			}
			else if(!utils.Misc.isNullOrUndefined(docs)) {
				utils.Events.fire('app-collection-replaced', { body: { app: request.db, collection: request.params.collection, result: docs, meta: meta }, subscribers: [request.db] }, 
					request.bolt.token, function(eventError, eventResponse) {});
			}
			response.send(utils.Misc.createResponse(docs, err));
		});
	},
	postCollectionUpdate: function(request, response){
		if(utils.Misc.isNullOrUndefined(request.body.query) && utils.Misc.isNullOrUndefined(request.body.object) && utils.Misc.isEmptyObject(request.query)) {
			var error = new Error(errors['710']);
			response.end(utils.Misc.createResponse(null, error, 710));
			return;
		}

		__dbOp({ db: request.db, collection: request.params.collection, operation: "update", query: request.body.query || request.body.object || request.query, 
			values: { $set: request.body.values }, options: { upsert: request.body.upsert || false, multi: request.body.multi || false } }, 
		function(err, docs, meta){
			if(!utils.Misc.isNullOrUndefined(err)) {
				utils.Events.fire('app-collection-update-failed', { body: { app: request.db, collection: request.params.collection, error: err, meta: meta }, subscribers: [request.db] }, 
					request.bolt.token, function(eventError, eventResponse) {});
			}
			else if(!utils.Misc.isNullOrUndefined(docs)) {
				utils.Events.fire('app-collection-updated', { body: { app: request.db, collection: request.params.collection, result: docs, meta: meta }, subscribers: [request.db] }, 
					request.bolt.token, function(eventError, eventResponse) {});
			}
			response.send(utils.Misc.createResponse(docs, err));
		});
	}
};
