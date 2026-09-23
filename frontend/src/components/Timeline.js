"use client";
import { useMemo } from 'react';

export default function Timeline({ clusters, onSelectCluster, selectedClusterId }) {
    const { validClusters, minTime, maxTime, totalDuration } = useMemo(() => {
        if (!clusters || clusters.length === 0) return { validClusters: [], minTime: 0, maxTime: 0, totalDuration: 0 };
        
        const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
        const filtered = clusters.filter(c => 
            new Date(c.start).getTime() > twoWeeksAgo && 
            new Date(c.end).getTime() > twoWeeksAgo
        );
        
        if (filtered.length === 0) return { validClusters: [], minTime: 0, maxTime: 0, totalDuration: 0 };

        const times = filtered.flatMap(c => [new Date(c.start).getTime(), new Date(c.end).getTime()]);
        const min = Math.min(...times);
        const max = Math.max(...times, min + 3600000);
        
        return { validClusters: filtered, minTime: min, maxTime: max, totalDuration: max - min };
    }, [clusters]);

    if (!validClusters || validClusters.length === 0) return <div className="text-gray-400">No recent clusters to display.</div>;

    return (
        <div className="relative w-full h-48 bg-[#050505] rounded p-6 overflow-hidden border border-zinc-900 flex flex-col justify-between">
            <div className="relative flex-1 w-full mt-8 mb-4 border-b border-zinc-900/50">
                {validClusters.map((cluster, index) => {
                    const startTs = new Date(cluster.start).getTime();
                    const endTs = new Date(cluster.end).getTime();
                    const left = Math.max(0, ((startTs - minTime) / totalDuration) * 100);
                    const width = Math.min(100 - left, Math.max(((endTs - startTs) / totalDuration) * 100, 3));
                    const isSelected = cluster.id === selectedClusterId;
                    const intensity = Math.min(cluster.articleCount * 0.15, 0.8);
                    
                    return (
                        <div
                            key={cluster.id}
                            onClick={() => onSelectCluster(cluster.id)}
                            className={`absolute h-1.5 rounded-full cursor-pointer transition-all duration-300 ease-out group ${isSelected ? 'bg-white z-50 shadow-[0_0_12px_rgba(255,255,255,0.4)]' : 'bg-zinc-800 hover:bg-zinc-400 z-10 hover:z-40'}`}
                            style={{
                                left: `${left}%`,
                                width: `${width}%`,
                                top: `${(index % 4) * 20}%`,
                                minWidth: '16px'
                            }}
                        >
                            <div className={`absolute -top-6 left-0 text-[11px] whitespace-nowrap tracking-wide capitalize transition-opacity duration-200 ${isSelected ? 'text-white opacity-100 font-medium' : 'text-zinc-400 opacity-0 group-hover:opacity-100'}`}>
                                {cluster.label.replace(/-/g, ' ')}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between text-[11px] text-zinc-400 font-mono tracking-wider pt-2">
                <span>{new Date(minTime).toLocaleString()}</span>
                <span>{new Date(maxTime).toLocaleString()}</span>
            </div>
        </div>
    );
}
