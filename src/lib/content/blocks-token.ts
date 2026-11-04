import { createHash } from "node:crypto";

/**
 * A private header the admin panel sends when it reads the site's pages for their editable text, so proxy.ts lets it
 * see unpublished pages too. Made from the deployment's secret; it never leaves the server.
 */
export const BLOCKS_HEADER = "x-cl-blocks";
export const blocksToken = () =>
  createHash("sha256")
    .update(`${process.env.VISIT_SALT || process.env.ADMIN_ENC_KEY || process.env.MONGODB_URI || "local"}|page-blocks`)
    .digest("hex")
    .slice(0, 32);
