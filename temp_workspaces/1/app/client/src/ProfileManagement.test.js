import { render, screen } from '@testing-library/react';
import ProfileManagement from './ProfileManagement';
import React from 'react';

test('renders ProfileManagement', () => {
  render(<ProfileManagement />);
  expect(screen.getByText(/profile/i)).toBeInTheDocument();
});
