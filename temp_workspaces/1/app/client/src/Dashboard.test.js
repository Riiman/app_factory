import { render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';
import React from 'react';

test('renders Dashboard sidebar and header', () => {
  render(<Dashboard><div>Child Content</div></Dashboard>);
  expect(screen.getByText('MyApp')).toBeInTheDocument();
  expect(screen.getByText('Dashboard')).toBeInTheDocument();
  expect(screen.getByText('Child Content')).toBeInTheDocument();
  expect(screen.getByText('Tasks')).toBeInTheDocument();
  expect(screen.getByText('Profile')).toBeInTheDocument();
  expect(screen.getByText('Logout')).toBeInTheDocument();
});
