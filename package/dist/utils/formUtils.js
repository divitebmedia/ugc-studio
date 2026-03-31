"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFormLength = void 0;
const getFormLength = (form) => {
    return new Promise((resolve, reject) => {
        form.getLength((err, length) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(length);
        });
    });
};
exports.getFormLength = getFormLength;
//# sourceMappingURL=formUtils.js.map