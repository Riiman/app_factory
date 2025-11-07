
import React, { useState, useMemo } from 'react';
import { Startup } from '../../types/dashboard-types';
import Card from '../../components/admin/Card';
import StatusBadge from '../../components/admin/StatusBadge';
import { Search, Building2, Bell } from 'lucide-react';

interface StartupListViewProps {
  startups: Startup[];
  onSelectStartup: (startup: Startup) => void;
}

const StartupListView: React.FC<StartupListViewProps> = ({ startups, onSelectStartup }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStartups = useMemo(() => {
    return startups.filter(startup =>
      startup.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [startups, searchTerm]);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-brand-text-primary">Startup Directory</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search startups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-64 border border-slate-300 rounded-md text-sm"
          />
        </div>
      </div>
      
      {filteredStartups.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-brand-text-secondary">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3">Startup Name</th>
                  <th scope="col" className="px-6 py-3">Primary Founder</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3">Stage</th>
                  <th scope="col" className="px-6 py-3">Created At</th>
                  <th scope="col" className="px-6 py-3 text-center">Notifications</th>
                </tr>
              </thead>
              <tbody>
                {filteredStartups.map((startup) => (
                  <tr 
                    key={startup.id} 
                    className="bg-white border-b hover:bg-slate-50 cursor-pointer"
                    onClick={() => onSelectStartup(startup)}
                  >
                    <th scope="row" className="px-6 py-4 font-medium text-brand-text-primary whitespace-nowrap">
                      {startup.name}
                    </th>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-brand-text-primary">{startup.founders[0]?.name || 'N/A'}</p>
                        <a href={`mailto:${startup.founders[0]?.email}`} className="text-xs text-brand-primary hover:underline">{startup.founders[0]?.email}</a>
                        {startup.founders[0]?.mobile && (
                          <a href={`tel:${startup.founders[0].mobile}`} className="text-xs text-brand-text-secondary hover:underline block">{startup.founders[0].mobile}</a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={startup.status} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={startup.currentStage} />
                    </td>
                    <td className="px-6 py-4">
                      {new Date(startup.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <Bell className="h-5 w-5 text-slate-400" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="text-center py-16">
            <Building2 className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 text-lg font-semibold">No Startups Found</h3>
            <p className="mt-1 text-sm text-brand-text-secondary">
              {searchTerm ? "Adjust your search or " : ""}
              Approve a startup from the workflow to see it here.
            </p>
        </div>
      )}
    </div>
  );
};

export default StartupListView;