// Assuming the content of index.test.js remains the same
import React from 'react';
import { render, screen } from '@testing-library/react';
import Home from './index';

test('renders Home component', () => {
  render(<Home />);
  const linkElement = screen.getByText(/Tokens used:/i);
  expect(linkElement).toBeInTheDocument();
});
