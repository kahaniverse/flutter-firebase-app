"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Page = exports.Story = exports.Character = exports.Universe = void 0;
const social_1 = require("./social");
class Universe extends social_1.SocialNode {
    // concept: string; use description
    get concept() {
        return this.description;
    }
    set concept(data) {
        this.description = data;
    }
}
exports.Universe = Universe;
class Character extends social_1.SocialNode {
    // about: string; use description
    get about() {
        return this.description;
    }
    set about(data) {
        this.description = data;
    }
}
exports.Character = Character;
class Story extends social_1.SocialNode {
    // synopsis: string; use description
    get synopsis() {
        return this.description;
    }
    set synopsis(data) {
        this.description = data;
    }
}
exports.Story = Story;
class Page extends social_1.SocialNode {
    // content: string; use description
    get content() {
        return this.description;
    }
    set content(data) {
        this.description = data;
    }
}
exports.Page = Page;
//sub collections:
// /authors/:id/stories/
//# sourceMappingURL=kahani.js.map