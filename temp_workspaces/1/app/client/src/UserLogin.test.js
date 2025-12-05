import { render, screen } from '@testing-library/react';
import UserLogin from './UserLogin';
import React from 'react';

test('renders UserLogin form', () => {
  render(<UserLogin />);
  expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  expect(screen.getByRole('button')).toBeInTheDocument();
});
