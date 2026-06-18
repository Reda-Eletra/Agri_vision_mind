
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { diagnosePlant, analyzeSoil } from '../services/geminiService';
import type { PlantDiagnosis, HumanConsumptionAdvisory, SoilAnalysis, FarmCycle, CyclePlant } from '../types';
import { Spinner } from './Spinner';
import { LeafSpinner } from './LeafSpinner';
import { ResultCard } from './ResultCard';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { useConfig } from '../contexts/ConfigContext';
import { generateDiagnosisPdf } from '../services/pdfService';
import { PageHeader } from './PageHeader';
import { RealTimeMonitor } from './RealTimeMonitor';
import { cycleApi, cyclePlantApi, cycleTaskApi } from '../services/apiService';

// --- ICONS ---
const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-gray-400 group-hover:text-brand-green transition-colors"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>;
const VideoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-gray-400 group-hover:text-blue-500 transition-colors"><path d="m22 8-6 4 6 4V8Z"></path><rect x="2" y="6" width="14" height="12" rx="2" ry="2"></rect></svg>;
const LiveCameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-gray-400 group-hover:text-red-500 transition-colors"><path d="M21 12.1a2.8 2.8 0 0 1-3.6 3.6l-2.3-2.3a2.8 2.8 0 0 1 3.6-3.6Z"/><path d="M12 2.1a2.8 2.8 0 0 0 3.6 3.6l-2.3 2.3A2.8 2.8 0 0 0 9.7 4.4Z"/><path d="M11.9 22a2.8 2.8 0 0 1-3.6-3.6l2.3-2.3a2.8 2.8 0 0 1 3.6 3.6Z"/><path d="M2 11.9a2.8 2.8 0 0 0 3.6 3.6l2.3-2.3A2.8 2.8 0 0 0-3.6-3.6Z"/><circle cx="12" cy="12" r="10"/></svg>;
const StepUploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-brand-green-dark dark:text-brand-green-light"><path d="M11 20A7 7 0 0 1 4 13V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M15 4A7 7 0 0 1 22 11v10"></path><path d="M12 11a2 2 0 0 0 2 2h2a2 2 0 0 0 0-4h-2a2 2 0 0 1-2-2Z"></path></svg>;
const SeedlingIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a2.5 2.5 0 0 1 2.5 2.5c0 1.06-.5 2.03-1.25 2.5"/><path d="M12 2a2.5 2.5 0 0 0-2.5 2.5c0 1.06.5 2.03 1.25 2.5"/><path d="M12 12v10"/><path d="M7 12a5 5 0 0 0 5-5 5 5 0 0 0 5 5Z"/></svg>;
const ShoppingCartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
);
const WarningIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
);
const ShieldCheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        <path d="m9 12 2 2 4-4"></path>
    </svg>
);
const BiohazardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
      <circle cx="12" cy="12" r="10"/>
      <path d="M14.5 9.5c.34-.5.5-1.09.5-1.75a2.75 2.75 0 0 0-5.5 0c0 .66.16 1.25.5 1.75"/>
      <path d="M9.5 14.5c-.34.5-.5 1.09-.5 1.75a2.75 2.75 0 0 0 5.5 0c0-.66-.16-1.25-.5-1.75"/>
      <path d="m14.5 14.5-.33-1.16a.5.5 0 0 0-.94 0L12 14.5l-1.23-1.16a.5.5 0 0 0-.94 0L8.5 14.5"/>
      <path d="M9.5 9.5l.33 1.16a.5.5 0 0 0 .94 0L12 9.5l1.23 1.16a.5.5 0 0 0 .94 0L15.5 9.5"/>
    </svg>
);
const TrackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 me-2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 me-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const SoilIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22h10"/><path d="M2 22h10"/><path d="M12 2v20"/><path d="M12 18H7a5 5 0 0 1 0-10h5"/><path d="M12 14h3a5 5 0 0 0 0-10h-3"/></svg>;


const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<{ base64: string, mimeType: string, dataUrl: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result !== 'string') {
        return reject(new Error('Failed to read image file'));
      }
      const img = new Image();
      img.src = result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round(height * (maxWidth / width));
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round(width * (maxHeight / height));
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not get canvas context'));
        }
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, 0.9);
        const base64 = dataUrl.split(',')[1];
        if (!base64) {
          return reject(new Error('Failed to encode image to base64'));
        }
        resolve({ base64, mimeType, dataUrl });
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const extractFramesFromVideo = (file: File, frameCount: number = 6): Promise<{ base64: string, mimeType: string, dataUrl: string }[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = async () => {
      video.width = video.videoWidth;
      video.height = video.videoHeight;

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(video.src);
        return reject(new Error('Could not get canvas context'));
      }

      const duration = video.duration;
      const interval = duration / (frameCount + 1);
      const frames: { base64: string, mimeType: string, dataUrl: string }[] = [];
      
      const captureFrame = async (time: number) => {
        return new Promise<void>(resolveCapture => {
          video.currentTime = time;
          video.onseeked = () => {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const mimeType = 'image/jpeg';
            const dataUrl = canvas.toDataURL(mimeType, 0.9);
            const base64 = dataUrl.split(',')[1];
            if (base64) frames.push({ base64, mimeType, dataUrl });
            resolveCapture();
          };
        });
      };

      try {
        for (let i = 1; i <= frameCount; i++) {
          const time = i * interval;
          if (time < duration) {
            await captureFrame(time);
          }
        }
        URL.revokeObjectURL(video.src);
        resolve(frames);
      } catch (error) {
        URL.revokeObjectURL(video.src);
        reject(error);
      }
    };

    video.onerror = (err) => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video file.'));
    };
  });
};

