"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class _GenericExtend {
    constructor(data) {
        const proto = Object.assign({}, _GenericExtend.prototype);
        Object.assign(proto, Object.getPrototypeOf(data));
        Object.setPrototypeOf(this, proto);
        Object.assign(this, data);
    }
}
class _Response extends _GenericExtend {
}
const Response = _Response;
class _Request extends _GenericExtend {
}
const Request = _Request;
//# sourceMappingURL=api-base.js.map