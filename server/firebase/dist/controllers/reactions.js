"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addReactionPaths = exports.REACTION_TAG = void 0;
const { convertUrlToKey, queryMany, putItemIncrement, deleteItemDecrement } = require("./utils");
const partitionKeyName = "PK";
const sortKeyName = "SK";
exports.REACTION_TAG = 'ZZ#REACTION';
const idKeyName = 'reactionType';
function addNestedPath(app, nestedPath, nestedType) {
    /*****************************************
     * HTTP Get method for getting by id. We use PK to specify object type
     *****************************************/
    app.get('/reactions/' + nestedPath + "/:" + idKeyName, async function (req, res) {
        const owner = req.apiGateway.event.requestContext.identity.cognitoIdentityId;
        const reactionType = req.params[idKeyName];
        try {
            var condition = 'SK = :owner AND begins_with(inverted, :sorter)';
            let values = {
                ":owner": convertUrlToKey(exports.REACTION_TAG, reactionType, owner),
                ":sorter": convertUrlToKey(nestedType)
            };
            const result = await queryMany(condition, values, req.query, null, 'bySK');
            res.json(result);
        }
        catch (err) {
            res.statusCode = 500;
            res.json({ error: 'Could not load items: ' + err });
        }
    });
}
function addReactionPaths(app) {
    addNestedPath(app, 'universes', 'UNIV');
    addNestedPath(app, 'stories', 'STORY');
    addNestedPath(app, 'characters', 'CHARACTER');
    addNestedPath(app, 'comments', 'COMMENT');
    addNestedPath(app, 'profiles', 'USER');
    /********************************
     * HTTP Get method for list independent objects *
     ********************************/
    app.get('/reactions/:' + idKeyName, async function (req, res) {
        const owner = req.apiGateway.event.requestContext.identity.cognitoIdentityId;
        const reactionType = req.params[idKeyName];
        try {
            var condition = 'SK = :owner';
            let values = {
                ":owner": convertUrlToKey(exports.REACTION_TAG, reactionType, owner)
            };
            const result = await queryMany(condition, values, req.query, null, 'bySK');
            res.json(result);
        }
        catch (err) {
            res.statusCode = 500;
            res.json({ error: 'Could not load items: ' + err });
        }
    });
    /************************************
    * HTTP post method for insert object *
    *************************************/
    app.post('/reactions/:' + idKeyName, async function (req, res) {
        var _a, _b;
        const owner = req.apiGateway.event.requestContext.identity.cognitoIdentityId;
        if (!owner) {
            res.statusCode = 401;
            res.json({ error: 'Unknown user', url: req.url, body: req.body });
            return;
        }
        const reactionType = req.params[idKeyName];
        const created = (new Date()).getTime();
        const on = req.body.on; //{PK, SK}
        const by = req.body.by;
        const pk = ((_a = on.SK) === null || _a === void 0 ? void 0 : _a.startsWith("USER")) || ((_b = on.SK) === null || _b === void 0 ? void 0 : _b.startsWith("UNIV")) ? on.PK : on.SK;
        req.body = {
            [partitionKeyName]: pk,
            inverted: on.SK,
            [sortKeyName]: convertUrlToKey(exports.REACTION_TAG, reactionType, owner),
            by,
            createdAt: created
        };
        const react = reactionType.toLowerCase();
        let act = (react.endsWith('e') ? react + 'd' : react + 'ed') + on.PK.substring(0, on.PK.indexOf('#'));
        putItemIncrement(req, res, on, reactionType, { PK: convertUrlToKey("USER", owner), SK: convertUrlToKey("USER", by) }, act);
    });
    /************************************
    * HTTP delete method for deleting a reaction object.  *
    *************************************/
    app.delete('/reactions/:' + idKeyName, function (req, res) {
        var _a, _b, _c;
        const owner = req.apiGateway.event.requestContext.identity.cognitoIdentityId;
        if (!owner) {
            res.statusCode = 401;
            res.json({ error: 'Unknown user', url: req.url, body: req.body });
            return;
        }
        const reactionType = req.params[idKeyName];
        const on = req.body.on; //{PK, SK}
        const by = req.body.by;
        const pk = ((_a = on.SK) === null || _a === void 0 ? void 0 : _a.startsWith("USER")) || ((_b = on.SK) === null || _b === void 0 ? void 0 : _b.startsWith("UNIV")) || ((_c = on.SK) === null || _c === void 0 ? void 0 : _c.startsWith("ZZ")) ? on.PK : on.SK;
        req.body = {
            [partitionKeyName]: pk,
            [sortKeyName]: convertUrlToKey(exports.REACTION_TAG, reactionType, owner)
        };
        const react = reactionType.toLowerCase();
        let act = (react.endsWith('e') ? react + 'd' : react + 'ed') + on.PK.substring(0, on.PK.indexOf('#'));
        deleteItemDecrement(req, res, on, reactionType, { PK: convertUrlToKey("USER", owner), SK: convertUrlToKey("USER", by) }, act); //TODO: this may need to decrement
    });
}
exports.addReactionPaths = addReactionPaths;
//# sourceMappingURL=reactions.js.map