const CameraView: React.FC<{
  onClose: () => void;
  onCapture: (file: File) => void;
}> = ({ onClose, onCapture }) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Camera access denied:", err);
        setError(t('plantDoctor.cameraError'));
      }
    };
    if (!capturedImage) {
        startCamera();
    }

    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [capturedImage, t]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(dataUrl);
      stream?.getTracks().forEach(track => track.stop()); // Stop stream after capture
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleUsePhoto = () => {
    if (capturedImage) {
      fetch(capturedImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
          onCapture(file);
          onClose();
        });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl relative">
            <button onClick={onClose} className="absolute top-2 right-2 z-10 p-2 rounded-full text-white bg-black/30 hover:bg-black/50">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div className="relative aspect-video bg-black rounded-md overflow-hidden">
                {error ? (
                    <div className="flex items-center justify-center h-full text-red-500 p-4 text-center">{error}</div>
                ) : capturedImage ? (
                    <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
                ) : (
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                )}
                <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="p-4 flex justify-center gap-4">
                {capturedImage ? (
                    <>
                        <button onClick={handleRetake} className="px-6 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors">Retake</button>
                        <button onClick={handleUsePhoto} className="px-6 py-2 bg-brand-green text-white font-semibold rounded-lg hover:bg-brand-green-dark transition-colors">Use Photo</button>
                    </>
                ) : (
                    <button onClick={handleCapture} disabled={!stream} className="w-16 h-16 bg-white rounded-full border-4 border-brand-green disabled:bg-gray-400 disabled:border-gray-500 ring-4 ring-brand-green/30"></button>
                )}
            </div>
        </div>
    </div>
  );
};

interface PlantDoctorProps {
  onTrackPlantSuccess?: () => void;
}

