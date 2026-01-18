// src/components/dashboard/CreateMetricModal.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CreateMetricModal from './CreateMetricModal';
import { Product } from '@/types/dashboard-types';

const mockProducts: Product[] = [
  { id: 1, name: 'Product A' },
  { id: 2, name: 'Product B' },
] as Product[];

describe('CreateMetricModal', () => {
  it('renders correctly with a list of products', () => {
    render(<CreateMetricModal onClose={() => {}} onCreate={() => {}} products={mockProducts} />);
    expect(screen.getByText('Add New Metric')).toBeInTheDocument();
    expect(screen.getByText('Product A')).toBeInTheDocument();
    expect(screen.getByText('Product B')).toBeInTheDocument();
  });

  it('renders correctly when the products prop is null or undefined', () => {
    // @ts-ignore
    const { rerender } = render(<CreateMetricModal onClose={() => {}} onCreate={() => {}} products={null} />);
    expect(screen.getByText('Add New Metric')).toBeInTheDocument();
    expect(screen.queryByText('Product A')).not.toBeInTheDocument();

    // @ts-ignore
    rerender(<CreateMetricModal onClose={() => {}} onCreate={() => {}} products={undefined} />);
    expect(screen.getByText('Add New Metric')).toBeInTheDocument();
    expect(screen.queryByText('Product A')).not.toBeInTheDocument();
  });


});
