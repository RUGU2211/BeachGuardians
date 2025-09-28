"use client";
import { useRef, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hi! Ask me about events, registration, directions, or your points.' },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    const el = listRef.current; if (!el) return; el.scrollTop = el.scrollHeight;
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    setMessages((m) => [...m, { role: 'user', content: text }, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No stream');
      // Stream chunks into the last assistant message
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) {
          const chunk = decoder.decode(value);
          setMessages((m) => {
            const copy = [...m];
            const idx = copy.findIndex((x) => x.role === 'assistant' && x.content === '');
            if (idx >= 0) copy[idx] = { role: 'assistant', content: (copy[idx].content || '') + chunk };
            return copy;
          });
          scrollToBottom();
        }
      }
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: 'Sorry, I had trouble responding.' }]);
    } finally {
      setSending(false);
      scrollToBottom();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-3 w-80 rounded-xl border bg-white shadow-xl overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold">AI Assistant</div>
          <div ref={listRef} className="p-4 space-y-3 text-sm h-64 overflow-y-auto">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                <div className={`inline-block max-w-[85%] rounded-lg px-3 py-2 ${m.role === 'user' ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 p-3 border-t">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
              placeholder="Type your message..."
              className="flex-1 border rounded-md px-3 py-2"
            />
            <button
              aria-label="Send"
              onClick={sendMessage}
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 bg-primary text-white hover:bg-primary/90 disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      <button
        aria-label="Open AI assistant"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 bg-primary text-white shadow-lg hover:bg-primary/90"
      >
        <MessageCircle className="w-5 h-5" />
        <span>Chat</span>
      </button>
    </div>
  );
}