/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, Send, RefreshCw, Bot, User } from 'lucide-react';
import { UserAccount, Transaction, SavingsVault } from '../types';

interface AiAdvisorProps {
  session: UserAccount;
  transactions: Transaction[];
  savings: SavingsVault[];
}

export const AiAdvisor: React.FC<AiAdvisorProps> = ({ session, transactions, savings }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    {
      role: 'assistant',
      content: `Hello ${session.fullName}! I'm your MikraPay AI Financial Advisor. I have full context on your virtual balance (${session.balance.toLocaleString()} VND) and recent activity. Ask me about your spending breakdown, saving tips, or budgeting for your next group outing!`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setIsLoading(true);

    try {
      const userTxs = transactions.filter(t => t.senderStk === session.stk || t.receiverStk === session.stk);
      const userSavings = savings.filter(s => s.userStk === session.stk);

      const context = {
        fullName: session.fullName,
        stk: session.stk,
        balance: session.balance,
        recentTransactions: userTxs.slice(0, 8),
        savingsVaults: userSavings,
      };

      const response = await fetch('/api/gemini/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userText, context }),
      });

      const data = await response.json();
      if (data.text) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
      } else {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: "I'm having a brief issue reaching the financial server. Please try again in a second!" },
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Connection error while communicating with AI Advisor.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/30 dark:border-white/10 flex flex-col h-[650px] shadow-xl max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/40 dark:border-white/10 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Mikra AI Financial Advisor</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Powered by Gemini 3.8 Flash · Context-aware friend budgeting
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            setMessages([
              {
                role: 'assistant',
                content: `Chat reset. How can I help you manage your ${session.balance.toLocaleString()} VND balance today?`,
              },
            ])
          }
          className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
          title="Clear chat"
        >
          Reset
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex items-start gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div
              className={`max-w-[80%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-cyan-500 text-slate-950 font-medium rounded-tr-none shadow-md shadow-cyan-500/10'
                  : 'glass-card text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200/40 dark:border-white/10'
              }`}
            >
              {m.content}
            </div>
            {m.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 mt-0.5 text-xs">
                {session.avatar}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-cyan-600 dark:text-cyan-400 animate-pulse pl-9">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Analyzing your expenses and generating financial guidance...</span>
          </div>
        )}
      </div>

      {/* Suggested Quick Prompts */}
      <div className="flex gap-2 overflow-x-auto py-2">
        {[
          'How can I save for our Da Nang trip?',
          'Analyze my recent transaction habits',
          'Give me a 50/30/20 budget recommendation',
        ].map((promptText, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setInput(promptText)}
            className="text-[11px] whitespace-nowrap px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-cyan-500/15 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-white/10 transition-colors"
          >
            {promptText}
          </button>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="mt-2 pt-3 border-t border-slate-200/40 dark:border-white/10 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a question about your spending, split bills, savings..."
          className="flex-1 px-4 py-3 rounded-xl glass-input text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-5 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl shadow-md shadow-cyan-500/20 transition-all cursor-pointer flex items-center gap-1.5"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
};
