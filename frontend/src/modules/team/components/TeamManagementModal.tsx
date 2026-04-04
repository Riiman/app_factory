import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { UserPlus, Users, X, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { TeamMember } from '@/types/dashboard-types';
import api from '@/utils/api';

interface TeamManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    startupId: number;
    members: TeamMember[];
    onMemberAdded: (member: TeamMember) => void;
    onMemberRemoved: (userId: number) => void;
    onMemberUpdated: (member: TeamMember) => void;
}

const AVAILABLE_SCOPES = [
    { id: 'MARKETING', label: 'Marketing' },
    { id: 'PRODUCT', label: 'Product' },
    { id: 'FUNDRAISE', label: 'Fundraise' },
    { id: 'BUSINESS', label: 'Business' },
    { id: 'SETTINGS', label: 'Settings' },
];

const TeamManagementModal: React.FC<TeamManagementModalProps> = ({
    isOpen,
    onClose,
    startupId,
    members,
    onMemberAdded,
    onMemberRemoved,
    onMemberUpdated,
}) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('');
    const [linkedin, setLinkedin] = useState('');
    const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
    const [isAdding, setIsAdding] = useState(false);

    const handleScopeToggle = (scopeId: string) => {
        setSelectedScopes((prev) =>
            prev.includes(scopeId)
                ? prev.filter((id) => id !== scopeId)
                : [...prev, scopeId]
        );
    };

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAdding(true);
        try {
            const response = await api.post(`/startups/${startupId}/team`, {
                email,
                password,
                full_name: fullName,
                role,
                linkedin,
                scopes: selectedScopes,
            });

            if (response.success) {
                toast.success('Team member added successfully');
                onMemberAdded(response.member);
                // Reset form
                setEmail('');
                setPassword('');
                setFullName('');
                setRole('');
                setLinkedin('');
                setSelectedScopes([]);
            }
        } catch (error: any) {
            console.error("Add member error:", error);
            toast.error(error.response?.data?.error || 'Failed to add team member');
        } finally {
            setIsAdding(false);
        }
    };

    const handleRemoveMember = async (userId: number) => {
        if (!window.confirm('Are you sure you want to remove this member?')) return;
        try {
            await api.removeTeamMember(startupId, userId);
            onMemberRemoved(userId);
            toast.success('Team member removed');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to remove member');
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            {/* The backdrop, rendered as a fixed sibling to the panel container */}
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

            {/* Full-screen container to center the panel */}
            <div className="fixed inset-0 flex items-center justify-center p-4">
                {/* The actual dialog panel  */}
                <Dialog.Panel className="mx-auto max-w-2xl w-full rounded-2xl bg-white p-6 shadow-xl">
                    <div className="flex justify-between items-center mb-4">
                        <Dialog.Title className="text-lg font-medium leading-6 text-gray-900">
                            Manage Team
                        </Dialog.Title>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Add New Member Form */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium text-gray-900 mb-4">Add New Member</h4>
                            <form onSubmit={handleAddMember} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Role / Job Title</label>
                                    <input
                                        type="text"
                                        required
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                        placeholder="e.g. Marketing Lead"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">LinkedIn (Optional)</label>
                                    <input
                                        type="url"
                                        value={linkedin}
                                        onChange={(e) => setLinkedin(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                        placeholder="https://linkedin.com/in/..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Temporary Password</label>
                                    <input
                                        type="text"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                        minLength={6}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Access Scopes</label>
                                    <div className="space-y-2">
                                        {AVAILABLE_SCOPES.map((scope) => (
                                            <div key={scope.id} className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    id={`scope-${scope.id}`}
                                                    checked={selectedScopes.includes(scope.id)}
                                                    onChange={() => handleScopeToggle(scope.id)}
                                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <label htmlFor={`scope-${scope.id}`} className="ml-2 text-sm text-gray-700">
                                                    {scope.label}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isAdding}
                                    className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                >
                                    {isAdding ? 'Adding...' : 'Add Member'}
                                </button>
                            </form>
                        </div>

                        {/* Team List */}
                        <div>
                            <h4 className="font-medium text-gray-900 mb-4">Current Team ({members.length})</h4>
                            <div className="space-y-4 max-h-[500px] overflow-y-auto">
                                {members.map((member) => (
                                    <div key={member.user_id} className="flex items-start justify-between p-3 bg-white border rounded-lg shadow-sm">
                                        <div>
                                            <p className="font-medium text-gray-900">{member.user_name || member.user_email}</p>
                                            <p className="text-sm text-gray-500">{member.role} • {member.user_email}</p>
                                            {member.linkedin && (
                                                <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:text-indigo-500 block">
                                                    LinkedIn Profile
                                                </a>
                                            )}
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {member.role === 'Owner' ? (
                                                    <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                                                        Owner
                                                    </span>
                                                ) : (
                                                    member.scopes?.map(scope => (
                                                        <span key={scope} className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                                                            {scope}
                                                        </span>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                        {member.role !== 'Owner' && (
                                            <button
                                                onClick={() => handleRemoveMember(member.user_id)}
                                                className="text-red-400 hover:text-red-600 p-1"
                                                title="Remove Member"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {members.length === 0 && (
                                    <p className="text-gray-500 text-sm italic">No team members yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default TeamManagementModal;
