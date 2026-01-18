// src/pages/dashboard/ProductIssuesPage.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProductIssuesPage from './ProductIssuesPage';
import { Product } from '@/types/dashboard-types';

const mockProducts: Product[] = [
  {
    id: 1,
    name: 'Product A',
    issues: [
      { issue_id: 1, title: 'Bug in login', description: 'Users cannot log in', severity: 'High', status: 'Open', created_at: new Date().toISOString() },
    ],
  },
  {
    id: 2,
    name: 'Product B',
    issues: [
      { issue_id: 2, title: 'UI glitch', description: 'The button is misaligned', severity: 'Low', status: 'In Progress', created_at: new Date().toISOString() },
    ],
  },
] as unknown as Product[];

describe('ProductIssuesPage', () => {
  it('renders correctly with a list of products', () => {
    render(<ProductIssuesPage products={mockProducts} onAddNewIssue={() => {}} />);
    expect(screen.getByText('Issues & Feedback')).toBeInTheDocument();
    expect(screen.getByText('Bug in login')).toBeInTheDocument();
    expect(screen.getByText('UI glitch')).toBeInTheDocument();
  });

  it('renders correctly when the products prop is null or undefined', () => {
    // @ts-ignore
    const { rerender } = render(<ProductIssuesPage products={null} onAddNewIssue={() => {}} />);
    expect(screen.getByText('Issues & Feedback')).toBeInTheDocument();
    expect(screen.queryByText('Bug in login')).not.toBeInTheDocument();

    // @ts-ignore
    rerender(<ProductIssuesPage products={undefined} onAddNewIssue={() => {}} />);
    expect(screen.getByText('Issues & Feedback')).toBeInTheDocument();
    expect(screen.queryByText('Bug in login')).not.toBeInTheDocument();
  });
});
