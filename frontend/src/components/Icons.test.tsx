// src/components/Icons.test.tsx
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LightbulbIcon, RocketIcon, ChartBarIcon, DollarIcon, GoogleIcon, LinkedInIcon } from './Icons';

describe('Icon components', () => {
  it('renders LightbulbIcon', () => {
    const { container } = render(<LightbulbIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders RocketIcon', () => {
    const { container } = render(<RocketIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders ChartBarIcon', () => {
    const { container } = render(<ChartBarIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders DollarIcon', () => {
    const { container } = render(<DollarIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders GoogleIcon', () => {
    const { container } = render(<GoogleIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders LinkedInIcon', () => {
    const { container } = render(<LinkedInIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
