import "server-only";
import type { Metadata } from "next";
import { loadContent } from "./store";
import { pageMeta } from "../site";

/**
 * A page's metadata with the search title and description from the admin panel (Pages), where one was written; the
 * page's own otherwise. Pages export `generateMetadata = () => editableMeta({...})`.
 */
export async function editableMeta(o: Parameters<typeof pageMeta>[0]): Promise<Metadata> {
  const edit = (await loadContent()).pages[o.path];
  return pageMeta({
    ...o,
    title: edit?.title || o.title,
    description: edit?.description || o.description,
  });
}
