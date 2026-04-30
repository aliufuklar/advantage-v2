import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Personnel } from '@/types';

export function PersonnelPage() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPersonnel().then((data) => {
      setPersonnel(data as Personnel[]);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-gray-500">Yükleniyor...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Personel</h1>
        <button className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700">
          + Yeni Personel
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Personel No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pozisyon</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Departman</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">E-posta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {personnel.map((person: Personnel) => (
              <tr key={person.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{person.personnelNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{person.fullName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{person.position}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{person.department || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{person.email || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}