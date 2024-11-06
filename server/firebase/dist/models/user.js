"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserProfile = exports.User = void 0;
const social_1 = require("./social");
//Accessible to other Users
class User extends social_1.SocialNode {
}
exports.User = User;
// Profile is visible to User for self only
class UserProfile extends User {
}
exports.UserProfile = UserProfile;
//# sourceMappingURL=user.js.map