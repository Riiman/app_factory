import { render, screen } from '@testing-library/react';
import UserRegistration from './UserRegistration';
import React from 'react';

test('renders UserRegistration form', () => {
  render(<UserRegistration />);
  expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  expect(screen.getByRole('button')).toBeInTheDocument();
});
