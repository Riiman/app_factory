import React, { useState } from 'react';
import { UserPlusIcon } from './icons';

interface AddSignatoryProps {
  onAddSignatory: (name: string, email: string) => void;
}

const AddSignatory: React.FC<AddSignatoryProps> = ({ onAddSignatory }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && email.trim()) {
      onAddSignatory(name, email);
      setName('');
      setEmail('');
    }
  };

  const isFormInvalid = !name.trim() || !email.trim();

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Add Signatory</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700">
            Full Name
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="name"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              placeholder="Jane Doe"
              required
            />
          </div>
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email Address
          </label>
          <div className="mt-1">
            <input
              type="email"
              name="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              placeholder="jane.doe@example.com"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isFormInvalid}
          className="w-full bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 flex items-center justify-center gap-2 disabled:bg-slate-400 disabled:cursor-not-allowed"
        >
          <UserPlusIcon className="w-5 h-5" />
          Add Signatory
        </button>
      </form>
    </div>
  );
};

export default AddSignatory;
