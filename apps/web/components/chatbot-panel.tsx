'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { Icon } from './icons';

interface ChatMessage { from: 'customer' | 'assistant'; content: string; }

const suggestions = ['What is my balance?', 'Explain fraud checks'];

export function ChatbotPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  async function send(message: string): Promise<void> {
    if (!message || loading) return;
    setMessages((current) => [...current, { from: 'customer', content: message }]);
    setLoading(true);
    try {
      const result = await api.chat(message, conversationId);
      setConversationId(result.conversationId);
      setMessages((current) => [...current, { from: 'assistant', content: result.response }]);
    } catch {
      setMessages((current) => [...current, { from: 'assistant', content: 'I’m temporarily unavailable. Please try again shortly.' }]);
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    const input = new FormData(form).get('message');
    const message = typeof input === 'string' ? input.trim() : '';
    if (!message) return;
    form.reset();
    await send(message);
  }

  return (
    <section className="flex h-[430px] min-h-0 min-w-0 w-full max-w-full flex-col self-start overflow-hidden rounded-[24px] bg-[#102f27] text-white shadow-[0_18px_45px_-32px_rgba(9,45,36,.8)]">
      <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-5 py-4">
        <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-[#d8f85c] text-[#123b30]"><Icon name="sparkles" className="h-5 w-5" /><span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#102f27] bg-[#5ee6af]" /></span>
        <div><h2 className="text-sm font-bold">Astra assistant</h2><p className="mt-0.5 text-[11px] text-[#9dbbb3]">Secure banking guidance</p></div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
        {messages.length === 0 && <><p className="max-w-[90%] rounded-2xl rounded-tl-sm bg-white/10 px-4 py-3 text-xs leading-5 text-[#d9e6e2]">Hello! I can help explain your account, transactions, and security alerts. What would you like to know?</p><div className="flex flex-wrap gap-2 pt-1">{suggestions.map((item) => <button key={item} onClick={() => void send(item)} className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] font-semibold text-[#c1d5cf] hover:border-[#d8f85c]/60 hover:text-[#d8f85c]">{item}</button>)}</div></>}
        {messages.map((item, index) => <p key={`${item.from}-${index}`} className={`max-w-[90%] rounded-2xl px-4 py-3 text-xs leading-5 ${item.from === 'customer' ? 'ml-auto rounded-tr-sm bg-[#d8f85c] text-[#123b30]' : 'rounded-tl-sm bg-white/10 text-[#d9e6e2]'}`}>{item.content}</p>)}
        {loading && <div className="flex w-fit gap-1 rounded-2xl rounded-tl-sm bg-white/10 px-4 py-3"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9dbbb3]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9dbbb3] [animation-delay:120ms]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9dbbb3] [animation-delay:240ms]" /></div>}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={submit} className="m-3 mt-0 flex shrink-0 items-center gap-2 rounded-2xl bg-white p-1.5 pl-3">
        <input name="message" maxLength={2000} required placeholder="Ask Astra anything…" className="chat-input min-w-0 flex-1 border-0 bg-transparent text-xs text-[#18352e] outline-none shadow-none placeholder:text-[#95a29e]" />
        <button disabled={loading} aria-label="Send message" className="grid h-9 w-9 place-items-center rounded-xl bg-[#087a5b] text-white transition hover:bg-[#066c50] disabled:opacity-50"><Icon name="send" className="h-4 w-4" /></button>
      </form>
    </section>
  );
}
