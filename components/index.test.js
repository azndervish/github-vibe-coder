import React from 'react';
import { render, screen } from '@testing-library/react';
import Home from '../pages/index'; // Update the import path for Home component

test('renders Home component', () => {
  render(<Home />);
  const linkElement = screen.getByText(/Tokens used:/i);
  expect(linkElement).toBeInTheDocument();
});
