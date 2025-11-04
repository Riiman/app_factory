import React from 'react';
import { Modal, Box, Typography, Paper } from '@mui/material';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 600,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
};

const AnalysisModal = ({ open, handleClose, analysisStream }) => {
  const isError = analysisStream.includes('ANALYSIS FAILED');

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="analysis-modal-title"
      aria-describedby="analysis-modal-description"
    >
      <Box sx={style}>
        <Typography id="analysis-modal-title" variant="h6" component="h2">
          AI Analysis Stream
        </Typography>
        <Paper elevation={2} sx={{ p: 2, mt: 2, maxHeight: 400, overflowY: 'auto' }}>
          <pre id="analysis-modal-description" style={{ whiteSpace: 'pre-wrap', color: isError ? 'red' : 'inherit' }}>
            {analysisStream}
          </pre>
        </Paper>
      </Box>
    </Modal>
  );
};

export default AnalysisModal;
