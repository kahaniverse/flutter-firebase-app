"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPagePaths = void 0;
const { convertUrlToKey, queryMany, queryOne, markInactive, putItem, createItem, uuid, ownerKeyName } = require("./utils");
const { upperCase } = require("lodash");
const type = "PAGE";
const parent1 = "STORY";
const parent2 = "PAGE";
const idKeyName = "id";
const partitionKeyName = "PK";
const sortKeyName = "SK";
const METADATA = 'PAGE';
function addNestedPath(app, nestedPath, nestedType) {
    /********************************
     * HTTP Get method for listing further nested objects
     ********************************/
    app.get('/pages/:id/' + nestedPath, async function (req, res) {
        var condition = 'PK = :pk AND begins_with (SK, :sk)';
        let values = {
            ":pk": convertUrlToKey(type, req.params[idKeyName]),
            ":sk": upperCase(nestedType)
        };
        try {
            res.json(await queryMany(condition, values, req.query));
        }
        catch (err) {
            res.statusCode = 500;
            res.json({ error: 'Could not load items: ' + err });
        }
    });
}
function addPagePaths(app) {
    addNestedPath(app, 'pages', 'PAGE'); //next page
    addNestedPath(app, 'comments', 'COMMENT');
    addNestedPath(app, 'reactions', 'REACTION');
    /********************************
     * HTTP Get method for list independent objects *
     ********************************/
    app.get('/pages', async function (req, res) {
        try {
            var condition = '#typ = :type AND begins_with(SK, :sorter)';
            let values = {
                ":type": type,
                ":sorter": convertUrlToKey(METADATA)
            };
            let names = {
                "#typ": "type"
            };
            const result = await queryMany(condition, values, req.query, names, 'byType'); //assume only one
            res.json(result);
        }
        catch (err) {
            res.statusCode = 500;
            res.json({ error: 'Could not load items: ' + err });
        }
    });
    /*****************************************
     * HTTP Get method for getting by id. We use PK to get few nested objects also
     *****************************************/
    app.get('/pages/:' + idKeyName, async function (req, res) {
        try {
            if (req.query && req.query.getNext == true) { //TODO needs row with metadata to be with id also
                var condition = 'PK = :pk';
                let values = {
                    ":pk": convertUrlToKey(type, req.params[idKeyName])
                };
                const result = await queryMany(condition, values, req.query);
                res.json(result);
            }
            else {
                var condition = '#typ = :type AND SK = :sorter';
                let values = {
                    ":type": type,
                    ":sorter": convertUrlToKey(METADATA, req.params[idKeyName])
                };
                let names = {
                    "#typ": "type"
                };
                const result = await queryMany(condition, values, req.query, names, 'byType'); //assume only one
                res.json(result);
            }
        }
        catch (err) {
            res.statusCode = 500;
            res.json({ error: 'Could not load items: ' + err });
        }
    });
    /************************************
    * HTTP post method for insert object *
    *************************************/
    app.post('/pages', async function (req, res) {
        if (!req.apiGateway.event.requestContext.identity.cognitoIdentityId) {
            res.statusCode = 401;
            res.json({ error: 'Unknown user', url: req.url, body: req.body });
            return;
        }
        const slug = req.body.parentId;
        const created = (new Date()).getTime();
        const id = uuid(null, created);
        req.body = Object.assign({ [partitionKeyName]: convertUrlToKey(req.body.pageNum == 1 ? parent1 : parent2, slug), [sortKeyName]: convertUrlToKey(METADATA, uuid(null, created, true, id)), id,
            type, createdAt: created }, req.body);
        //TODO add another row for meta data with id as PK if required
        createItem(req, res); //TODO: change user state to author if not set
    });
    /************************************
    * HTTP put method for update object. Assumes body contains the right PK and SK to overwrite *
    *************************************/
    app.put('/pages', function (req, res) {
        if (!req.apiGateway.event.requestContext.identity.cognitoIdentityId) {
            res.statusCode = 401;
            res.json({ error: 'Unknown user', url: req.url, body: req.body });
            return;
        }
        req.body.updatedAt = new Date().getTime();
        putItem(req, res);
    });
    /**************************************
    * HTTP remove method to mark independent object inactive *
    ***************************************/
    app.delete('/pages/:SK', function (req, res) {
        if (!req.apiGateway.event.requestContext.identity.cognitoIdentityId) {
            res.statusCode = 401;
            res.json({ error: 'Unknown user', url: req.url, body: req.body });
            return;
        }
        var params = {};
        params[partitionKeyName] = convertUrlToKey(req.body.pageNum == 1 ? parent1 : parent2, req.body[partitionKeyName]);
        params[sortKeyName] = convertUrlToKey(METADATA, req.params[sortKeyName]);
        markInactive(params, res, req);
    });
}
exports.addPagePaths = addPagePaths;
//# sourceMappingURL=pages.js.map