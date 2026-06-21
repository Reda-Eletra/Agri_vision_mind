import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { analyzeRealTimeFrame, analyzeGrowthFrame } from '../services/geminiService';
import type { LiveAnalysisResult, GrowthAnalysisResult } from '../types';
import { stopMediaStream } from '../services/cameraService';

const AlertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 animate-pulse"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12"/></svg>;
const RulerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/></svg>;

export const RealTimeMonitor: React.FC = () => {
    const { t, language } = useTranslation();
    const locale = language === 'ar' ? 'ar' : 'en';

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const timeoutRef = useRef<any>(null);
    const requestRef = useRef<number>(0);

    const [isCameraActive, setIsCameraActive] = useState(true);
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<LiveAnalysisResult | null>(null);
    const [growthResult, setGrowthResult] = useState<GrowthAnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [mode, setMode] = useState<'disease' | 'growth'>('disease');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Camera Start/Stop Handlers
    const startCamera = async () => {
        if (streamRef.current) {
            stopMediaStream(streamRef.current, videoRef.current);
            streamRef.current = null;
        }

        try {
            setErrorMsg(null);
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsMonitoring(true);
                setIsCameraActive(true);
            }
        } catch (err) {
            console.error("Camera Error", err);
            setErrorMsg(t('plantDoctor.cameraError'));
            setIsMonitoring(false);
            setIsCameraActive(false);
        }
    };

    const stopHardware = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
            requestRef.current = 0;
        }
        if (streamRef.current) {
            stopMediaStream(streamRef.current, videoRef.current);
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    const stopCameraAndAnalysis = () => {
        stopHardware();
        setIsMonitoring(false);
        setIsCameraActive(false);
        setIsAnalyzing(false);
        setAnalysisResult(null);
        setGrowthResult(null);
    };

    // Initialize/clean up camera on mount or activation
    useEffect(() => {
        if (isCameraActive) {
            startCamera();
        }
        return () => {
            stopHardware();
        };
    }, [isCameraActive, t]);

    // Analysis Loop
    useEffect(() => {
        if (!isCameraActive || !isMonitoring) return;

        const analyzeFrame = async () => {
            if (!videoRef.current || !canvasRef.current || isAnalyzing || !isMonitoring || !isCameraActive) return;

            const video = videoRef.current;
            if (video.readyState !== 4 || video.videoWidth === 0 || video.videoHeight === 0) return;

            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            const controller = new AbortController();
            abortControllerRef.current = controller;

            setIsAnalyzing(true);
            
            try {
                const canvas = canvasRef.current;
                const targetWidth = 320; 
                const scaleFactor = targetWidth / video.videoWidth;
                const targetHeight = video.videoHeight * scaleFactor;

                canvas.width = targetWidth;
                canvas.height = targetHeight;
                
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const base64 = canvas.toDataURL('image/jpeg', 0.6);
                    
                    if (base64 && base64.length > 100 && !controller.signal.aborted) {
                        if (mode === 'disease') {
                            const result = await analyzeRealTimeFrame(base64, controller.signal);
                            if (!controller.signal.aborted && abortControllerRef.current === controller) {
                                setAnalysisResult(result);
                                setGrowthResult(null);
                            }
                        } else {
                            const result = await analyzeGrowthFrame(base64);
                            if (!controller.signal.aborted && abortControllerRef.current === controller) {
                                setGrowthResult(result);
                                setAnalysisResult(null);
                            }
                        }
                    }
                }
            } catch (error: any) {
                if (error.name !== 'AbortError') {
                    console.error("Frame analysis error", error);
                }
            } finally {
                if (!controller.signal.aborted && abortControllerRef.current === controller) {
                    timeoutRef.current = setTimeout(() => {
                        if (abortControllerRef.current === controller) {
                            setIsAnalyzing(false);
                        }
                    }, 3000);
                } else {
                    setIsAnalyzing(false);
                }
            }
        };

        const loop = () => {
            if (!isAnalyzing && isCameraActive && isMonitoring) {
                analyzeFrame();
            }
            if (isCameraActive && isMonitoring) {
                requestRef.current = requestAnimationFrame(loop);
            }
        };
        
        requestRef.current = requestAnimationFrame(loop);
        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [isMonitoring, isAnalyzing, mode, isCameraActive]);

    return (
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-[3/4] md:aspect-video shadow-2xl border-4 border-gray-800">
            {isCameraActive ? (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900/90 text-white p-6 text-center">
                    <div className="p-4 bg-gray-800 rounded-full mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-450"><path d="m22 8-6 4 6 4V8Z"></path><rect x="2" y="6" width="14" height="12" rx="2" ry="2"></rect><line x1="2" y1="2" x2="22" y2="22"></line></svg>
                    </div>
                    <h3 className="text-lg font-bold mb-2">
                        {locale === 'ar' ? 'تم إيقاف الكاميرا والتحليل' : 'Camera & Analysis Stopped'}
                    </h3>
                    <p className="text-sm text-gray-400 max-w-xs mb-6">
                        {locale === 'ar' ? 'تم إيقاف تشغيل الكاميرا وإلغاء جميع عمليات التحليل المباشرة بنجاح.' : 'Camera hardware has been released and all pending analysis requests are canceled.'}
                    </p>
                    <button 
                        onClick={() => setIsCameraActive(true)}
                        className="px-6 py-2.5 bg-brand-green text-white font-bold rounded-xl hover:bg-brand-green-dark transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        <span>{t('plantDoctor.liveMonitor.startAnalysis')}</span>
                    </button>
                </div>
            )}
            
            <canvas ref={canvasRef} className="hidden" />
            
            {/* HUD Overlay */}
            {isCameraActive && (
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
                    <div className="flex justify-between items-start pointer-events-auto">
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setMode('disease')}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${mode === 'disease' ? 'bg-red-500 text-white' : 'bg-black/50 text-gray-300'}`}
                            >
                                {t('plantDoctor.liveMonitor.modeDisease')}
                            </button>
                            <button 
                                onClick={() => setMode('growth')}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${mode === 'growth' ? 'bg-blue-500 text-white' : 'bg-black/50 text-gray-300'}`}
                            >
                                {t('plantDoctor.liveMonitor.modeGrowth')}
                            </button>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <div className="bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-lg border border-white/10">
                                <p className={`font-bold ${isAnalyzing ? 'text-yellow-400' : 'text-green-400'}`}>
                                    {isAnalyzing ? t('plantDoctor.liveMonitor.scanning') : t('plantDoctor.liveMonitor.active')}
                                </p>
                            </div>
                            <button 
                                onClick={stopCameraAndAnalysis}
                                className="px-3 py-2 bg-red-600/90 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors border border-red-500/20 cursor-pointer shadow-md"
                            >
                                {t('plantDoctor.liveMonitor.stopAnalysis')}
                            </button>
                        </div>
                    </div>

                    {/* Analysis Box */}
                    {mode === 'disease' && analysisResult && (
                        !analysisResult.isPlantDetected ? (
                            <div className="bg-black/70 backdrop-blur-md border-l-4 border-yellow-500 p-4 rounded-r-lg max-w-sm transition-all duration-300 animate-slide-in-up pointer-events-auto">
                                <div className="flex items-center gap-3 mb-1">
                                    <AlertIcon />
                                    <h3 className="font-bold text-lg text-yellow-400">
                                        {t('plantDoctor.liveMonitor.noPlantTitle')}
                                    </h3>
                                </div>
                                <p className="text-white text-xs leading-relaxed">
                                    {analysisResult.message || t('plantDoctor.liveMonitor.noPlantMessage')}
                                </p>
                            </div>
                        ) : (
                            <div className={`bg-black/70 backdrop-blur-md border-l-4 ${analysisResult.detected ? 'border-red-500' : 'border-green-500'} p-4 rounded-r-lg max-w-sm transition-all duration-300 animate-slide-in-up pointer-events-auto`}>
                                <div className="flex items-center gap-3 mb-1">
                                    {analysisResult.detected ? <AlertIcon /> : <CheckIcon />}
                                    <h3 className={`font-bold text-lg ${analysisResult.detected ? 'text-red-400' : 'text-green-400'}`}>
                                        {analysisResult.detected ? t('plantDoctor.liveMonitor.alert') : t('plantDoctor.liveMonitor.noIssues')}
                                    </h3>
                                </div>
                                {analysisResult.detected && (
                                    <>
                                        <p className="text-white font-medium mb-1 text-sm">{analysisResult.issues.join(', ')}</p>
                                        <p className="text-gray-300 text-xs italic">"{analysisResult.action}"</p>
                                    </>
                                )}
                            </div>
                        )
                    )}

                    {/* Growth AR Box */}
                    {mode === 'growth' && growthResult && (
                        <div className="bg-black/70 backdrop-blur-md border-l-4 border-blue-500 p-4 rounded-r-lg max-w-sm transition-all duration-300 animate-slide-in-up pointer-events-auto">
                            <div className="flex items-center gap-3 mb-2">
                                <RulerIcon />
                                <h3 className="font-bold text-lg text-blue-400">{t('plantDoctor.liveMonitor.growthHeight')}: {growthResult.estimatedHeight}</h3>
                            </div>
                            <p className="text-white text-sm mb-1"><strong>{t('plantDoctor.liveMonitor.growthStage')}:</strong> {growthResult.growthStage}</p>
                            <p className="text-gray-300 text-sm italic">"{growthResult.recommendation}"</p>
                        </div>
                    )}
                </div>
            )}
            
            {/* AR Overlays */}
            {isCameraActive && (mode === 'growth' ? (
                <div className="absolute inset-0 pointer-events-none">
                    {/* Ruler Grid Effect */}
                    <div className="absolute left-10 top-10 bottom-10 w-1 bg-white/50 flex flex-col justify-between">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="w-4 h-0.5 bg-white/80 -ml-2"></div>
                        ))}
                    </div>
                    {/* Center Box */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-blue-400/50 rounded-lg"></div>
                </div>
            ) : (
                /* Target Reticle for Disease */
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/30 rounded-lg pointer-events-none">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white"></div>
                </div>
            ))}
        </div>
    );
};
