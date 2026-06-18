
import React, { useState, useEffect, useRef } from 'react';
import type { TrackedPlant, ProgressLogEntry } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { analyzeRecoveryProgress } from '../services/geminiService';

interface TrackedPlantModalProps {
    plant: TrackedPlant;
    onSave: (plant: TrackedPlant) => void;
    onClose: () => void;
    onDelete: (plantId: string) => void;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
const PauseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>;
const MusicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
const ShareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>;

const TimeLapsePlayer: React.FC<{ logs: ProgressLogEntry[], initialImage: string }> = ({ logs, initialImage }) => {
    const { t } = useTranslation();
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [musicEnabled, setMusicEnabled] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    
    // Combine initial image + log images
    const images = [{ date: 'Start', image: initialImage }, ...logs.filter(l => l.image).map(l => ({ date: l.date, image: l.image! }))];
    
    useEffect(() => {
        let interval: any;
        if (isPlaying) {
            interval = setInterval(() => {
                setCurrentIndex(prev => (prev + 1) % images.length);
            }, 800); // 800ms per frame
        }
        return () => clearInterval(interval);
    }, [isPlaying, images.length]);

    const handleShare = () => {
        setIsExporting(true);
        setTimeout(() => {
            setIsExporting(false);
            alert(t('timeLapse.success'));
        }, 2000);
    };

    if (images.length < 2) return null;

    return (
        <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl mt-6 relative group">
            {/* Screen */}
            <div className="relative aspect-video bg-black flex items-center justify-center">
                <img src={images[currentIndex].image} alt="Time Lapse Frame" className="w-full h-full object-contain transition-opacity duration-500" />
                <div className="absolute top-4 left-4 bg-black/50 px-3 py-1 rounded text-white text-xs font-mono">
                    {images[currentIndex].date}
                </div>
                {isExporting && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
                        <div className="text-center">
                            <div className="w-10 h-10 border-4 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <p className="text-brand-green font-bold animate-pulse">{t('timeLapse.exporting')}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="p-4 bg-gray-800 text-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsPlaying(!isPlaying)} className="p-2 rounded-full bg-brand-green hover:bg-brand-green-dark transition-colors">
                        {isPlaying ? <PauseIcon /> : <PlayIcon />}
                    </button>
                    <div>
                        <h4 className="font-bold text-sm">{t('timeLapse.title')}</h4>
                        <p className="text-xs text-gray-400">{images.length} Frames</p>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <button 
                        onClick={() => setMusicEnabled(!musicEnabled)} 
                        className={`p-2 rounded-lg transition-colors ${musicEnabled ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'}`}
                        title={t('timeLapse.music')}
                    >
                        <MusicIcon />
                    </button>
                    <button 
                        onClick={handleShare}
                        className="px-4 py-2 bg-blue-600 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-blue-700 transition-colors"
                    >
                        <ShareIcon /> {t('timeLapse.share')}
                    </button>
                </div>
            </div>
            {/* Visualizer for music simulation */}
            {musicEnabled && isPlaying && (
                <div className="absolute bottom-[72px] left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 animate-pulse"></div>
            )}
        </div>
    );
};

const ProgressChart: React.FC<{ logs: ProgressLogEntry[] }> = ({ logs }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    
    if (logs.length < 2) {
        return (
            <div className="flex items-center justify-center h-40 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                <p className="text-gray-500">Not enough data to display chart.</p>
            </div>
        );
    }

    const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const minDate = new Date(sortedLogs[0].date).getTime();
    const maxDate = new Date(sortedLogs[sortedLogs.length - 1].date).getTime();
    const dateRange = maxDate - minDate || 1; // Avoid division by zero

    const width = 500;
    const height = 150;
    const padding = { top: 20, right: 20, bottom: 30, left: 30 };

    const getX = (date: string) => {
        const time = new Date(date).getTime();
        return padding.left + ((time - minDate) / dateRange) * (width - padding.left - padding.right);
    };

    const getY = (percentage: number) => {
        return padding.top + ((100 - percentage) / 100) * (height - padding.top - padding.bottom);
    };

    const pathData = sortedLogs.map(log => `${getX(log.date)},${getY(log.recoveryProgressPercentage)}`).join(' L ');
    const points = sortedLogs.map((log, index) => ({
        cx: getX(log.date),
        cy: getY(log.recoveryProgressPercentage),
        date: log.date,
        percentage: log.recoveryProgressPercentage,
        index,
    }));
    
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    return (
        <div className="relative">
             <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" aria-labelledby="chart-title">
                <title id="chart-title">Plant Recovery Progress Chart</title>
                {/* Y-Axis Labels */}
                <text x={padding.left - 8} y={getY(100)} dy="0.3em" textAnchor="end" className="text-xs fill-current text-gray-400">100%</text>
                <text x={padding.left - 8} y={getY(50)} dy="0.3em" textAnchor="end" className="text-xs fill-current text-gray-400">50%</text>
                <text x={padding.left - 8} y={getY(0)} dy="0.3em" textAnchor="end" className="text-xs fill-current text-gray-400">0%</text>
                
                 {/* X-Axis Labels */}
                <text x={getX(sortedLogs[0].date)} y={height - 5} textAnchor="middle" className="text-xs fill-current text-gray-400">{formatDate(sortedLogs[0].date)}</text>
                <text x={getX(sortedLogs[sortedLogs.length-1].date)} y={height - 5} textAnchor="middle" className="text-xs fill-current text-gray-400">{formatDate(sortedLogs[sortedLogs.length-1].date)}</text>
                
                {/* Grid Lines */}
                <line x1={padding.left} y1={getY(100)} x2={width - padding.right} y2={getY(100)} className="stroke-current text-gray-200 dark:text-gray-700" strokeWidth="1" strokeDasharray="2" />
                <line x1={padding.left} y1={getY(50)} x2={width - padding.right} y2={getY(50)} className="stroke-current text-gray-200 dark:text-gray-700" strokeWidth="1" strokeDasharray="2" />
                <line x1={padding.left} y1={getY(0)} x2={width - padding.right} y2={getY(0)} className="stroke-current text-gray-200 dark:text-gray-700" strokeWidth="1" />


                {/* Line */}
                <path d={`M ${pathData}`} fill="none" className="stroke-brand-green" strokeWidth="2" />

                {/* Points and Tooltips */}
                {points.map(p => (
                    <g key={p.index} onMouseEnter={() => setHoveredIndex(p.index)} onMouseLeave={() => setHoveredIndex(null)}>
                        <circle cx={p.cx} cy={p.cy} r="6" className="fill-brand-green opacity-20" />
                        <circle cx={p.cx} cy={p.cy} r="3" className="fill-brand-green" />
                        {hoveredIndex === p.index && (
                             <g transform={`translate(${p.cx}, ${p.cy - 10})`}>
                                <rect x="-40" y="-25" width="80" height="22" rx="4" className="fill-current text-gray-800 dark:text-gray-900 opacity-80" />
                                <text x="0" y="-14" textAnchor="middle" className="text-xs fill-current text-white font-semibold">
                                    {p.percentage}% - {formatDate(p.date)}
                                </text>
                            </g>
                        )}
                    </g>
                ))}
            </svg>
        </div>
    );
};


export const TrackedPlantModal: React.FC<TrackedPlantModalProps> = ({ plant, onSave, onClose, onDelete }) => {
    const { t, language } = useTranslation();
    const [newLogNotes, setNewLogNotes] = useState('');
    const [newLogImage, setNewLogImage] = useState<File | null>(null);
    const [newLogImagePreview, setNewLogImagePreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState('');

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setNewLogImage(file);
            const base64Preview = await fileToBase64(file);
            setNewLogImagePreview(base64Preview);
        }
    };
    
