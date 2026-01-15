import React, { FC, useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface OrganizationSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (mode: 'create' | 'join', value: string) => Promise<void>;
    isLoading?: boolean;
}

const OrganizationSelectionModal: FC<OrganizationSelectionModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    isLoading = false,
}) => {
    const [mode, setMode] = useState<'create' | 'join'>('create');
    const [organizationName, setOrganizationName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const value = mode === 'create' ? organizationName : inviteCode;

        if (!value.trim()) {
            setError(mode === 'create' ? 'Organization name is required' : 'Invite code is required');
            return;
        }

        try {
            await onSubmit(mode, value);
            // Reset form on success
            setOrganizationName('');
            setInviteCode('');
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Organization Setup
                </h2>
                <p className="text-gray-600 mb-6">
                    To continue, please create a new organization or join an existing one.
                </p>

                {/* Mode Selection */}
                <div className="flex space-x-4 mb-6">
                    <button
                        type="button"
                        onClick={() => setMode('create')}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'create'
                                ? 'bg-brand-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Create Organization
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('join')}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'join'
                                ? 'bg-brand-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Join Organization
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'create' ? (
                        <Input
                            id="org-name-modal"
                            label="Organization Name"
                            type="text"
                            required
                            value={organizationName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setOrganizationName(e.target.value)
                            }
                            placeholder="e.g. Acme Corp"
                            disabled={isLoading}
                        />
                    ) : (
                        <Input
                            id="invite-code-modal"
                            label="Invite Code"
                            type="text"
                            required
                            value={inviteCode}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setInviteCode(e.target.value)
                            }
                            placeholder="e.g. 9c3c2dde"
                            disabled={isLoading}
                        />
                    )}

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <div className="flex space-x-3 pt-4">
                        <Button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300"
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 justify-center"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Processing...' : mode === 'create' ? 'Create & Continue' : 'Join & Continue'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OrganizationSelectionModal;
