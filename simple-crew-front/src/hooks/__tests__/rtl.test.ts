import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

describe('RTL Test', () => {
  it('should render a simple element', () => {
    const { getByText } = render(React.createElement('div', null, 'Hello'));
    expect(getByText('Hello')).toBeInTheDocument();
  });
});
