/**
 * Mirrors the server's cap in `server/generate.mjs`. The image API accepts ten
 * images per edit and applies the mask to the first, so the photograph takes
 * one slot and material references get the rest.
 *
 * Duplicated rather than imported because the server module is `.mjs` and pulls
 * in Node-only APIs; a test asserts the two stay equal.
 */
export const MAX_IMAGES = 10;
export const MAX_REFERENCES = MAX_IMAGES - 1;
