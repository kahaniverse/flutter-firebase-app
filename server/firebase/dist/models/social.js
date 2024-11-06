"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reaction = exports.Edge = exports.Comment = exports.SocialNode = void 0;
const enums_1 = require("./enums");
class SocialNode {
    constructor() {
        this.status = enums_1.State.NEW;
        this.action = enums_1.EntryAction.CREATE;
    }
}
exports.SocialNode = SocialNode;
class Comment extends SocialNode {
}
exports.Comment = Comment;
class Edge {
}
exports.Edge = Edge;
class Reaction extends Edge {
}
exports.Reaction = Reaction;
//# sourceMappingURL=social.js.map