export const PlantDoctor: React.FC<PlantDoctorProps> = ({ onTrackPlantSuccess }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [imagesData, setImagesData] = useState<{ base64: string, mimeType: string, dataUrl: string }[]>([]);
  const [diagnosis, setDiagnosis] = useState<PlantDiagnosis | null>(null);
  const [soilResult, setSoilResult] = useState<SoilAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'soil' | 'live'>('upload');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const diagnosisSectionRef = useRef<HTMLElement>(null);
  const { t, language } = useTranslation();

  const processFiles = useCallback(async (newFiles: File[]) => {
    setDiagnosis(null);
    setSoilResult(null);
    setError(null);
    setIsProcessingFiles(true);

    const processingPromises = newFiles.map(file => {
      if (file.type.startsWith('image/')) {
        return resizeImage(file, 1024, 1024).then(data => [data]);
      } else if (file.type.startsWith('video/')) {
        return extractFramesFromVideo(file, 6);
      }
      return Promise.resolve([]);
    });

    try {
      const resolvedDataArrays = await Promise.all(processingPromises);
      const flattenedData = resolvedDataArrays.flat();

      setFiles(prev => [...prev, ...newFiles]);
      setImagesData(prev => [...prev, ...flattenedData]);
    } catch (err) {
      setError(t('plantDoctor.errorProcessingFile'));
      console.error(err);
    } finally {
      setIsProcessingFiles(false);
    }
  }, [t]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(Array.from(e.target.files));
    }
  };
  
  const handleDiagnose = useCallback(async () => {
    if (imagesData.length === 0) return;

    setLoading(true);
    setError(null);
    setDiagnosis(null);
    setSoilResult(null);

    try {
      if (activeTab === 'soil') {
        const result = await analyzeSoil(imagesData[0], language);
        setSoilResult(result);
      } else {
        const imagePayload = imagesData.map(({ base64, mimeType }) => ({ base64, mimeType }));
        const result = await diagnosePlant(imagePayload, language);
        setDiagnosis(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('plantDoctor.error'));
    } finally {
      setLoading(false);
    }
  }, [imagesData, activeTab, t, language]);

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImagesData(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const acceptedFiles = Array.from(e.dataTransfer.files).filter((file: File) => file.type.startsWith('image/') || file.type.startsWith('video/'));
      if (acceptedFiles.length > 0) {
          await processFiles(acceptedFiles);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleCaptureAndProcess = useCallback((file: File) => {
    processFiles([file]);
  }, [processFiles]);
  
  return (
    <div className="animate-fade-in pb-12">
        <PageHeader
            title={t('plantDoctor.pageTitle')}
            subtitle={t('plantDoctor.pageSubtitle')}
            imageUrl="/images/avm-3d/plant-doctor-upload.png"
        />
        
        <div className="mt-[-4rem] relative z-10 px-4">
            
            {/* --- Visual Steps Section --- */}
            <div className="max-w-5xl mx-auto mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="ui-card p-5 text-center">
                     <div className="mb-4 h-40 rounded-xl overflow-hidden">
                        <img src="/images/avm-3d/plant-doctor-upload.png" alt="Step 1" className="w-full h-full object-cover" />
                     </div>
                     <h3 className="text-xl font-extrabold tracking-[-0.03em] text-[var(--ag-text)] mb-2">{t('plantDoctor.steps.step1')}</h3>
                     <p className="text-sm leading-6 text-[var(--ag-text-muted)]">Upload a clear leaf or crop image from the field.</p>
                </div>
                <div className="ui-card p-5 text-center">
                     <div className="mb-4 h-40 rounded-xl overflow-hidden">
                         <img src="/images/avm-3d/auth-farm-ai.png" alt="Step 2" className="w-full h-full object-cover" />
                     </div>
                     <h3 className="text-xl font-extrabold tracking-[-0.03em] text-[var(--ag-text)] mb-2">{t('plantDoctor.steps.step2')}</h3>
                     <p className="text-sm leading-6 text-[var(--ag-text-muted)]">The model checks symptoms, severity, and likely causes.</p>
                </div>
                <div className="ui-card p-5 text-center">
                     <div className="mb-4 h-40 rounded-xl overflow-hidden">
                         <img src="/images/avm-3d/disease-leaf-early-blight.png" alt="Step 3" className="w-full h-full object-cover" />
                     </div>
                     <h3 className="text-xl font-extrabold tracking-[-0.03em] text-[var(--ag-text)] mb-2">{t('plantDoctor.steps.step3')}</h3>
                     <p className="text-sm leading-6 text-[var(--ag-text-muted)]">Get a short report, treatment, prevention, and follow-up guidance.</p>
                </div>
            </div>


        <section ref={diagnosisSectionRef} className="ui-card ui-surface rounded-[2rem] p-6 md:p-10 max-w-5xl mx-auto">
            
            {/* Mode Switcher */}
            <div className="flex justify-center mb-8">
                <div className="ui-pill-toggle overflow-x-auto scrollbar-hide max-w-full">
                    <button 
                        onClick={() => {setActiveTab('upload'); setImagesData([]); setDiagnosis(null); setSoilResult(null);}}
                        className={`${activeTab === 'upload' ? 'is-active' : ''} whitespace-nowrap`}
                    >
                        {t('plantDoctor.mode.upload')}
                    </button>
                    <button 
                        onClick={() => {setActiveTab('soil'); setImagesData([]); setDiagnosis(null); setSoilResult(null);}}
                        className={`${activeTab === 'soil' ? 'is-active' : ''} whitespace-nowrap`}
                    >
                        {t('plantDoctor.mode.soil')}
                    </button>
                    <button 
                        onClick={() => setActiveTab('live')}
                        className={`${activeTab === 'live' ? 'is-active' : ''} whitespace-nowrap`}
                    >
                        {t('plantDoctor.mode.live')}
                    </button>
                </div>
            </div>

            {activeTab === 'upload' || activeTab === 'soil' ? (
                <>
                    <h2 className="text-2xl md:text-4xl font-extrabold tracking-[-0.04em] text-[var(--ag-text)] text-center mb-2">
                        {activeTab === 'soil' ? t('plantDoctor.soilAnalyzer.title') : t('plantDoctor.rapidDiagnosis.title')}
                    </h2>
                    <p className="text-center text-[var(--ag-text-muted)] mb-8 max-w-2xl mx-auto leading-7">
                        {activeTab === 'soil' ? t('plantDoctor.soilAnalyzer.subtitle') : t('plantDoctor.rapidDiagnosis.subtitle')}
                    </p>

                    <div 
                    className="w-full rounded-[2rem] border-2 border-dashed border-[var(--ag-border-strong)] bg-[var(--ag-surface-muted)] p-6 md:p-10 text-center transition-all duration-300 hover:border-brand-green hover:bg-brand-green/5 group cursor-pointer relative overflow-hidden"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={imagesData.length === 0 ? handleUploadButtonClick : undefined}
                    >
                        {imagesData.length > 0 ? (
                        <div className="relative z-10">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
                            {imagesData.map((img, index) => (
                                <div key={index} className="relative group/img overflow-hidden rounded-[1.1rem] shadow-md border border-[var(--ag-border)]">
                                <img src={img.dataUrl} alt={`Preview ${index + 1}`} className="w-full h-32 object-cover transition-transform duration-500 group-hover/img:scale-110" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleRemoveImage(index); }}
                                        className="rounded-full bg-red-500/90 p-2 text-white transition-colors hover:bg-red-600"
                                        aria-label="Remove image"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                </div>
                                </div>
                            ))}
                            </div>
                            {activeTab !== 'soil' && (
                                <button onClick={(e) => {e.stopPropagation(); handleUploadButtonClick()}} className="ui-button ui-button-secondary">
                                    <StepUploadIcon /> {t('plantDoctor.addMorePhotos')}
                                </button>
                            )}
                        </div>
                        ) : (
                        <div className="flex flex-col items-center justify-center gap-6 py-8 relative z-10">
                            <div className="flex flex-wrap items-center justify-center gap-4">
                                <div className="flex flex-col items-center gap-2 group cursor-pointer p-4 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                                        <div className="p-4 bg-green-100 dark:bg-green-900/40 rounded-full shadow-sm group-hover:scale-110 transition-transform duration-300">
                                            <CameraIcon />
                                        </div>
                                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Photo</span>
                                </div>
                                    {activeTab === 'upload' && (
                                        <div className="flex flex-col items-center gap-2 group cursor-pointer p-4 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                            <div className="p-4 bg-blue-100 dark:bg-blue-900/40 rounded-full shadow-sm group-hover:scale-110 transition-transform duration-300 delay-75">
                                                <VideoIcon />
                                            </div>
                                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Video</span>
                                        </div>
                                    )}
                                    <button 
                                    onClick={(e) => {e.stopPropagation(); setIsCameraOpen(true)}} 
                                    className="flex flex-col items-center gap-2 group cursor-pointer p-4 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        <div className="p-4 bg-red-100 dark:bg-red-900/40 rounded-full shadow-sm group-hover:scale-110 transition-transform duration-300 delay-100">
                                            <LiveCameraIcon />
                                        </div>
                                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Live Cam</span>
                                </button>
                            </div>
                            <div className="space-y-2">
                                <p className="text-xl font-extrabold tracking-[-0.03em] text-[var(--ag-text)]">{t('plantDoctor.uploadArea.prompt')}</p>
                                <p className="text-sm text-[var(--ag-text-muted)]">{t('plantDoctor.fileTypes')}</p>
                                <div className="flex flex-wrap justify-center gap-2 pt-2">
                                    <span className="ui-chip ui-chip-forest">PNG</span>
                                    <span className="ui-chip ui-chip-forest">JPG</span>
                                    <span className="ui-chip ui-chip-blue">MP4</span>
                                </div>
                            </div>
                        </div>
                        )}
                        {isProcessingFiles && <div className="mt-6"><Spinner small={true} /></div>}
                    </div>

                    <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,video/*" 
                    multiple={activeTab === 'upload'}
                    onChange={handleFileChange} 
                    />
                    <div className="flex justify-center mt-10">
                        <button
                            onClick={handleDiagnose}
                            disabled={imagesData.length === 0 || loading || isProcessingFiles}
                            className={`ui-button text-lg !px-8 !py-4 ${activeTab === 'soil' ? 'ui-button-secondary border-[rgba(183,132,46,0.2)] bg-[var(--ag-amber-soft)] !text-[var(--ag-amber)]' : 'ui-button-primary'} disabled:cursor-not-allowed`}
                        >
                            {loading ? <LeafSpinner /> : (activeTab === 'soil' ? t('plantDoctor.soilAnalyzer.analyzeButton') : t('plantDoctor.analyzeButton'))}
                        </button>
                    </div>
                </>
            ) : (
                <RealTimeMonitor />
            )}
            
        </section>

        {/* --- Result Section --- */}
        <div className="flex justify-center mt-8 max-w-5xl mx-auto px-4">
            {error && <p className="w-full rounded-[1.4rem] border border-[rgba(185,77,67,0.18)] bg-[var(--ag-red-soft)] p-4 text-center text-sm font-semibold text-[var(--ag-red)] animate-fade-in">{error}</p>}
            {diagnosis && activeTab === 'upload' && <DiagnosisResult diagnosis={diagnosis} image={imagesData[0]?.dataUrl!} onTrackPlantSuccess={onTrackPlantSuccess} />}
            {soilResult && activeTab === 'soil' && <SoilAnalysisResult result={soilResult} image={imagesData[0]?.dataUrl!} />}
            {error && imagesData.length > 0 && !loading ? (
                <div className="mt-4 flex w-full justify-center">
                    <button onClick={handleDiagnose} className="ui-button ui-button-secondary">
                        {t('plantDoctor.analyzeButton')}
                    </button>
                </div>
            ) : null}
        </div>
        </div>
        {isCameraOpen && <CameraView onClose={() => setIsCameraOpen(false)} onCapture={handleCaptureAndProcess} />}
    </div>
  );
};

// ... existing sub-components (HealthMeter, GrowthStageInfo, etc.) ...

const HealthMeter: React.FC<{ percentage: number }> = React.memo(({ percentage }) => {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);

  React.useEffect(() => {
    const progressOffset = circumference - (percentage / 100) * circumference;
    const timer = setTimeout(() => setOffset(progressOffset), 100);
    return () => clearTimeout(timer);
  }, [percentage, circumference]);

  let colorClass = 'stroke-green-500';
  if (percentage < 75) colorClass = 'stroke-yellow-500';
  if (percentage < 40) colorClass = 'stroke-red-500';

  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      <svg className="w-full h-full" viewBox="0 0 120 120">
        <circle className="text-gray-200 dark:text-gray-700" strokeWidth="10" stroke="currentColor" fill="transparent" r={radius} cx="60" cy="60" />
        <circle
          className={`${colorClass} transition-all duration-1000 ease-out`}
          style={{ strokeDashoffset: offset }}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx="60"
          cy="60"
          transform="rotate(-90 60 60)"
        />
      </svg>
      <span className="absolute text-2xl font-bold text-gray-700 dark:text-gray-200">{percentage}%</span>
    </div>
  );
});


