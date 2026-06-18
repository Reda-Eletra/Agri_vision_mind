
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { connectToVoiceAssistant, getCurrentDateTimeSnapshot } from '../services/geminiService';
import type { TranscriptEntry } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth
import { LiveServerMessage, Blob } from '@google/genai';
import { Spinner } from './Spinner';

// ... helper functions encode, decode, decodeAudioData, createBlob ...
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const MicrophoneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

interface VoiceAssistantProps {
    onClose: () => void;
    onNavigate?: (view: string) => void;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onClose, onNavigate }) => {
    const { t, language } = useTranslation();
    const { user } = useAuth(); // Get user from context
    const [status, setStatus] = useState<'connecting' | 'listening' | 'processing' | 'speaking' | 'error'>('connecting');
    const [error, setError] = useState<string | null>(null);
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

    const sessionPromiseRef = useRef<ReturnType<typeof connectToVoiceAssistant> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const silentMonitorRef = useRef<GainNode | null>(null);
    const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
    const nextStartTimeRef = useRef(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    const currentInputRef = useRef('');
    const currentOutputRef = useRef('');

    const getVoiceErrorMessage = (errorValue: unknown) => {
        const message = errorValue instanceof Error ? errorValue.message : String(errorValue || '');
        return /temporarily busy|503|429|overloaded|unavailable/i.test(message)
            ? 'Gemini voice chat is temporarily busy. Please retry in a minute.'
            : t('voiceAssistant.errorApi');
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [transcript]);

    const handleMessage = useCallback(async (message: LiveServerMessage) => {
        // Handle Tool Calls (Navigation)
        if (message.toolCall) {
            for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'getCurrentDateTime') {
                    const snapshot = getCurrentDateTimeSnapshot(language);

                    sessionPromiseRef.current?.then(session => {
                        session.sendToolResponse({
                            functionResponses: [{
                                id: fc.id,
                                name: fc.name,
                                response: snapshot,
                            }]
                        });
                    });
                    continue;
                }

                if (fc.name === 'changeView') {
                    const view = fc.args['view'];
                    const didNavigate = Boolean(onNavigate && typeof view === 'string');
                    if (didNavigate) onNavigate(view as string);

                    sessionPromiseRef.current?.then(session => {
                        session.sendToolResponse({
                            functionResponses: [{
                                id: fc.id,
                                name: fc.name,
                                response: {
                                    result: didNavigate
                                        ? `Navigated to ${view}`
                                        : 'Navigation was skipped because the requested view was unavailable.',
                                }
                            }]
                        });
                    });
                }
            }
        }

        if (message.serverContent?.inputTranscription) {
            const text = message.serverContent.inputTranscription.text;
            if (text) {
                currentInputRef.current += text;
                setTranscript(prev => {
                    const newTranscript = [...prev];
                    const last = newTranscript[newTranscript.length - 1];
                    if (last?.speaker === 'user' && !message.serverContent.turnComplete) {
                        last.text = currentInputRef.current;
                    } else {
                        // Only add if we have text (to avoid empty bubbles on start)
                        if (currentInputRef.current.trim()) {
                             // If the last one was user but turn completed, we might need new logic, 
                             // but generally Gemini sends chunks.
                             // For simplicity: if last was user, update it. If last was model, push new user.
                             if (last?.speaker === 'user') {
                                 last.text = currentInputRef.current;
                             } else {
                                 newTranscript.push({ speaker: 'user', text: currentInputRef.current });
                             }
                        }
                    }
                    return newTranscript;
                });
            }
        }
        
        if (message.serverContent?.outputTranscription) {
            setStatus('speaking');
            const text = message.serverContent.outputTranscription.text;
            if (text) {
                currentOutputRef.current += text;
                setTranscript(prev => {
                    const newTranscript = [...prev];
                    const last = newTranscript[newTranscript.length - 1];
                    if (last?.speaker === 'model' && !message.serverContent.turnComplete) {
                        last.text = currentOutputRef.current;
                    } else {
                        // Same logic for model
                        if (currentOutputRef.current.trim()) {
                            if (last?.speaker === 'model') {
                                last.text = currentOutputRef.current;
                            } else {
                                newTranscript.push({ speaker: 'model', text: currentOutputRef.current });
                            }
                        }
                    }
                    return newTranscript;
                });
            }
        }
        
        if (message.serverContent?.turnComplete) {
            currentInputRef.current = '';
            currentOutputRef.current = '';
        }

        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64Audio && outputAudioContextRef.current) {
            const outputAudioContext = outputAudioContextRef.current;
            if (outputAudioContext.state === 'suspended') {
                await outputAudioContext.resume();
            }
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
            const source = outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputAudioContext.destination);
            source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) {
                   setStatus('listening');
                }
            });
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            sourcesRef.current.add(source);
        }
        
        const interrupted = message.serverContent?.interrupted;
        if (interrupted) {
            for (const source of sourcesRef.current.values()) {
                source.stop();
            }
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
            setStatus('listening');
        }

    }, [language, onNavigate]);

    const cleanup = useCallback(() => {
        sessionPromiseRef.current?.then(session => session.close());
        sessionPromiseRef.current = null;
        inputSourceRef.current?.disconnect();
        scriptProcessorRef.current?.disconnect();
        silentMonitorRef.current?.disconnect();
        inputSourceRef.current = null;
        scriptProcessorRef.current = null;
        silentMonitorRef.current = null;
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
        for (const source of sourcesRef.current.values()) {
            source.stop();
        }
        sourcesRef.current.clear();
        nextStartTimeRef.current = 0;
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
        }
        inputAudioContextRef.current = null;
        outputAudioContextRef.current = null;
    }, []);

    useEffect(() => {
        let isActive = true;

        const init = async () => {
            try {
                mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
                
                inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                await Promise.allSettled([
                    inputAudioContextRef.current.resume(),
                    outputAudioContextRef.current.resume(),
                ]);

                // Pass user.name to the connection function
                sessionPromiseRef.current = connectToVoiceAssistant(language, {
                    onopen: async () => {
                        if (!isActive || !inputAudioContextRef.current || !mediaStreamRef.current) return;

                        const inputContext = inputAudioContextRef.current;
                        const outputContext = outputAudioContextRef.current;
                        if (inputContext.state === 'suspended') {
                            await inputContext.resume();
                        }
                        if (outputContext && outputContext.state === 'suspended') {
                            await outputContext.resume();
                        }

                        const source = inputContext.createMediaStreamSource(mediaStreamRef.current);
                        const silentMonitor = inputContext.createGain();
                        silentMonitor.gain.value = 0;
                        inputSourceRef.current = source;
                        silentMonitorRef.current = silentMonitor;

                        scriptProcessorRef.current = inputContext.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(silentMonitor);
                        silentMonitor.connect(inputContext.destination);
                        setStatus('listening');
                    },
                    onmessage: handleMessage,
                    onerror: (e: ErrorEvent) => {
                        console.error('API Error:', e);
                        setError(getVoiceErrorMessage(e));
                        setStatus('error');
                    },
                    onclose: () => {
                       console.log('Session closed.');
                    },
                }, user?.name); // Pass user name here

                if (!isActive) {
                    cleanup();
                }

            } catch (err) {
                console.error('Microphone Error:', err);
                setError(err instanceof Error && /Gemini|temporarily busy|503|429/i.test(err.message) ? getVoiceErrorMessage(err) : t('voiceAssistant.errorMic'));
                setStatus('error');
            }
        };

        init();
        return () => {
            isActive = false;
            cleanup();
        };
    }, [t, language, handleMessage, cleanup, user?.name]); // Added user?.name dependency

    const getStatusText = () => {
        switch(status) {
            case 'connecting': return <Spinner />;
            case 'listening': return t('voiceAssistant.listening');
            case 'speaking': return t('voiceAssistant.processing');
            case 'error': return error;
            default: return '';
        }
    };
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,14,10,0.7)] p-4 backdrop-blur-xl animate-fade-in">
            <div className="grid h-[88vh] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[var(--ag-surface-strong)] shadow-[0_36px_72px_rgba(0,0,0,0.24)] xl:grid-cols-[360px_minmax(0,1fr)]">
                <aside className="relative overflow-hidden border-b border-[var(--ag-border)] bg-[linear-gradient(180deg,rgba(17,44,30,0.98),rgba(29,81,52,0.94))] p-6 text-white xl:border-b-0 xl:border-r">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(111,207,151,0.24),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(114,169,236,0.18),transparent_30%)]" />
                    <div className="relative flex h-full flex-col">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/60">Voice workspace</p>
                                <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.04em]">{t('voiceAssistant.title')}</h2>
                            </div>
                            <button
                                onClick={() => { cleanup(); onClose(); }}
                                aria-label={t('voiceAssistant.close')}
                                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/10 text-white transition-colors hover:bg-white/16"
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        <div className="mt-8 rounded-[1.6rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
                            <div className="relative mx-auto flex h-32 w-32 items-center justify-center">
                                <div className={`absolute inset-0 rounded-full bg-white/10 ${status === 'listening' ? 'animate-pulse' : ''} ${status === 'speaking' ? 'animate-ping' : ''}`} />
                                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white text-brand-green-dark shadow-[0_20px_40px_rgba(0,0,0,0.16)]">
                                    <MicrophoneIcon />
                                </div>
                            </div>
                            <p className={`mt-5 text-center text-base font-bold ${status === 'error' ? 'text-red-200' : 'text-white'}`}>{getStatusText()}</p>
                            <p className="mt-2 text-center text-sm leading-6 text-white/68">
                                {status === 'listening'
                                    ? t('voiceAssistant.description')
                                    : 'The assistant can navigate between app views and answer contextual agriculture questions.'}
                            </p>
                        </div>

                        <div className="mt-6 space-y-3">
                            <div className="rounded-[1.3rem] border border-white/10 bg-white/8 p-4">
                                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/58">Capabilities</p>
                                <ul className="mt-3 space-y-2 text-sm leading-6 text-white/72">
                                    <li>Navigate to diagnosis, dashboard, guide, and community workspaces.</li>
                                    <li>Hold context during back-and-forth voice conversations.</li>
                                    <li>Surface agronomy guidance while keeping the interface calm and readable.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </aside>

                <div className="flex min-h-0 flex-col">
                    <div className="border-b border-[var(--ag-border)] px-6 py-5">
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--ag-text-soft)]">Conversation stream</p>
                        <p className="mt-2 text-sm text-[var(--ag-text-muted)]">Transcript updates in real time as the assistant listens, thinks, and responds.</p>
                    </div>

                    <main className="ui-scroll flex-1 space-y-4 overflow-y-auto px-6 py-6">
                        {transcript.length === 0 ? (
                            <div className="flex h-full items-center justify-center">
                                <div className="max-w-md rounded-[1.6rem] border border-[var(--ag-border)] bg-[var(--ag-surface-muted)] p-6 text-center">
                                    <p className="text-xl font-extrabold tracking-[-0.04em] text-[var(--ag-text)]">Start speaking when the assistant is ready.</p>
                                    <p className="mt-3 text-sm leading-6 text-[var(--ag-text-muted)]">
                                        Your voice transcript and the assistant response will appear here in a clean conversational log.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            transcript.map((entry, index) => (
                                <div key={index} className={`flex items-start gap-3 ${entry.speaker === 'user' ? 'justify-end' : ''}`}>
                                    <div
                                        className={`max-w-[85%] rounded-[1.4rem] px-4 py-3 text-sm leading-7 shadow-[0_18px_36px_rgba(18,34,26,0.08)] ${
                                            entry.speaker === 'user'
                                                ? 'rounded-br-md bg-gradient-to-r from-brand-green to-brand-green-dark text-white'
                                                : 'rounded-bl-md border border-[var(--ag-border)] bg-[var(--ag-surface-muted)] text-[var(--ag-text)]'
                                        }`}
                                    >
                                        <p className="whitespace-pre-wrap">{entry.text || '...'}</p>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </main>
                </div>
            </div>
        </div>
    );
};
