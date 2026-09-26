'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';

type SuggestionTask = 'listing_description' | 'service_description' | 'institution_resource' | 'institution_program';

type Props = {
  task: SuggestionTask;
  input: string;
  context?: string;
  onApply: (text: string) => void;
};

export function AiTextSuggestion({ task, input, context = '', onApply }: Props) {
  const { language } = useLanguage();
  const english = language === 'en';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestion, setSuggestion] = useState<{ fingerprint: string; content: string } | null>(null);
  const fingerprint = `${input}\u0000${context}`;
  const currentSuggestion = suggestion?.fingerprint === fingerprint ? suggestion.content : '';

  const generate = async () => {
    const sourceText = input.trim() || (context.trim() ? (english ? 'Draft a clear description using the supplied context.' : 'Rédige une description claire à partir du contexte fourni.') : '');
    if (!sourceText) return;
    setLoading(true);
    setError('');
    setSuggestion(null);
    try {
      const result = await api.assistantSuggestText({ task, input: sourceText, context, language });
      setSuggestion({ fingerprint, content: result.content });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : (english ? 'Could not prepare an AI suggestion.' : 'Impossible de préparer une suggestion IA.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2 space-y-2">
      <button type="button" disabled={(!input.trim() && !context.trim()) || loading} onClick={() => void generate()} className="rounded-md border border-amber-700 px-3 py-1.5 text-sm font-medium text-amber-800 disabled:opacity-50">
        {loading ? (english ? 'Preparing…' : 'Préparation…') : (english ? 'Suggest with AI' : 'Suggérer avec l’IA')}
      </button>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      {currentSuggestion ? (
        <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="whitespace-pre-wrap text-sm text-stone-800">{currentSuggestion}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { onApply(currentSuggestion); setSuggestion(null); }} className="rounded-md bg-amber-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-800">
              {english ? 'Apply suggestion' : 'Appliquer la suggestion'}
            </button>
            <button type="button" onClick={() => setSuggestion(null)} className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700">
              {english ? 'Dismiss' : 'Ignorer'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
