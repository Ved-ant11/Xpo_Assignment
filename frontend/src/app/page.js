"use client";
import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import Timeline from '../components/Timeline';
import ClusterDetail from '../components/ClusterDetail';

export default function Home() {
    const [timeline, setTimeline] = useState([]);
    const [selectedClusterId, setSelectedClusterId] = useState(null);
    const [selectedCluster, setSelectedCluster] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sources, setSources] = useState([]);
    const [selectedSources, setSelectedSources] = useState([]);
    const [error, setError] = useState(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    const fetchTimeline = async () => {
        try {
            const res = await fetch(`${API_URL}/timeline`);
            if (!res.ok) throw new Error('Failed to fetch timeline');
            const data = await res.json();
            setTimeline(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTimeline();
    }, []);

    useEffect(() => {
        if (selectedClusterId) {
            const fetchCluster = async () => {
                try {
                    const res = await fetch(`${API_URL}/clusters/${selectedClusterId}`);
                    if (!res.ok) throw new Error('Failed to fetch cluster details');
                    const data = await res.json();
                    
                    const clusterSources = [...new Set(data.articles.map(a => a.source))];
                    setSources(prev => {
                        const newSources = [...new Set([...prev, ...clusterSources])];
                        if (prev.length === 0) setSelectedSources(newSources);
                        return newSources;
                    });
                    
                    setSelectedCluster(data);
                } catch (err) {
                    setError(err.message);
                }
            };
            fetchCluster();
        } else {
            setSelectedCluster(null);
        }
    }, [selectedClusterId]);

    const handleRefresh = async () => {
        if (refreshing) return;
        setRefreshing(true);
        setError(null);
        try {
            const triggerRes = await fetch(`${API_URL}/ingest/trigger`, { method: 'POST' });
            if (!triggerRes.ok) throw new Error('Failed to trigger ingestion');
            const { jobId } = await triggerRes.json();
            
            const poll = setInterval(async () => {
                try {
                    const statusRes = await fetch(`${API_URL}/ingest/status/${jobId}`);
                    const statusData = await statusRes.json();
                    if (statusData.status === 'completed' || statusData.status === 'failed') {
                        clearInterval(poll);
                        setRefreshing(false);
                        if (statusData.status === 'completed') {
                            fetchTimeline();
                        } else {
                            setError(statusData.error || 'Ingestion failed');
                        }
                    }
                } catch (e) {
                    clearInterval(poll);
                    setRefreshing(false);
                    setError(e.message);
                }
            }, 2000);
        } catch (err) {
            setError(err.message);
            setRefreshing(false);
        }
    };

    const toggleSource = (source) => {
        setSelectedSources(prev => 
            prev.includes(source) 
                ? prev.filter(s => s !== source)
                : [...prev, source]
        );
    };

    const filteredCluster = selectedCluster ? {
        ...selectedCluster,
        articles: selectedCluster.articles.filter(a => selectedSources.includes(a.source))
    } : null;

    return (
        <main className="min-h-screen bg-black text-zinc-300 p-8 font-sans antialiased selection:bg-zinc-800 selection:text-white">
            <div className="max-w-6xl mx-auto space-y-12">
                <header className="flex justify-between items-end border-b border-zinc-900 pb-8">
                    <div>
                        <h1 className="text-2xl font-medium text-white tracking-tight">
                            News Pulse
                        </h1>
                        <p className="text-zinc-400 mt-1 text-sm tracking-wide">Signal from the noise</p>
                    </div>
                    <button 
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className={`flex items-center space-x-2 px-4 py-2 rounded text-xs font-medium tracking-wide transition-all ${refreshing ? 'bg-zinc-900 text-zinc-600 cursor-wait' : 'bg-white text-black hover:bg-zinc-200'}`}
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
                    </button>
                </header>

                {error && (
                    <div className="bg-red-950/20 text-red-400 px-4 py-3 rounded text-sm flex items-center">
                        <span className="mr-2">⚠</span> {error}
                    </div>
                )}

                <section className="space-y-6">
                    <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-widest">Timeline</h2>
                    {loading ? (
                        <div className="h-48 flex items-center justify-center bg-zinc-950 rounded border border-zinc-900">
                            <div className="animate-pulse flex space-x-4">
                                <div className="h-1 bg-zinc-800 rounded w-24"></div>
                                <div className="h-1 bg-zinc-800 rounded w-32"></div>
                            </div>
                        </div>
                    ) : (
                        <Timeline 
                            clusters={timeline} 
                            onSelectCluster={setSelectedClusterId} 
                            selectedClusterId={selectedClusterId} 
                        />
                    )}
                </section>

                {filteredCluster && (
                    <section className="pt-12 border-t border-zinc-900 grid grid-cols-1 md:grid-cols-4 gap-12">
                        <div className="md:col-span-1 space-y-6">
                            <div>
                                <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-widest mb-4">Sources</h3>
                                <div className="space-y-3">
                                    {sources.map(source => (
                                        <label key={source} className="flex items-center space-x-3 cursor-pointer group">
                                            <div className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center transition-colors ${selectedSources.includes(source) ? 'bg-white' : 'bg-zinc-900 group-hover:bg-zinc-800'}`}>
                                                {selectedSources.includes(source) && (
                                                    <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                            <span className={`text-xs tracking-wide ${selectedSources.includes(source) ? 'text-zinc-200' : 'text-zinc-400'}`}>{source}</span>
                                            <input type="checkbox" className="hidden" checked={selectedSources.includes(source)} onChange={() => toggleSource(source)} />
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-3">
                            <ClusterDetail 
                                cluster={filteredCluster} 
                            />
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}
