'use client';

import Link from 'next/link';
import { signOut } from '@/lib/auth-client';

interface HeaderProps {
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export function Header({ user }: HeaderProps) {
  return (
    <header className='sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between'>
      <Link href='/dashboard' className='text-xl font-bold'>
        NextNotes
      </Link>
      {user && (
        <button
          onClick={() =>
            signOut({
              fetchOptions: {
                onSuccess: () => {
                  window.location.href = '/';
                },
              },
            })
          }
          className='text-sm text-foreground/60 hover:text-foreground cursor-pointer'
        >
          Logout
        </button>
      )}
    </header>
  );
}
