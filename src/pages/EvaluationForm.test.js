
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EvaluationForm from './EvaluationForm';

// Mock axios
jest.mock('axios');

describe('EvaluationForm', () => {
  test('renders form with first stage', () => {
    render(
      <BrowserRouter>
        <EvaluationForm />
      </BrowserRouter>
    );
    
    expect(screen.getByText(/Basic Information/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Startup Name/i)).toBeInTheDocument();
  });

  test('validates required fields', async () => {
    render(
      <BrowserRouter>
        <EvaluationForm />
      </BrowserRouter>
    );
    
    const nextButton = screen.getByText(/Save & Continue/i);
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText(/This field is required/i)).toBeInTheDocument();
    });
  });
});
