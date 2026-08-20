import Link from 'next/link';
import { apiProductionUrl } from '@/lib/shared';

export default function HomePage() {
  return (
    <div className="flex flex-col justify-center text-center flex-1 px-6">
      <h1 className="text-3xl font-bold mb-3">TimeforSchool</h1>
      <p className="text-fd-muted-foreground mb-8 max-w-lg mx-auto">
        Documentation for the TypeScript client and the production HTTP API
        (NEIS + Comcigan).
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link
          href="/docs"
          className="rounded-lg bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground"
        >
          Read the docs
        </Link>
        <a
          href={apiProductionUrl}
          className="rounded-lg border px-4 py-2 text-sm font-medium"
          rel="noreferrer"
          target="_blank"
        >
          Open live API
        </a>
      </div>
    </div>
  );
}
