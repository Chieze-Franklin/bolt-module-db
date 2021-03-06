var checksCtrlr = require("bolt-internal-checks");

var express = require('express');

var apiDbCtrlr = require('../controllers/api-db');

var router = express.Router();

//drops db
router.delete('/', checksCtrlr.getDbName, apiDbCtrlr.delete);

//drops collection
router.delete('/:collection', checksCtrlr.forDbOwner, checksCtrlr.getDbName, apiDbCtrlr.deleteCollection);

//finds all
router.post('/:collection/find', checksCtrlr.forDbAccess, checksCtrlr.getDbName, apiDbCtrlr.postCollectionFind);

//finds one
router.post('/:collection/findone', checksCtrlr.forDbAccess, checksCtrlr.getDbName, apiDbCtrlr.postCollectionFindOne);

//inserts
router.post('/:collection/insert', checksCtrlr.forDbOwner, checksCtrlr.getDbName, apiDbCtrlr.postCollectionInsert);

//removes
router.post('/:collection/remove', checksCtrlr.forDbOwner, checksCtrlr.getDbName, apiDbCtrlr.postCollectionRemove);

//replaces
router.post('/:collection/replace', checksCtrlr.forDbOwner, checksCtrlr.getDbName, apiDbCtrlr.postCollectionReplace);

//updates
router.post('/:collection/update', checksCtrlr.forDbOwner, checksCtrlr.getDbName, apiDbCtrlr.postCollectionUpdate);

module.exports = router;