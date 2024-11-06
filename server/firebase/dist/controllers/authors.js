"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addAuthorPaths = void 0;
const utils_1 = require("./utils");
const lodash_1 = require("lodash");
const type = "AUTHOR";
const partitionKeyName = "PK";
const sortKeyName = "id";
const METADATA = 'USER';
function addNestedPath(app, nestedPath, nestedType) {
    /********************************
     * HTTP Get method for listing further nested objects
     ********************************/
    app.get('/authors/:PK/' + nestedPath, async function (req, res) {
        var condition = 'PK = :pk AND begins_with (SK, :sk)';
        let values = {
            ":pk": req.params[partitionKeyName],
            ":sk": (0, lodash_1.upperCase)(nestedType)
        };
        try {
            res.json(await (0, utils_1.queryMany)(condition, values, req.query));
        }
        catch (err) {
            res.statusCode = 500;
            res.json({ error: 'Could not load items: ' + err });
        }
    });
}
function addAuthorPaths(app) {
    addNestedPath(app, 'universes', 'UNIV');
    addNestedPath(app, 'stories', 'STORY');
    addNestedPath(app, 'characters', 'CHARACTER');
    addNestedPath(app, 'comments', 'COMMENT');
    /********************************
     * HTTP Get method for list independent objects *
     ********************************/
    app.get('/authors', async function (req, res) {
        try {
            var condition = '#typ = :type AND begins_with(SK, :sorter)';
            let values = {
                ":type": type,
                ":sorter": (0, utils_1.convertUrlToKey)(METADATA)
            };
            let names = {
                "#typ": "type"
            };
            const result = await (0, utils_1.queryMany)(condition, values, req.query, names, 'byType');
            res.json(result);
        }
        catch (err) {
            res.statusCode = 500;
            res.json({ error: 'Could not load items: ' + err });
        }
    });
    app.get('/authors/:id', async function (req, res) {
        try {
            var condition = '#typ = :type AND SK = :sorter';
            let values = {
                ":type": type,
                ":sorter": (0, utils_1.convertUrlToKey)(METADATA, req.params[sortKeyName])
            };
            let names = {
                "#typ": "type"
            };
            const result = await (0, utils_1.queryMany)(condition, values, req.query, names, 'byType'); //assume only one
            res.json(result[0]);
        }
        catch (err) {
            res.statusCode = 500;
            res.json({ error: 'Could not load items: ' + err });
        }
    });
}
exports.addAuthorPaths = addAuthorPaths;
//# sourceMappingURL=authors.js.map