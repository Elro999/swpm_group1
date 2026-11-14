import Link from "next/link";
import { ui } from "@/components/ui";

/** Friendly 404 (task 7.1). Also shown for interviews, attempts and admin pages that are not yours. */
export default function NotFound() {
  return (
    <main className={`${ui.page} flex flex-col gap-4`}>
      <h1 className={ui.h1}>This page could not be found.</h1>
      <p className={ui.lead}>
        The link may be wrong, the page may belong to someone else, or the data may have been deleted. If you saved a private link,
        open it again to get back to your work.
      </p>
      <div>
        <Link href="/" className={ui.btnPrimary}>
          Go to the start
        </Link>
      </div>
    </main>
  );
}
