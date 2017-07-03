var config = require("bolt-internal-config");
var errors = require("bolt-internal-errors");
var models = require("bolt-internal-models");
var utils = require("bolt-internal-utils");

var fs = require('fs');
var path = require("path");
var mongodb = require('mongodb');
var superagent = require('superagent');

var __dbOp = function(options, callback){
	var MongoClient = mongodb.MongoClient;
	MongoClient.connect(process.env.MONGODB_URI || process.env.MONGOLAB_URI || process.env.BOLT_DB_URI, function(error, db) {
		if (!utils.Misc.isNullOrUndefined(db)) {
			if (options.operation == "dropdb") {
				models.collection.find({ app: options.db }, function(collError, colls){
					if (!utils.Misc.isNullOrUndefined(colls)) {
						colls.forEach(function (coll) {
							var collectionFullname = options.db + '-' + coll.name;
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
				var collectionFullname = options.db + '-' + options.collection;

				if (options.operation == "drop") {
					var collection = db.collection(collectionFullname);
					collection.drop(function(err, result){
						callback(err, result);
						db.close();
					});
				}
				else if (options.operation == "find") {
					var collection = db.collection(collectionFullname);
					collection.find(options.object, options.map, function(err, docs){
						docs.toArray(callback);
						db.close();
					});
				}
				else if (options.operation == "findone") {
					var collection = db.collection(collectionFullname);
					collection.findOne(options.object, options.map, function(err, doc){
						callback(err, doc);
						db.close();
					});
				}
				else if (options.operation == "insert") {
					var collection = db.collection(collectionFullname);
					collection.insert(options.object, function(err, doc){
						callback(err, doc);
						db.close();
					});
				}
				else if (options.operation == "remove") {
					var collection = db.collection(collectionFullname);
					/*
					collection.find(options.object, function(err, docs){
						//store the array in a temp array before calling 'remove' cuz 'remove' will clear 'docs'
						var tempArray = [];
						function tempCallback(tempErr, tempDocs) {
							tempArray = tempDocs;
						}
						docs.toArray(tempCallback);
						collection.remove(options.object, function(err2, result){
							callback(err2, tempArray);
							//originally the above line was: docs.toArray(callback);
							//but I noticed the array was always empty (the call to 'remove' was clearing the array produced by 'find')
							//so, now I store that array in a temp array (tempArray) before calling remove
							db.close();
						});
					});
					*/

					collection.remove(options.object, function(err, result){
						callback(err, result.result);
						db.close();
					});
				}
				else if (options.operation == "update") {
					var collection = db.collection(collectionFullname);
					collection.update(options.object, options.values, options.options, function(err, doc){
						callback(err, doc);
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
		utils.Events.fire('app-db-dropping', { body: { app: request.db, db: request.db }, subscribers: [request.db] }, request.appToken, function(eventError, eventResponse){});
		setTimeout(function(){
			__dbOp({ db: request.db, operation: "dropdb" }, 
			function(err, result){
				utils.Events.fire('app-db-dropped', { body: { app: request.db, db: request.db } }, request.appToken, function(eventError, eventResponse){});
				response.send(utils.Misc.createResponse(result, err));
			});
		}, 2000);
	},
	deleteCollection: function(request, response){
		__dbOp({ db: request.db, collection: request.params.collection, operation: "drop" }, 
		function(err, docs){
			response.send(utils.Misc.createResponse(docs, err));
		});
	},
	postCollectionFind: function(request, response){
		if(utils.Misc.isNullOrUndefined(request.body.object)) {
			var error = new Error(errors['710']);
			response.end(utils.Misc.createResponse(null, error, 710));
			return;
		}

		__dbOp({ db: request.db, collection: request.params.collection, operation: "find", object: request.body.object, map: request.body.map || {} }, 
		function(err, docs){
			response.send(utils.Misc.createResponse(docs, err));
		});
	},
	postCollectionFindOne: function(request, response){
		if(utils.Misc.isNullOrUndefined(request.body.object)) {
			var error = new Error(errors['710']);
			response.end(utils.Misc.createResponse(null, error, 710));
			return;
		}

		__dbOp({ db: request.db, collection: request.params.collection, operation: "findone", object: request.body.object, map: request.body.map || {} }, 
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
		function(err, docs){
			response.send(utils.Misc.createResponse(docs, err));
		});
	},
	postCollectionRemove: function(request, response){
		if(utils.Misc.isNullOrUndefined(request.body.object)) {
			var error = new Error(errors['710']);
			response.end(utils.Misc.createResponse(null, error, 710));
			return;
		}

		__dbOp({ db: request.db, collection: request.params.collection, operation: "remove", object: request.body.object }, 
		function(err, docs){
			response.send(utils.Misc.createResponse(docs, err));
		});
	},
	postCollectionReplace: function(request, response){
		if(utils.Misc.isNullOrUndefined(request.body.object)) {
			var error = new Error(errors['710']);
			response.end(utils.Misc.createResponse(null, error, 710));
			return;
		}

		__dbOp({ db: request.db, collection: request.params.collection, operation: "update", object: request.body.object, 
			values: request.body.values, options: { upsert: request.body.upsert || false, multi: request.body.multi || false } }, 
		function(err, docs){
			response.send(utils.Misc.createResponse(docs, err));
		});
	},
	postCollectionUpdate: function(request, response){
		if(utils.Misc.isNullOrUndefined(request.body.object)) {
			var error = new Error(errors['710']);
			response.end(utils.Misc.createResponse(null, error, 710));
			return;
		}

		__dbOp({ db: request.db, collection: request.params.collection, operation: "update", object: request.body.object, 
			values: { $set: request.body.values }, options: { upsert: request.body.upsert || false, multi: request.body.multi || false } }, 
		function(err, docs){
			response.send(utils.Misc.createResponse(docs, err));
		});
	}
};
