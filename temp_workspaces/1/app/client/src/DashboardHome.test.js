import { render, screen } from '@testing-library/react';
import DashboardHome from './DashboardHome';
import React from 'react';

test('renders DashboardHome', () => {
  render(<DashboardHome />);
  expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
});
