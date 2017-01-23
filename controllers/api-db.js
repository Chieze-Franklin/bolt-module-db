var config = require("bolt-internal-config");
var errors = require("bolt-internal-errors");
var utils = require("bolt-internal-utils");

var fs = require('fs');
var path = require("path");
var mongodb = require('mongodb');
var superagent = require('superagent');

var __dbOp = function(options, callback){
	var MongoClient = mongodb.MongoClient;
	MongoClient.connect('mongodb://localhost:' + config.getDbPort() + '/' + options.db, function(error, db) {
		
		if (options.operation == "dropdb") {
			//db.drop();
			db.dropDatabase(function(err, result){
				callback(err, result);
				db.close();
			});
		}
		else if (options.operation == "drop") {
			var collection = db.collection(options.collection);
			collection.find({}, function(err, docs){
				collection.drop(function(err2){
					docs.toArray(callback);
					db.close();
				});
			});
		}
		else if (options.operation == "find") {
			var collection = db.collection(options.collection);
			collection.find(options.object, options.map, function(err, docs){
				docs.toArray(callback);
				db.close();
			});
		}
		else if (options.operation == "findone") {
			var collection = db.collection(options.collection);
			collection.findOne(options.object, options.map, function(err, doc){
				callback(err, doc);
				db.close();
			});
		}
		else if (options.operation == "insert") {
			var collection = db.collection(options.collection);
			collection.insert(options.object, function(err, doc){
				callback(err, doc);
				db.close();
			});
		}
		else if (options.operation == "remove") {
			var collection = db.collection(options.collection);
			collection.find(options.object, function(err, docs){
				collection.remove(options.object, function(err2){
					docs.toArray(callback);
					db.close();
				});
			});
		}
		else if (options.operation == "update") {
			var collection = db.collection(options.collection);
			collection.update(options.object, options.values, options.options, function(err, doc){
				callback(err, doc);
				db.close();
			});
		}
	});
}

module.exports = {
	postDrop: function(request, response){
		__dbOp({ db: request.db, operation: "dropdb" }, 
		function(err, result){
			response.send(utils.Misc.createResponse(result, err));
		});
	},
	postCollectionDrop: function(request, response){
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
