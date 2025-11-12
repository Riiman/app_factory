import React, { useState } from 'react';
import { Modal, Button, Textarea } from '@/components/ui';

interface EditPositioningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newPositioningStatement: string) => void;
  initialValue: string;
}

const EditPositioningModal: React.FC<EditPositioningModalProps> = ({ isOpen, onClose, onSave, initialValue }) => {
  const [positioningStatement, setPositioningStatement] = useState(initialValue);

  const handleSave = () => {
    onSave(positioningStatement);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Positioning Statement">
      <div className="space-y-4">
        <Textarea
          value={positioningStatement}
          onChange={(e) => setPositioningStatement(e.target.value)}
          placeholder="Enter your new positioning statement"
          rows={4}
        />
        <div className="flex justify-end space-x-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </div>
    </Modal>
  );
};

export default EditPositioningModal;
