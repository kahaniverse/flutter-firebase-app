"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReactionType = exports.State = exports.UserAction = exports.EntryAction = void 0;
var EntryAction;
(function (EntryAction) {
    EntryAction["CREATE"] = "created";
    EntryAction["UPDATE"] = "updated";
    EntryAction["DELETE"] = "deleted";
})(EntryAction || (exports.EntryAction = EntryAction = {}));
var UserAction;
(function (UserAction) {
    UserAction["VIEW"] = "view";
    UserAction["FOLLOW"] = "follow";
    UserAction["REACT"] = "react";
    UserAction["SHARE"] = "share";
    UserAction["INVITE"] = "invite";
})(UserAction || (exports.UserAction = UserAction = {}));
var State;
(function (State) {
    State["NEW"] = "new";
    State["ACTIVE"] = "active";
    State["EDITED"] = "edited";
    State["INACTIVE"] = "inactive";
    State["REACTIVED"] = "reactived";
    State["DELETED"] = "deleted";
    //used for links
    State["ADDED"] = "added";
    State["REMOVED"] = "removed";
    State["BLOCKED"] = "blocked";
})(State || (exports.State = State = {}));
var ReactionType;
(function (ReactionType) {
    ReactionType["LOVE"] = "LOVE";
    ReactionType["HATE"] = "HATE"; //-1
})(ReactionType || (exports.ReactionType = ReactionType = {}));
//# sourceMappingURL=enums.js.map