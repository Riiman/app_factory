// src/components/dashboard/CreateIssueModal.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CreateIssueModal from './CreateIssueModal';
import { Product } from '@/types/dashboard-types';

const mockProducts: Product[] = [
  { id: 1, name: 'Product A' },
  { id: 2, name: 'Product B' },
] as Product[];

describe('CreateIssueModal', () => {
  it('renders correctly with a list of products', () => {
    render(<CreateIssueModal onClose={() => {}} onCreate={() => {}} products={mockProducts} />);
    expect(screen.getByText('Report New Issue')).toBeInTheDocument();
    expect(screen.getByText('Product A')).toBeInTheDocument();
    expect(screen.getByText('Product B')).toBeInTheDocument();
  });

  it('renders correctly when the products prop is null or undefined', () => {
    // @ts-ignore
    const { rerender } = render(<CreateIssueModal onClose={() => {}} onCreate={() => {}} products={null} />);
    expect(screen.getByText('Report New Issue')).toBeInTheDocument();
    expect(screen.queryByText('Product A')).not.toBeInTheDocument();

    // @ts-ignore
    rerender(<CreateIssueModal onClose={() => {}} onCreate={() => {}} products={undefined} />);
    expect(screen.getByText('Report New Issue')).toBeInTheDocument();
    expect(screen.queryByText('Product A')).not.toBeInTheDocument();
  });
});
