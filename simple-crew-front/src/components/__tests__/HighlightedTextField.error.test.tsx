import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock the editor module BEFORE importing the component
vi.mock('react-simple-code-editor', () => ({
  default: null
}));

import HighlightedTextField from '../HighlightedTextField';

describe('HighlightedTextField Error Scenario', () => {
  it('shows error message when Editor fails to load', () => {
    const defaultProps = {
      value: '',
      onChange: vi.fn(),
      placeholder: 'Test Placeholder',
    };

    render(
      <HighlightedTextField 
        {...defaultProps} 
        type="textarea" 
      />
    );

    expect(screen.getByText(/Error: Editor could not be loaded/)).toBeInTheDocument();
  });
});
