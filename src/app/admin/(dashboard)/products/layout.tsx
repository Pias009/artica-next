import { Products } from "@/components/admin/views/Products";

/**
 * The list and the add and edit pages are one view, which reads the address to know which to show: mounted here, its
 * drafts survive moving between them. The pages below only give each address its session check and title.
 */
export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Products />
      {children}
    </>
  );
}
