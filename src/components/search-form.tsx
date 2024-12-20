'use client';

import { useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';

export function SearchForm() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get('q') || '';
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get('query') as string;
    if (!query.trim()) return;
    
    startTransition(() => {
      router.push(`/?q=${encodeURIComponent(query)}`);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        name="query"
        placeholder="Search for members..."
        defaultValue={currentQuery}
      />
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Searching...' : 'Search'}
      </Button>
    </form>
  );
}
