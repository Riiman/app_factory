// src/components/Card.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Card from './Card';

describe('Card', () => {
  it('renders children correctly', () => {
    render(<Card><div>Child Content</div></Card>);
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('renders with a title', () => {
    render(<Card title="Test Title"><div>Child Content</div></Card>);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders with actions', () => {
    render(<Card actions={<button>Action</button>}><div>Child Content</div></Card>);
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('renders with a title and actions', () => {
    render(<Card title="Test Title" actions={<button>Action</button>}><div>Child Content</div></Card>);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('applies additional class names', () => {
    const { container } = render(<Card className="extra-class"><div>Child Content</div></Card>);
    expect(container.firstChild).toHaveClass('extra-class');
  });
});
