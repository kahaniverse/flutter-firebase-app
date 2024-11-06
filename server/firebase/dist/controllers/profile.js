"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addProfilePaths = void 0;
const utils_1 = require("./utils");
const { upperCase } = require("lodash");
const type = "USER";
const partitionKeyName = "PK";
const sortKeyName = "SK";
const METADATA = 'USER';
function addNestedPath(app, nestedPath, nestedType) {
    /********************************
     * HTTP Get method for listing further nested objects
     ********************************/
    app.get('/profile/' + nestedPath, async function (req, res) {
        const owner = req.apiGateway && req.apiGateway.event.requestContext.identity.cognitoIdentityId;
        if (!owner) {
            res.statusCode = 401;
            res.json({ error: 'Unknown user', url: req.url, body: req.body });
            return;
        }
        const result = await getProfile(req, owner);
        var condition = 'PK = :pk AND begins_with (SK, :sk)'; //TODO: also add reactions to this profile
        let values = {
            ":pk": (0, utils_1.convertUrlToKey)(type, result.owner),
            ":sk": upperCase(nestedType)
        };
        try {
            res.json(await (0, utils_1.queryMany)(condition, values, req.query, null, 'byOwner'));
        }
        catch (err) {
            res.statusCode = 500;
            res.json({ error: 'Could not load items: ' + err });
        }
    });
}
function addProfilePaths(app) {
    addNestedPath(app, 'universes', 'UNIV');
    addNestedPath(app, 'stories', 'STORY');
    addNestedPath(app, 'characters', 'CHARACTER');
    addNestedPath(app, 'comments', 'COMMENT');
    addNestedPath(app, 'reactions', 'REACTION'); //on this user. for by use /reactions/
    /********************************
     * HTTP Get method for user's profile *
     ********************************/
    app.get('/profile', async function (req, res) {
        try {
            const owner = req.apiGateway && req.apiGateway.event.requestContext.identity.cognitoIdentityId;
            if (!owner) {
                res.statusCode = 401;
                res.json({ error: 'Unknown user', url: req.url, body: req.body });
                return;
            }
            const result = await getProfile(req, owner);
            res.json(result); //assume only one
        }
        catch (err) {
            res.statusCode = 500;
            res.json({ error: 'Could not load items: ' + err });
        }
    });
    /************************************
    * HTTP post method for insert object *
    *************************************/
    app.post('/profile', function (req, res) {
        const owner = req.apiGateway && req.apiGateway.event.requestContext.identity.cognitoIdentityId;
        if (!owner) {
            res.statusCode = 401;
            res.json({ error: 'Unknown user', url: req.url, body: req.body });
            return;
        }
        req.body = Object.assign({ [partitionKeyName]: (0, utils_1.convertUrlToKey)(type, owner), [sortKeyName]: (0, utils_1.convertUrlToKey)(METADATA, req.body[utils_1.ownerKeyName] || owner), //TODO: add suffix #1, #2, for additional profile type rows. For example illustrator who is already an author
            type, createdAt: new Date().getTime() }, req.body);
        (0, utils_1.putItem)(req, res);
    });
    /************************************
    * HTTP put method for update object. Assumes body contains the right PK and SK to overwrite *
    *************************************/
    app.put('/profile', function (req, res) {
        const owner = req.apiGateway && req.apiGateway.event.requestContext.identity.cognitoIdentityId;
        if (!owner) {
            res.statusCode = 401;
            res.json({ error: 'Unknown user', url: req.url, body: req.body });
            return;
        }
        req.body.updatedAt = new Date().getTime();
        (0, utils_1.putItem)(req, res);
    });
    /**************************************
    * HTTP remove method to mark independent object inactive *
    ***************************************/
    app.delete('/profile', function (req, res) {
        const owner = req.apiGateway && req.apiGateway.event.requestContext.identity.cognitoIdentityId;
        var params = {};
        if (owner) {
            params[partitionKeyName] = (0, utils_1.convertUrlToKey)(type);
            params[sortKeyName] = (0, utils_1.convertUrlToKey)(METADATA, owner);
            (0, utils_1.markInactive)(params, res, req);
        }
        else {
            res.statusCode = 401;
            res.json({ error: 'Unauthenticated', url: req.url, body: req.body });
            return;
        }
    });
}
exports.addProfilePaths = addProfilePaths;
async function getProfile(req, owner) {
    var condition = 'PK = :pk AND begins_with (SK, :sk)'; //TODO: omit the suffix #1, #2 etc. then combine the results
    var id = (0, utils_1.convertUrlToKey)(type, owner);
    let values = {
        ":pk": id,
        ":sk": (0, utils_1.convertUrlToKey)(METADATA)
    };
    const result = await (0, utils_1.queryMany)(condition, values, req.query, null, null, (array) => array[0]); //TODO: add the extra profile rows instead of just showing the first one
    return result;
}
//# sourceMappingURL=profile.js.map