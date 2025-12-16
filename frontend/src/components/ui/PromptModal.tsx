import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertCircle, CheckCircle, HelpCircle, Info } from 'lucide-react';

export type PromptType = 'info' | 'confirm' | 'error' | 'success';

interface PromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    title: string;
    message: string;
    type?: PromptType;
    confirmText?: string;
    cancelText?: string;
}

const PromptModal: React.FC<PromptModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = 'info',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
}) => {
    const getIcon = () => {
        switch (type) {
            case 'confirm':
                return <HelpCircle className="h-12 w-12 text-brand-primary mb-4" />;
            case 'error':
                return <AlertCircle className="h-12 w-12 text-red-500 mb-4" />;
            case 'success':
                return <CheckCircle className="h-12 w-12 text-green-500 mb-4" />;
            case 'info':
            default:
                return <Info className="h-12 w-12 text-blue-500 mb-4" />;
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="">
            <div className="flex flex-col items-center justify-center text-center">
                {getIcon()}
                <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600 mb-6">{message}</p>

                <div className="flex space-x-3 w-full justify-center">
                    {type === 'confirm' && (
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="w-full sm:w-auto"
                        >
                            {cancelText}
                        </Button>
                    )}
                    <Button
                        variant="primary"
                        onClick={() => {
                            if (onConfirm) onConfirm();
                            else onClose();
                        }}
                        className="w-full sm:w-auto"
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default PromptModal;
