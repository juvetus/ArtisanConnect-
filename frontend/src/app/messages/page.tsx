'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { whatsappHref } from '@/lib/whatsapp';

function Conversation({ otherUserId, serviceOrderId }: { otherUserId: string; serviceOrderId?: string }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const { data: contact } = useSWR(otherUserId ? ['message-contact', otherUserId] : null, ([, id]) => api.getUser(id));
  const whatsapp = whatsappHref(contact?.whatsappPhone ?? contact?.phone, `Bonjour ${contact?.name ?? ''}, je vous contacte via ArtisanConnect.`);

  const { data, mutate } = useSWR(
    ['conversation', otherUserId, serviceOrderId],
    ([, id, orderId]) => orderId ? api.serviceOrderConversation(orderId) : api.conversation(id),
    { refreshInterval: 10000 },
  );

  const [messages] = data ?? [[]];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content && !attachment) return;

    setSending(true);
    try {
      if (attachment && serviceOrderId) {
        await api.uploadServiceAttachment(serviceOrderId, attachment);
      }
      if (content) await api.sendMessage({ recipientId: otherUserId, serviceOrderId, content });
      setDraft('');
      setAttachment(null);
      await mutate();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[32rem] flex-col rounded-lg border border-stone-200 bg-white">
      {whatsapp ? <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-2"><span className="text-xs text-stone-500">Contact direct</span><a href={whatsapp} target="_blank" rel="noreferrer" className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">WhatsApp</a></div> : null}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-stone-500">
            {t('messages_empty')}
          </p>
        ) : (
          messages.map((message) => {
            const isMine = message.senderId === user?.id;
            return (
              <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                    isMine ? 'bg-amber-700 text-white' : 'bg-stone-100 text-stone-800'
                  }`}
                >
                  <p className="whitespace-pre-line">{message.content}</p>
                  {message.fileUrls?.map((fileUrl) => <a key={fileUrl} href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}${fileUrl}`} target="_blank" rel="noreferrer" className="mt-2 block text-xs underline">{t('messages_attachment')}</a>)}
                  <p className={`mt-1 text-xs ${isMine ? 'text-amber-200' : 'text-stone-500'}`}>
                    {new Date(message.createdAt).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSend} className="flex gap-2 border-t border-stone-200 p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('messages_placeholder')}
          className="flex-1 rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-amber-600"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="rounded-md bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800 disabled:opacity-60"
        >
          {t('messages_send')}
        </button>
        {serviceOrderId ? <label className="cursor-pointer rounded-md border border-stone-300 px-3 py-2 text-sm">{t('messages_attachment')}<input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.zip,.txt" onChange={(event) => setAttachment(event.target.files?.[0] ?? null)} /></label> : null}
      </form>
      {attachment ? <p className="px-3 pb-2 text-xs text-stone-500">{t('messages_attachment')} : {attachment.name}</p> : null}
    </div>
  );
}

function MessagesContent() {
  const { user, ready } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeId = searchParams.get('to');
  const serviceOrderId = searchParams.get('serviceOrderId') || undefined;

  const { data: threads, isLoading } = useSWR(user ? 'threads' : null, () => api.threads(), {
    refreshInterval: 15000,
  });

  useEffect(() => {
    if (ready && !user) router.push('/login');
  }, [ready, user, router]);

  if (!ready || !user || isLoading) return <p className="text-stone-600">{t('action_loading')}</p>;

  const activeThread = threads?.find((t) => t.user.id === activeId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t('messages_page_title')}</h1>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-2">
          {threads?.length === 0 && !activeId ? (
            <p className="rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-600">
              {t('messages_no_threads')}
            </p>
          ) : (
            threads?.map((thread) => (
              <button
                key={thread.user.id}
                onClick={() => router.push(`/messages?to=${thread.user.id}`)}
                className={`w-full rounded-lg border p-3 text-left ${
                  activeId === thread.user.id
                    ? 'border-amber-600 bg-amber-50'
                    : 'border-stone-200 bg-white hover:border-amber-500'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{thread.user.name}</span>
                  {thread.unread > 0 && (
                    <span className="rounded-full bg-amber-700 px-2 py-0.5 text-xs text-white">
                      {thread.unread}
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm text-stone-600">{thread.lastMessage.content}</p>
              </button>
            ))
          )}
        </aside>

        {activeId ? (
          <div>
            <p className="mb-2 font-medium">{activeThread?.user.name ?? t('messages_new_conversation')}</p>
            <Conversation otherUserId={activeId} serviceOrderId={serviceOrderId} />
          </div>
        ) : (
          <p className="rounded-lg border border-stone-200 bg-white p-8 text-center text-stone-600">
            {t('messages_no_conv')}
          </p>
        )}
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<p className="text-stone-600">Chargement…</p>}>
      <MessagesContent />
    </Suspense>
  );
}
