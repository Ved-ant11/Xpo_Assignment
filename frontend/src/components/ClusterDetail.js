"use client";
import { format } from 'date-fns';

export default function ClusterDetail({ cluster, onClose }) {
    if (!cluster) return null;

    return (
        <div className="bg-[#050505] rounded p-8 w-full border border-zinc-900 shadow-2xl relative">
            <button 
                onClick={onClose}
                className="absolute top-6 right-6 text-zinc-400 hover:text-white transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <h2 className="text-xl font-medium text-white mb-2 capitalize tracking-tight">{cluster.label.replace(/-/g, ' ')}</h2>
            <div className="text-xs text-zinc-400 mb-8 font-mono tracking-widest uppercase">
                {format(new Date(cluster.startTime), 'MMM d, HH:mm')} — {format(new Date(cluster.endTime), 'MMM d, HH:mm')}
            </div>
            
            <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                {cluster.articles.map(article => (
                    <div key={article.id} className="group">
                        <a href={article.url} target="_blank" rel="noopener noreferrer" className="block">
                            <h3 className="text-base font-medium text-zinc-200 group-hover:text-white transition-colors mb-1 leading-snug">{article.title}</h3>
                        </a>
                        <div className="flex items-center text-[11px] text-zinc-400 mb-3 space-x-3 tracking-wide uppercase">
                            <span className="text-zinc-300 font-medium">{article.source}</span>
                            <span>{format(new Date(article.publishedAt), 'MMM d, yyyy')}</span>
                        </div>
                        {article.summary && (
                            <p className="text-sm text-zinc-300 font-normal line-clamp-3 leading-relaxed">{article.summary}</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
