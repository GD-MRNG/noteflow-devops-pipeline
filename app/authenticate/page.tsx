'use client';

import { Suspense, useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn, signUp } from '@/lib/auth-client';

type FormState = {
  error: string;
};

function AuthForm() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';

  const [state, submitAction, isPending] = useActionState<FormState, FormData>(
    async (_prevState, formData) => {
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;

      try {
        if (mode === 'signup') {
          const result = await signUp.email({
            email,
            password,
            name: email,
          });
          if (result.error) {
            return { error: 'Unable to create account. Please try again.' };
          }
          window.location.href = '/dashboard';
        } else {
          const result = await signIn.email({
            email,
            password,
            callbackURL: '/dashboard',
          });
          if (result.error) {
            return { error: 'Invalid email or password.' };
          }
        }
      } catch {
        return { error: 'An unexpected error occurred' };
      }

      return { error: '' };
    },
    { error: '' },
  );

  return (
    <>
      <h1 className='text-2xl font-bold text-center mb-8'>
        {mode === 'signup' ? 'Create Account' : 'Sign In'}
      </h1>

      <form action={submitAction} className='space-y-4'>
        <div>
          <label htmlFor='email' className='block text-sm font-medium mb-1'>
            Email
          </label>
          <input
            id='email'
            name='email'
            type='email'
            required
            autoComplete='email'
            className='w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>

        <div>
          <label htmlFor='password' className='block text-sm font-medium mb-1'>
            Password
          </label>
          <input
            id='password'
            name='password'
            type='password'
            required
            minLength={8}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            className='w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>

        {state.error && (
          <p role='alert' className='text-red-600 text-sm'>
            {state.error}
          </p>
        )}

        <button
          type='submit'
          disabled={isPending}
          className='w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {isPending ? 'Loading...' : mode === 'signup' ? 'Sign Up' : 'Sign In'}
        </button>
      </form>

      <p className='text-center mt-4 text-sm text-foreground/60'>
        {mode === 'signup' ? (
          <>
            Already have an account?{' '}
            <Link href='/authenticate?mode=login' className='text-blue-600 hover:underline'>
              Sign in
            </Link>
          </>
        ) : (
          <>
            Don&apos;t have an account?{' '}
            <Link href='/authenticate?mode=signup' className='text-blue-600 hover:underline'>
              Sign up
            </Link>
          </>
        )}
      </p>
    </>
  );
}

export default function Authenticate() {
  return (
    <div className='flex min-h-screen items-center justify-center p-8'>
      <main className='max-w-md w-full'>
        <Suspense fallback={<div className='text-center'>Loading...</div>}>
          <AuthForm />
        </Suspense>
      </main>
    </div>
  );
}
