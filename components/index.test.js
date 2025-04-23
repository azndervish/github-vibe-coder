import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom'; // Add this import to extend Jest matchers
import Home from '../pages/index';

test('renders Home component', () => {
  render(<Home />);
  const linkElement = screen.getByText(/Tokens used:/i);
  expect(linkElement).toBeInTheDocument();
});
