'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Role } from '@/lib/types';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('client');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPending(true);
    try {
      await register({ name, email, password, role });
      router.push(role === 'artisan' ? '/dashboard' : '/');
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? 'Cet email est déjà utilisé.'
          : "L'inscription a échoué. Réessayez.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold">Créer un compte</h1>
      <p className="mt-1 text-sm text-stone-600">
        Achetez des créations locales ou vendez les vôtres.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-lg border border-stone-200 bg-white p-6">
        <fieldset className="grid grid-cols-2 gap-3">
          <legend className="mb-2 text-sm font-medium">Je suis…</legend>
          {(['client', 'artisan'] as const).map((value) => (
            <label
              key={value}
              className={`cursor-pointer rounded-md border px-3 py-3 text-center text-sm ${
                role === value
                  ? 'border-amber-600 bg-amber-50 font-medium text-amber-900'
                  : 'border-stone-300 hover:bg-stone-50'
              }`}
            >
              <input
                type="radio"
                name="role"
                value={value}
                checked={role === value}
                onChange={() => setRole(value)}
                className="sr-only"
              />
              {value === 'client' ? 'Acheteur' : 'Artisan'}
            </label>
          ))}
        </fieldset>

        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Nom
          </label>
          <input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-amber-600"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-amber-600"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-amber-600"
          />
          <p className="mt-1 text-xs text-stone-500">8 caractères minimum.</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-amber-700 py-2 font-medium text-white hover:bg-amber-800 disabled:opacity-60"
        >
          {pending ? 'Création…' : 'Créer mon compte'}
        </button>

        <p className="text-center text-sm text-stone-600">
          Déjà inscrit ?{' '}
          <Link href="/login" className="text-amber-700 underline">
            Se connecter
          </Link>
        </p>
      </form>
    </div>
  );
}