const GrowthStageInfo: React.FC<{ stage: string; reasoning: string }> = React.memo(({ stage, reasoning }) => {
    const { t } = useTranslation();
    return (
        <div className="rounded-[1.25rem] border border-[rgba(53,112,180,0.18)] bg-[var(--ag-blue-soft)] p-4 shadow-sm">
            <div className="flex items-center gap-3">
                <div className="flex-shrink-0 text-[var(--ag-blue)]">
                    <SeedlingIcon />
                </div>
                <div>
                    <h3 className="font-semibold text-[var(--ag-blue)]">{t('plantDoctor.growthStageTitle')}</h3>
                    <p className="font-bold text-lg text-[var(--ag-text)]">{stage}</p>
                </div>
            </div>
            <p className="text-sm italic text-[var(--ag-text-muted)] mt-2">{reasoning}</p>
        </div>
    );
});

const HumanConsumptionAdvisoryComponent: React.FC<{ advisory: HumanConsumptionAdvisory }> = React.memo(({ advisory }) => {
    const { t } = useTranslation();
    
    const statusStyles = {
        safe: {
            container: "bg-green-50 dark:bg-green-900/20 border-green-400",
            icon: <ShieldCheckIcon />,
            iconColor: "text-green-500",
            titleColor: "text-green-800 dark:text-green-300",
        },
        caution: {
            container: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400",
            icon: <WarningIcon />,
            iconColor: "text-yellow-500",
            titleColor: "text-yellow-800 dark:text-yellow-300",
        },
        toxic: {
            container: "bg-red-50 dark:bg-red-900/20 border-red-400",
            icon: <BiohazardIcon />,
            iconColor: "text-red-500",
            titleColor: "text-red-800 dark:text-red-300",
        },
        unknown: {
            container: "bg-gray-100 dark:bg-gray-700/50 border-gray-400",
            icon: <WarningIcon />,
            iconColor: "text-gray-500",
            titleColor: "text-gray-800 dark:text-gray-300",
        }
    };

    const styles = statusStyles[advisory.safetyStatus] || statusStyles.unknown;

    return (
        <div className={`p-4 rounded-[1.25rem] border shadow-sm ${styles.container}`}>
            <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 mt-1 ${styles.iconColor}`}>
                    {styles.icon}
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-lg">{t('plantDoctor.consumptionAdvisory.mainTitle')}</h3>
                    <p className={`font-semibold ${styles.titleColor}`}>{advisory.title}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{advisory.summary}</p>
                </div>
            </div>
            {(advisory.symptoms?.length || advisory.severity || advisory.whatToDo) && (
                 <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600 space-y-3">
                    {advisory.symptoms && advisory.symptoms.length > 0 && (
                        <div>
                             <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200">{t('plantDoctor.consumptionAdvisory.symptomsTitle')}</h4>
                             <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1 mt-1">
                                {advisory.symptoms.map((symptom, i) => <li key={i}>{symptom}</li>)}
                            </ul>
                        </div>
                    )}
                    {advisory.severity && (
                         <div>
                             <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200">{t('plantDoctor.consumptionAdvisory.severityTitle')}</h4>
                             <p className="text-sm text-gray-600 dark:text-gray-400">{advisory.severity}</p>
                         </div>
                    )}
                    {advisory.whatToDo && (
                        <div>
                            <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200">{t('plantDoctor.consumptionAdvisory.whatToDoTitle')}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{advisory.whatToDo}</p>
                        </div>
                    )}
                 </div>
            )}
        </div>
    );
});


interface DiagnosisResultProps {
  diagnosis: PlantDiagnosis;
  image: string;
  onTrackPlantSuccess?: () => void;
}

const DiagnosisResult: React.FC<DiagnosisResultProps> = React.memo(({ diagnosis, image, onTrackPlantSuccess }) => {
  const { farms, isLoggedIn, addDiagnosisToHistory } = useAuth();
  const { t, language } = useTranslation();
  const { isDarkMode } = useConfig();
  const [isAdded, setIsAdded] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [cycleMap, setCycleMap] = useState<Record<string, FarmCycle[]>>({});
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [savedCyclePlant, setSavedCyclePlant] = useState<CyclePlant | null>(null);
  const [tasksAdded, setTasksAdded] = useState(false);
  const [isCreatingTasks, setIsCreatingTasks] = useState(false);
  const diagnosisSavedRef = useRef(false);

  useEffect(() => {
    if (isLoggedIn && diagnosis && !diagnosisSavedRef.current) {
        addDiagnosisToHistory({
            plantName: diagnosis.plantName,
            image: image,
            diagnosis: diagnosis,
        });
        diagnosisSavedRef.current = true; // Prevents saving multiple times on re-render
    }
  }, [diagnosis, image, isLoggedIn, addDiagnosisToHistory]);

  useEffect(() => {
    if (!isLoggedIn || farms.length === 0) return;
    let cancelled = false;
    const loadCycles = async () => {
      const entries = await Promise.all(
        farms.map(async (farm) => {
          try {
            return [farm.id, await cycleApi.getAll(farm.id)] as const;
          } catch {
            return [farm.id, []] as const;
          }
        }),
      );
      if (cancelled) return;
      const nextMap = Object.fromEntries(entries);
      setCycleMap(nextMap);
      const firstFarmWithCycle = farms.find((farm) => (nextMap[farm.id] || []).length > 0);
      if (firstFarmWithCycle) {
        setSelectedFarmId((current) => current || firstFarmWithCycle.id);
        setSelectedCycleId((current) => current || nextMap[firstFarmWithCycle.id][0]?.id || '');
      }
    };
    void loadCycles();
    return () => {
      cancelled = true;
    };
  }, [farms, isLoggedIn]);

  const selectedFarmCycles = selectedFarmId ? cycleMap[selectedFarmId] || [] : [];

  const handleTrackPlant = async () => {
    if (!isLoggedIn) {
      alert(t('plantDoctor.loginToTrack'));
      return;
    }
    if (!selectedCycleId) {
      setTrackError(language === 'ar' ? 'اختر مزرعة ودورة زراعية أولا.' : 'Choose a farm and crop cycle first.');
      return;
    }
    if (isAdded || isTracking) {
      return;
    }

    setTrackError(null);
    setIsTracking(true);

    try {
      const saved = await cyclePlantApi.createFromDiagnosis(selectedCycleId, {
        user_defined_name: diagnosis.plantName,
        species_name: diagnosis.plantName,
        image_url: image,
        diagnosis: diagnosis,
        recovery_progress_percent: diagnosis.healthPercentage,
      });
      setSavedCyclePlant(saved.plant);
      setIsAdded(true);
      onTrackPlantSuccess?.();
    } catch (err) {
      setTrackError(err instanceof Error ? err.message : t('plantDoctor.error'));
    } finally {
      setIsTracking(false);
    }
  };

  const handleCreateTreatmentTasks = async () => {
    if (!savedCyclePlant || !selectedCycleId || tasksAdded) return;
    const treatment = diagnosis.treatment?.filter(Boolean) || [];
    const products = diagnosis.recommendedProducts?.filter(Boolean) || [];
    if (treatment.length === 0 && products.length === 0) {
      setTrackError(language === 'ar' ? 'لا توجد خطوات علاج لإضافتها كمهام.' : 'No treatment steps are available to add as tasks.');
      return;
    }
    const approved = confirm(
      language === 'ar'
        ? 'هل تريد إضافة خطة العلاج المقترحة إلى مهام هذه الدورة؟'
        : 'Add the suggested treatment plan to this cycle tasks?'
    );
    if (!approved) return;

    setIsCreatingTasks(true);
    setTrackError(null);
    try {
      const today = new Date();
      const due = (offset: number) => {
        const date = new Date(today);
        date.setDate(date.getDate() + offset);
        return date.toISOString().split('T')[0];
      };
      const treatmentTasks = treatment.slice(0, 3).map((step, index) => ({
        task_name: `${step} - Source: Plant Doctor Diagnosis`,
        task_type: 'spraying',
        date: due(index),
      }));
      const productTasks = products.slice(0, 2).map((product, index) => ({
        task_name: `Check Store product: ${product.productName} - Source: Plant Doctor Diagnosis`,
        task_type: 'other',
        date: due(index + 1),
      }));
      await Promise.all([...treatmentTasks, ...productTasks].map((task) => cycleTaskApi.create(selectedCycleId, task)));
      setTasksAdded(true);
    } catch (err) {
      setTrackError(err instanceof Error ? err.message : t('plantDoctor.error'));
    } finally {
      setIsCreatingTasks(false);
    }
  };
  
  const handleDownloadReport = () => {
    generateDiagnosisPdf(diagnosis, image, t, language, isDarkMode);
  };

  const handleBuy = (productName: string) => {
      window.open(`https://www.amazon.com/s?k=${encodeURIComponent(productName)}`, '_blank');
  };

  const renderCycleSavePanel = () => (
    <div className="mt-6 rounded-[1.35rem] border border-[var(--ag-border)] bg-[var(--ag-surface-muted)] p-4 text-start">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-[var(--ag-text)]">
            {language === 'ar' ? 'حفظ التشخيص في النباتات المتبعة' : 'Save diagnosis to tracked plants'}
          </h3>
          <p className="mt-1 text-sm text-[var(--ag-text-muted)]">
            {language === 'ar'
              ? 'اختر المزرعة والسيكل، وسيتم حفظ النبات بنفس نتيجة Plant Doctor.'
              : 'Choose a farm and cycle, then save this Plant Doctor result without re-scanning.'}
          </p>
        </div>
        {isAdded ? <span className="ui-chip ui-chip-forest">{language === 'ar' ? 'تم الحفظ' : 'Saved'}</span> : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ag-text-soft)]">
            {language === 'ar' ? 'المزرعة' : 'Farm'}
          </span>
          <select
            value={selectedFarmId}
            onChange={(event) => {
              const farmId = event.target.value;
              setSelectedFarmId(farmId);
              setSelectedCycleId((cycleMap[farmId] || [])[0]?.id || '');
              setIsAdded(false);
              setSavedCyclePlant(null);
              setTasksAdded(false);
            }}
            className="ui-input"
          >
            <option value="">{language === 'ar' ? 'اختر مزرعة' : 'Select farm'}</option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>{farm.name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ag-text-soft)]">
            {language === 'ar' ? 'السيكل' : 'Cycle'}
          </span>
          <select
            value={selectedCycleId}
            onChange={(event) => {
              setSelectedCycleId(event.target.value);
              setIsAdded(false);
              setSavedCyclePlant(null);
              setTasksAdded(false);
            }}
            disabled={!selectedFarmId || selectedFarmCycles.length === 0}
            className="ui-input"
          >
            <option value="">{selectedFarmCycles.length ? (language === 'ar' ? 'اختر سيكل' : 'Select cycle') : (language === 'ar' ? 'لا توجد دورات' : 'No cycles found')}</option>
            {selectedFarmCycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>{cycle.crop} - {cycle.season}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={handleTrackPlant}
          disabled={isAdded || isTracking || !selectedCycleId}
          className={`ui-button flex-1 !rounded-[1rem] ${isAdded || isTracking ? 'ui-button-secondary opacity-70 cursor-not-allowed' : 'ui-button-primary'}`}
        >
          <TrackIcon /> {isAdded ? (language === 'ar' ? 'محفوظ في Tracked Plants' : 'Saved to Tracked Plants') : isTracking ? t('plantDoctor.trackingInProgress') : (language === 'ar' ? 'احفظ في Tracked Plants' : 'Save to Tracked Plants')}
        </button>
        <button
          onClick={handleCreateTreatmentTasks}
          disabled={!savedCyclePlant || tasksAdded || isCreatingTasks}
          className="ui-button ui-button-secondary flex-1 !rounded-[1rem]"
        >
          <ShoppingCartIcon /> {tasksAdded ? (language === 'ar' ? 'تمت إضافة مهام العلاج' : 'Treatment tasks added') : isCreatingTasks ? (language === 'ar' ? 'جاري الإضافة...' : 'Adding tasks...') : (language === 'ar' ? 'إضافة خطة العلاج للمهام' : 'Add treatment plan to tasks')}
        </button>
      </div>
      {trackError ? <p className="mt-3 text-center text-sm text-[var(--ag-red)] animate-fade-in">{trackError}</p> : null}
      {farms.length > 0 && Object.values(cycleMap).every((cycles) => cycles.length === 0) ? (
        <p className="mt-3 text-center text-xs font-semibold text-[var(--ag-amber)]">
          {language === 'ar' ? 'أنشئ سيكل داخل المزرعة أولا حتى تحفظ التشخيص عليه.' : 'Create a crop cycle first before saving a diagnosis to tracked plants.'}
        </p>
      ) : null}
    </div>
  );

  if (diagnosis.isHealthy) {
    return (
      <ResultCard title={t('plantDoctor.resultTitle')}>
        <div className="text-center p-4 flex flex-col items-center">
           <p className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            {t('plantDoctor.identifiedPlant')}: <span className="text-brand-green-dark dark:text-brand-green-light">{diagnosis.plantName}</span>
          </p>
          <HealthMeter percentage={diagnosis.healthPercentage} />
          <div className="my-4 w-full">
            <GrowthStageInfo stage={diagnosis.growthStage} reasoning={diagnosis.growthStageReasoning} />
          </div>
          {diagnosis.humanConsumptionAdvisory && (
            <div className="my-4 w-full text-start">
                <HumanConsumptionAdvisoryComponent advisory={diagnosis.humanConsumptionAdvisory} />
            </div>
          )}
          <div className="rounded-[1.25rem] bg-[var(--ag-success-soft)] p-4 w-full text-start">
            <p className="text-lg font-semibold text-brand-green-dark dark:text-brand-green-light">{t('plantDoctor.healthyMessage')}</p>
            <p className="text-[var(--ag-text-muted)]">{t('plantDoctor.healthySubMessage')}</p>
            {diagnosis.visualCues && (
              <div className="mt-2 pt-2 border-t border-[rgba(47,138,87,0.16)]">
                <p className="text-sm text-[var(--ag-text)]"><strong className="font-semibold">{t('plantDoctor.visualCues')}:</strong> {diagnosis.visualCues}</p>
              </div>
            )}
          </div>
          <div className="w-full">
            {renderCycleSavePanel()}
          </div>
          <button
            onClick={handleDownloadReport}
            className="ui-button ui-button-secondary mt-4 w-full !rounded-[1rem]"
          >
             <DownloadIcon /> {t('plantDoctor.downloadReport')}
          </button>
        </div>
      </ResultCard>
    );
  }

  return (
    <ResultCard title={t('plantDoctor.resultTitle')}>
       <div className="text-center mb-4">
        <p className="text-xl font-bold text-gray-800 dark:text-gray-200">
          {t('plantDoctor.identifiedPlant')}: <span className="text-brand-green-dark dark:text-brand-green-light">{diagnosis.plantName}</span>
        </p>
      </div>
      <div className="flex flex-col md:flex-row items-center gap-6 mb-4">
          <div className="flex-shrink-0">
              <HealthMeter percentage={diagnosis.healthPercentage} />
              <p className="text-center font-semibold mt-2 text-gray-600 dark:text-gray-300">{t('plantDoctor.healthScore')}</p>
          </div>
          <div className="p-4 bg-[var(--ag-red-soft)] border border-[rgba(185,77,67,0.18)] rounded-[1.25rem] flex-grow w-full">
            <h3 className="font-semibold text-[var(--ag-red)]">{t('plantDoctor.identifiedIssue')}</h3>
            <p className="font-bold text-2xl text-[var(--ag-red)] mt-1">
                {diagnosis.diseaseName || 'Unknown Disease'}
            </p>
            <p className="text-sm text-[var(--ag-text-muted)] mt-1">
                {(diagnosis.confidenceScore * 100).toFixed(0)}% {t('plantDoctor.confidence')}
            </p>
          </div>
      </div>
       <div className="mb-4">
          <GrowthStageInfo stage={diagnosis.growthStage} reasoning={diagnosis.growthStageReasoning} />
      </div>
      {diagnosis.humanConsumptionAdvisory && (
        <div className="mb-4">
            <HumanConsumptionAdvisoryComponent advisory={diagnosis.humanConsumptionAdvisory} />
        </div>
      )}
      <div className="space-y-6 text-start">
        <div className="bg-[var(--ag-surface-muted)] p-4 rounded-[1.2rem]">
          <h3 className="font-semibold text-brand-green-dark dark:text-brand-green-light mb-2">{t('plantDoctor.visualCuesFromImage')}</h3>
          <p className="text-[var(--ag-text-muted)] text-base italic">"{diagnosis.visualCues}"</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-brand-green-dark dark:text-brand-green-light mb-2">{t('plantDoctor.symptoms')}</h3>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 text-base space-y-1">
                {diagnosis.symptoms?.map((symptom, i) => <li key={i}>{symptom}</li>)}
              </ul>
            </div>
             <div>
              <h3 className="font-semibold text-brand-green-dark dark:text-brand-green-light mb-2">{t('plantDoctor.cause')}</h3>
              <p className="text-gray-700 dark:text-gray-300 text-base">{diagnosis.cause}</p>
            </div>
        </div>
         <div>
          <h3 className="font-semibold text-brand-green-dark dark:text-brand-green-light mb-2">{t('plantDoctor.treatment')}</h3>
          <div className="rounded-[1.2rem] bg-[var(--ag-success-soft)] p-4">
              <ol className="list-decimal list-inside text-[var(--ag-text)] text-base space-y-1">
                {diagnosis.treatment?.map((step, i) => <li key={i}>{step}</li>)}
              </ol>
          </div>
        </div>
        
        {/* Recommended Products - SHOP THE CURE */}
        <div>
            <h3 className="font-semibold text-brand-green-dark dark:text-brand-green-light flex items-center gap-2 mb-2">
                <ShoppingCartIcon />
                {t('plantDoctor.recommendedProducts')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {diagnosis.recommendedProducts?.map((product, i) => (
                    <div key={i} className="ui-card ui-card-hover p-4 rounded-[1.2rem]">
                        <div className="flex justify-between items-start mb-2">
                            <p className="font-bold text-[var(--ag-text)] text-sm">{product.productName}</p>
                            <span className="ui-chip ui-chip-blue">{product.type}</span>
                        </div>
                        <p className="text-xs text-[var(--ag-text-muted)] mb-3 line-clamp-2">{product.description}</p>
                        <button 
                            onClick={() => handleBuy(product.productName)}
                            className="ui-button ui-button-primary w-full !min-h-[2.5rem] !rounded-[1rem] !text-xs"
                        >
                            {t('agriStore.buyNow')}
                        </button>
                    </div>
                ))}
            </div>
        </div>

        <div>
          <h3 className="font-semibold text-brand-green-dark dark:text-brand-green-light mb-2">{t('plantDoctor.prevention')}</h3>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 text-base space-y-1">
            {diagnosis.prevention?.map((tip, i) => <li key={i}>{tip}</li>)}
          </ul>
        </div>
        {diagnosis.secondaryDiagnosis && (
            <div className="rounded-[1.25rem] border border-[rgba(183,132,46,0.18)] bg-[var(--ag-amber-soft)] p-4">
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">{t('plantDoctor.secondaryDiagnosis')}</h3>
                <p className="text-sm text-yellow-900 dark:text-yellow-100"><span className="font-bold">{diagnosis.secondaryDiagnosis.diseaseName}</span> - {(diagnosis.secondaryDiagnosis.confidenceScore * 100).toFixed(0)}% {t('plantDoctor.confidence')}</p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">{diagnosis.secondaryDiagnosis.reasoning}</p>
            </div>
        )}
        {renderCycleSavePanel()}
        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
                onClick={handleDownloadReport}
                className="ui-button ui-button-secondary flex-1 !rounded-[1rem]"
            >
               <DownloadIcon /> {t('plantDoctor.downloadReport')}
            </button>
        </div>
         {isAdded && <p className="text-center text-sm text-green-600 dark:text-green-400 animate-fade-in">{t('plantDoctor.plantTrackedSuccess')}</p>}
         <p className="text-center text-xs text-gray-500 dark:text-gray-400">{t('plantDoctor.trackAndDownloadDescription')}</p>
      </div>
    </ResultCard>
  );
});


