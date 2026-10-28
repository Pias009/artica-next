import Link from "next/link";

/** notFound() inside /admin (an inquiry ref that doesn't exist): stays in the admin, not the public site. */
export default function AdminNotFound() {
  return (
    <main className="grid min-h-[60vh] place-items-center px-4 text-center">
      <div>
        <p className="text-xs font-bold tracking-[.14em] text-muted uppercase">404</p>
        <h1 className="mt-2 font-headline text-[28px] font-semibold">Nothing here</h1>
        <Link href="/admin/inquiries" className="btn btn-dark mt-5">
          Back to inquiries
        </Link>
      </div>
    </main>
  );
}