    const handleAddLog = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLogImage || !newLogImagePreview) {
            alert(t('modals.trackedPlant.photoRequired'));
            return;
        }
        setIsSubmitting(true);
        setSubmissionStatus(t('modals.trackedPlant.analyzing'));

        try {
            const lastLogWithImage = [...plant.progressLog].reverse().find(log => log.image);
            const previousImage = lastLogWithImage?.image || plant.image;

            if (!previousImage.startsWith('data:')) {
                alert(t('modals.trackedPlant.urlError'));
                setIsSubmitting(false);
                setSubmissionStatus('');
                return;
            }

            const analysis = await analyzeRecoveryProgress(previousImage, newLogImagePreview, plant.diagnosis, language);

            const newLogEntry: ProgressLogEntry = {
                date: new Date().toISOString().split('T')[0],
                notes: `${t('modals.trackedPlant.aiAnalysis')}: ${analysis.analysisNotes}\n---\n${newLogNotes}`,
                image: newLogImagePreview,
                recoveryProgressPercentage: analysis.newHealthPercentage
            };

            const updatedPlant: TrackedPlant = {
                ...plant,
                progressLog: [...plant.progressLog, newLogEntry],
                lastCheckDate: newLogEntry.date,
                recoveryProgressPercentage: analysis.newHealthPercentage,
            };
            
            setSubmissionStatus(t('modals.trackedPlant.saving'));
            onSave(updatedPlant);

            // Automatically close the modal after a short delay
            setTimeout(onClose, 800);

        } catch (error) {
            console.error("Failed to analyze progress:", error);
            alert(error instanceof Error ? error.message : "An unknown error occurred.");
            // Only reset submission state on error, as success unmounts the component
            setIsSubmitting(false);
            setSubmissionStatus('');
        }
    };

    const isCheckupDue = () => {
        const lastCheck = new Date(plant.lastCheckDate);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - lastCheck.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 7;
    };
    const recoveryDelta =
        plant.progressLog.length >= 2
            ? plant.progressLog[plant.progressLog.length - 1].recoveryProgressPercentage - plant.progressLog[plant.progressLog.length - 2].recoveryProgressPercentage
            : 0;
    const treatmentSteps = plant.diagnosis?.treatment?.length
        ? plant.diagnosis.treatment
        : ['Run a fresh Plant Doctor scan', 'Inspect irrigation and nutrition', 'Upload a follow-up image after 48 hours'];


    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in p-4">
            <div className="tracked-plant-panel bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl flex flex-col max-h-[90vh]">
                <header className="tracked-plant-header p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-green-dark dark:text-brand-green-light">Tracked Plant Recovery</p>
                        <h2 className="text-2xl font-bold text-brand-green-dark dark:text-brand-green-light">{t('modals.trackedPlant.title', { name: plant.name })}</h2>
                    </div>
                    <button onClick={onClose} className="tracked-plant-close text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">&times;</button>
                </header>
                
                <main className="p-6 overflow-y-auto space-y-6">
                    <section className="tracked-plant-summary">
                        <img src={plant.image} alt={plant.name} />
                        <div>
                            <span>Current status</span>
                            <h3>{plant.recoveryProgressPercentage >= 80 ? 'Recovering well' : plant.recoveryProgressPercentage >= 45 ? 'Under treatment' : 'Critical follow-up'}</h3>
                            <p>{plant.diagnosis?.diseaseName || 'No diagnosis recorded'} · Last check {plant.lastCheckDate || 'not set'}</p>
                        </div>
                        <div>
                            <span>Health score</span>
                            <strong>{plant.recoveryProgressPercentage}%</strong>
                            <small>{recoveryDelta > 0 ? `+${recoveryDelta}% since last image` : recoveryDelta < 0 ? `${recoveryDelta}% decline` : 'Waiting for comparison image'}</small>
                        </div>
                    </section>

                    {isCheckupDue() && (
                        <div className="p-3 mb-4 bg-yellow-100 border-s-4 border-yellow-500 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-e-lg animate-fade-in">
                            <p className="font-semibold">{t('modals.trackedPlant.addLogPrompt')}</p>
                        </div>
                    )}

                    {/* Current Status */}
                     <div className="bg-blue-50 dark:bg-gray-700/50 p-4 rounded-lg">
                        <h3 className="font-bold text-lg text-blue-800 dark:text-blue-300 mb-2">Recovery Progress</h3>
                         <ProgressChart logs={plant.progressLog} />
                         <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-end">Last updated: {plant.lastCheckDate}</p>
                    </div>

                    {/* Time-Lapse Feature (NEW) */}
                    <TimeLapsePlayer logs={plant.progressLog} initialImage={plant.image} />

                    {/* Initial Diagnosis Section */}
                    <div className="flex flex-col md:flex-row gap-4 mt-6">
                        <img src={plant.image} alt={plant.name} className="w-full md:w-1/3 h-auto object-cover rounded-lg" />
                        <div className="bg-red-50 dark:bg-gray-700/50 p-4 rounded-lg flex-1">
                            <h3 className="font-bold text-lg text-red-800 dark:text-red-300">{t('modals.trackedPlant.initialDiagnosis')}: {plant.diagnosis?.diseaseName}</h3>
                             <p className="text-sm mt-2"><strong className="text-gray-600 dark:text-gray-300">{t('modals.trackedPlant.symptoms')}:</strong> {plant.diagnosis?.symptoms?.join(', ') || ''}</p>
                            <p className="text-sm mt-2"><strong className="text-gray-600 dark:text-gray-300">{t('modals.trackedPlant.treatment')}:</strong> {plant.diagnosis?.treatment?.join(' ') || ''}</p>
                        </div>
                    </div>

                    <section className="tracked-treatment-plan">
                        <div>
                            <p>Suggested treatment plan</p>
                            <h3>Review before adding to farm tasks</h3>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                            {treatmentSteps.slice(0, 3).map((step, index) => (
                                <article key={`${step}-${index}`}>
                                    <span>{String(index + 1).padStart(2, '0')}</span>
                                    <p>{step}</p>
                                </article>
                            ))}
                        </div>
                        <small>
                            When this plant belongs to a farm cycle, open My Farm → Cycle → Tracked Plants and use “Add treatment plan to tasks” to create linked tasks.
                        </small>
                    </section>

                    {/* Progress Log */}
                    <div>
                        <h3 className="font-bold text-xl mb-3">{t('modals.trackedPlant.progressTimeline')}</h3>
                        <div className="space-y-4 border-s-2 border-brand-green-light dark:border-gray-600 ms-2 ps-4">
                            {plant.progressLog.length > 0 ? [...plant.progressLog].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((log, index) => (
                                <div key={index} className="relative">
                                    <div className="absolute -start-[23px] top-1 h-3 w-3 bg-brand-green rounded-full"></div>
                                    <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">{log.date} - <span className="font-bold">{log.recoveryProgressPercentage}%</span> recovered</p>
                                    <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{log.notes}</p>
                                    {log.image && <img src={log.image} alt={`Log entry ${log.date}`} className="mt-2 rounded-md max-h-40" />}
                                </div>
                            )) : <p className="text-gray-500">{t('modals.trackedPlant.noLogs')}</p>}
                        </div>
                    </div>
                     
                    {/* Add New Log Form */}
                    <form onSubmit={handleAddLog} className="pt-4 border-t dark:border-gray-600">
                        <h3 className="font-bold text-xl mb-3">{t('modals.trackedPlant.addLogTitle')}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">{t('modals.trackedPlant.addPhoto')}</label>
                                 {newLogImagePreview && <img src={newLogImagePreview} alt="New log preview" className="my-2 max-h-40 rounded-md" />}
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-green-light/20 file:text-brand-green-dark hover:file:bg-brand-green-light/40 dark:file:bg-gray-600 dark:file:text-gray-300"
                                    required
                                />
                            </div>
                            <textarea
                                value={newLogNotes}
                                onChange={e => setNewLogNotes(e.target.value)}
                                placeholder={t('modals.trackedPlant.notesPlaceholder')}
                                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                                rows={3}
                            />
                            <button type="submit" disabled={isSubmitting || !newLogImage} className="px-5 py-2 bg-brand-green text-white font-semibold rounded-lg hover:bg-brand-green-dark disabled:bg-gray-400">
                                {isSubmitting ? submissionStatus : t('modals.trackedPlant.analyzeAndLog')}
                            </button>
                        </div>
                    </form>
                </main>
                
                <footer className="p-4 bg-gray-50 dark:bg-gray-900/50 flex justify-end items-center gap-3">
                    <button onClick={() => onDelete(plant.id)} className="text-sm text-red-600 hover:underline">{t('modals.trackedPlant.deleteTracking')}</button>
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">
                        {t('modals.trackedPlant.close')}
                    </button>
                </footer>
            </div>
        </div>
    );
};
