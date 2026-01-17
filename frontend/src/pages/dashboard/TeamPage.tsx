import React, { useState, useEffect } from 'react';
import { TeamMember } from '../../types/dashboard-types';
import TeamManagementModal from '../../components/dashboard/TeamManagementModal';
import { UserPlus, Users } from 'lucide-react';
import api from '../../utils/api';

interface TeamPageProps {
    startupId: number;
}

const TeamPage: React.FC<TeamPageProps> = ({ startupId }) => {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMembers();
    }, [startupId]);

    const fetchMembers = async () => {
        try {
            const data = await api.getTeamMembers(startupId);
            setMembers(data);
        } catch (error) {
            console.error("Failed to fetch team members", error);
        } finally {
            setLoading(false);
        }
    };

    const handleMemberAdded = (member: TeamMember) => {
        setMembers(prev => [...prev, member]);
        // Keep modal open? Or close? The modal implementation has a list too. 
        // If modal is "Manage Team", maybe we keep it open.
        fetchMembers(); // Re-fetch to be safe
    };

    const handleMemberRemoved = (userId: number) => {
        setMembers(prev => prev.filter(m => m.user_id !== userId));
    };

    return (
        <div className="space-y-6">
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                        Team
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Manage who has access to your startup dashboard and their permissions.
                    </p>
                </div>
                <div className="mt-4 flex sm:mt-0 sm:ml-4">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        type="button"
                        className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                        <UserPlus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                        Manage / Add Members
                    </button>
                </div>
            </div>

            <div className="overflow-hidden bg-white shadow sm:rounded-md">
                {loading ? (
                    <div className="p-4 text-center text-gray-500">Loading team members...</div>
                ) : (
                    <ul role="list" className="divide-y divide-gray-200">
                        {members.length === 0 ? (
                            <li className="px-6 py-12 text-center">
                                <Users className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-semibold text-gray-900">No team members</h3>
                                <p className="mt-1 text-sm text-gray-500">Get started by adding a new team member.</p>
                            </li>
                        ) : (
                            members.map((member) => (
                                <li key={member.user_id} className="px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <span className="inline-block h-10 w-10 overflow-hidden rounded-full bg-gray-100">
                                                <svg className="h-full w-full text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                                                </svg>
                                            </span>
                                            <div className="ml-4">
                                                <h3 className="text-base font-semibold leading-6 text-gray-900">{member.user_name || member.user_email}</h3>
                                                <p className="text-sm text-gray-500">{member.user_email}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            {member.role === 'Owner' ? (
                                                <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">Owner</span>
                                            ) : (
                                                <>
                                                    <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Member</span>
                                                    <div className="flex gap-1 mt-1">
                                                        {member.scopes?.map(scope => (
                                                            <span key={scope} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                                                                {scope}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                )}
            </div>

            <TeamManagementModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                startupId={startupId}
                members={members}
                onMemberAdded={handleMemberAdded}
                onMemberRemoved={handleMemberRemoved}
                onMemberUpdated={fetchMembers}
            />
        </div>
    );
};

export default TeamPage;