const SoilAnalysisResult: React.FC<{ result: SoilAnalysis, image: string }> = React.memo(({ result, image }) => {
    const { t } = useTranslation();
    
    return (
        <ResultCard title={t('plantDoctor.soilAnalyzer.resultTitle')}>
            <div className="text-center mb-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <img src={image} alt="Soil sample" className="w-32 h-32 object-cover rounded-2xl shadow-md border-2 border-amber-100" />
                    <div className="text-start flex-1">
                        <div className="ui-chip ui-chip-amber mb-2">
                            <SoilIcon /> Experimental Feature
                        </div>
                        <h3 className="text-2xl font-bold text-[var(--ag-text)]">{result.soilType}</h3>
                        <p className="text-[var(--ag-text-muted)] text-sm">AI confidence: {(result.confidenceScore * 100).toFixed(0)}%</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-[var(--ag-amber-soft)] rounded-[1.2rem] border border-[rgba(183,132,46,0.18)]">
                    <h4 className="text-amber-800 dark:text-amber-200 font-bold text-sm mb-1 uppercase tracking-tight">{t('plantDoctor.soilAnalyzer.dryness')}</h4>
                    <p className="text-[var(--ag-text)] font-semibold">{result.drynessLevel}</p>
                </div>
                <div className="p-4 bg-[var(--ag-success-soft)] rounded-[1.2rem] border border-[rgba(47,138,87,0.18)]">
                    <h4 className="text-emerald-800 dark:text-emerald-200 font-bold text-sm mb-1 uppercase tracking-tight">{t('plantDoctor.soilAnalyzer.type')}</h4>
                    <p className="text-[var(--ag-text)] font-semibold">{result.soilType}</p>
                </div>
            </div>

            <div className="space-y-6 text-start">
                 <div>
                    <h4 className="font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-amber-500 rounded-full"></span>
                        {t('plantDoctor.soilAnalyzer.composition')}
                    </h4>
                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{result.composition}</p>
                </div>

                <div>
                    <h4 className="font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-red-500 rounded-full"></span>
                        {t('plantDoctor.soilAnalyzer.issues')}
                    </h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {result.potentialIssues.map((issue, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-[var(--ag-text-muted)] bg-[var(--ag-surface-muted)] p-2 rounded-lg">
                                <span className="text-red-500">•</span> {issue}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="bg-[var(--ag-amber-soft)] p-5 rounded-[1.4rem]">
                    <h4 className="font-bold text-amber-900 dark:text-amber-100 mb-3 flex items-center gap-2">
                        <BrainIcon /> {t('plantDoctor.soilAnalyzer.advice')}
                    </h4>
                    <ul className="space-y-2">
                        {result.initialAdvice.map((advice, i) => (
                            <li key={i} className="flex gap-3 text-sm text-amber-800 dark:text-amber-200">
                                <span className="mt-1 flex-shrink-0">➜</span>
                                <span>{advice}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                 <div>
                    <h4 className="font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                        {t('plantDoctor.soilAnalyzer.suitableCrops')}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {result.suitableCrops.map((crop, i) => (
                                <span key={i} className="ui-chip ui-chip-forest">
                                    {crop}
                                </span>
                        ))}
                    </div>
                </div>
                
                <p className="text-[10px] text-gray-400 italic text-center mt-4">
                    Disclaimer: This analysis is based on visual patterns only. Always perform a professional laboratory test for accurate results.
                </p>
            </div>
        </ResultCard>
    );
});

const BrainIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-700 dark:text-amber-500"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>;
