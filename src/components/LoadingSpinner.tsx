import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = "Loading..." }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
      }}
    >
      <div
        style={{
          width: '60px',
          height: '60px',
          border: '5px solid #fff',
          borderBottomColor: 'transparent',
          borderRadius: '50%',
          display: 'inline-block',
          animation: 'spin 1s linear infinite',
          marginBottom: '24px',
        }}
      ></div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <h2 style={{ color: 'white', fontWeight: 600, fontSize: '1.5rem' }}>
        {message}
      </h2>
    </div>
  );
};

export default LoadingSpinner;
