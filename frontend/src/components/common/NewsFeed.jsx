import React, { useEffect, useState } from 'react';
import { getNewsFeed } from '../../api/newsApi';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NewsFeed() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    getNewsFeed()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h2 className="font-semibold mb-4">News & Updates</h2>
      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400">No news items yet.</p>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <div key={item.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-medium text-sm">{item.title}</span>
                    {item.job_role_name && (
                      <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-2 py-0.5">
                        {item.job_role_name}
                      </span>
                    )}
                    {!item.job_role_name && (
                      <span className="text-xs bg-gray-50 text-gray-500 border border-gray-200 rounded-full px-2 py-0.5">
                        All roles
                      </span>
                    )}
                  </div>
                  <p className={`text-sm text-gray-600 whitespace-pre-wrap ${expanded === item.id ? '' : 'line-clamp-2'}`}>
                    {item.body}
                  </p>
                  {item.body.length > 120 && (
                    <button
                      className="text-xs text-blue-600 hover:underline mt-1"
                      onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                    >
                      {expanded === item.id ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-1">{item.author} · {timeAgo(item.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
