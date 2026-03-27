import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Page not found</p>
      <Link
        href="/dashboard"
        className="inline-flex h-8 items-center border border-transparent bg-primary px-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/80"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
