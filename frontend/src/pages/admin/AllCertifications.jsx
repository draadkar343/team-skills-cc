import React, { useEffect, useState } from 'react';
import { getAllCerts } from '../../api/certsApi';
import Badge from '../../components/common/Badge';

export default function AllCertifications() {
  const [certs, setCerts] = useState([]);
  const [filter, setFilter] = useState('');

  useEffect(() => { getAllCerts().then(setCerts).catch(() => {}); }, []);

  const filtered = certs.filter(c =>
    !filter || `${c.first_name} ${c.last_name} ${c.name} ${c.provider || ''}`.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">All Certifications</h1>
      <p className="text-sm text-gray-500 mb-6">All employee certifications across the organisation.</p>

      <div className="mb-4">
        <input type="text" placeholder="Filter by employee, certification or provider..."
          className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={filter} onChange={e => setFilter(e.target.value)} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-4 font-medium text-gray-600">Employee</th>
              <th className="text-left p-4 font-medium text-gray-600">Certification</th>
              <th className="text-left p-4 font-medium text-gray-600">Provider</th>
              <th className="text-left p-4 font-medium text-gray-600">Obtained</th>
              <th className="text-left p-4 font-medium text-gray-600">Expires</th>
              <th className="text-left p-4 font-medium text-gray-600">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-gray-400">No certifications found.</td></tr>
            )}
            {filtered.map(cert => {
              const expired = cert.expiration_date && new Date(cert.expiration_date) < new Date();
              const expiringSoon = cert.expiration_date && !expired &&
                Math.ceil((new Date(cert.expiration_date) - Date.now()) / 86400000) <= 30;
              return (
                <tr key={cert.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-4">
                    <div className="font-medium">{cert.first_name} {cert.last_name}</div>
                    <div className="text-xs text-gray-400">{cert.email}</div>
                  </td>
                  <td className="p-4 font-medium">{cert.name}</td>
                  <td className="p-4 text-gray-500">{cert.provider || '-'}</td>
                  <td className="p-4 text-gray-500">{cert.date_obtained?.slice(0, 10)}</td>
                  <td className="p-4">
                    {cert.expiration_date ? (
                      <span className={expired ? 'text-red-600 font-medium' : expiringSoon ? 'text-yellow-600 font-medium' : 'text-gray-500'}>
                        {cert.expiration_date?.slice(0, 10)}
                        {expired && ' (Expired)'}
                        {expiringSoon && ' (Soon)'}
                      </span>
                    ) : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="p-4"><Badge status={cert.status} /></td>
                  <td className="p-4">
                    {cert.certificate_url && (
                      <a href={cert.certificate_url} target="_blank" rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline">View</a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
