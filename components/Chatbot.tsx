import React, { useState, useEffect, useRef } from 'react';
import { streamChat } from '../services/geminiService';
import type { ChatMessage } from '../types';
import { Spinner } from './Spinner';
import { useTranslation } from '../contexts/LanguageContext';

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
);

const BotIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-brand-green-dark dark:text-brand-green-light"><path d="M12 8V4H8"></path><rect x="4" y="8" width="16" height="12" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg>
);

export const Chatbot: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { t, language } = useTranslation();
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'model', content: t('chatbot.welcome') }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const currentInput = input.trim();
        const historySnapshot = messages;
        const userMessage: ChatMessage = { role: 'user', content: currentInput };

        setMessages(prev => [...prev, userMessage, { role: 'model', content: '' }]);
        setInput('');
        setIsLoading(true);

        try {
            const stream = await streamChat(currentInput, historySnapshot, language);

            for await (const chunk of stream) {
                const chunkText = chunk.text;
                setMessages(prev => {
                    if (prev.length === 0) return prev;
                    const newMessages = [...prev];
                    const lastIndex = newMessages.length - 1;
                    const lastMessage = newMessages[lastIndex];

                    if (lastMessage?.role !== 'model') {
                        return [...newMessages, { role: 'model', content: chunkText }];
                    }

                    newMessages[lastIndex] = {
                        ...lastMessage,
                        content: `${lastMessage.content}${chunkText}`,
                    };
                    return newMessages;
                });
            }
        } catch (error) {
            console.error("Chat error:", error);
            const userFacingError =
                error instanceof Error && /temporarily busy|retry in a minute/i.test(error.message)
                    ? error.message
                    : t('chatbot.error');
            setMessages(prev => {
                if (prev.length === 0) return [{ role: 'model', content: userFacingError }];

                const newMessages = [...prev];
                const lastIndex = newMessages.length - 1;
                const lastMessage = newMessages[lastIndex];

                if (lastMessage?.role === 'model' && !lastMessage.content.trim()) {
                    newMessages[lastIndex] = { role: 'model', content: userFacingError };
                    return newMessages;
                }

                return [...newMessages, { role: 'model', content: userFacingError }];
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-0 right-0 sm:bottom-20 sm:right-6 z-50 w-full h-full sm:w-[400px] sm:h-[600px] sm:max-h-[80vh] flex flex-col bg-white dark:bg-gray-800 shadow-2xl rounded-t-lg sm:rounded-lg animate-slide-in-up">
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-brand-green-light dark:bg-brand-green-dark rounded-t-lg sm:rounded-t-lg">
                <h3 className="font-bold text-white dark:text-gray-100 text-lg">{t('chatbot.title')}</h3>
                <button onClick={onClose} className="text-white dark:text-gray-200 hover:text-gray-700 dark:hover:text-gray-400" aria-label="Close chat">
                    <CloseIcon />
                </button>
            </header>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'model' && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-green-light/20 flex items-center justify-center">
                                <BotIcon />
                            </div>
                        )}
                        <div className={`max-w-[80%] p-3 rounded-xl ${msg.role === 'user' ? 'bg-brand-green text-white rounded-br-none' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
                            {msg.role === 'model' && !msg.content && isLoading ? (
                                <Spinner small={true} />
                            ) : (
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <footer className="p-4 border-t border-gray-200 dark:border-gray-700">
                <form onSubmit={handleSend} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder={t('chatbot.placeholder')}
                        className="flex-grow p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:bg-gray-200 dark:disabled:bg-gray-600"
                        aria-label="Chat message input"
                        dir={language === 'ar' ? 'rtl' : 'ltr'}
                    />
                    <button type="submit" disabled={isLoading || !input.trim()} className="p-3 bg-brand-green text-white font-bold rounded-lg shadow-md hover:bg-brand-green-dark disabled:bg-gray-400 disabled:cursor-not-allowed transition-all" aria-label="Send message">
                        <SendIcon />
                    </button>
                </form>
            </footer>
        </div>
    );
};
