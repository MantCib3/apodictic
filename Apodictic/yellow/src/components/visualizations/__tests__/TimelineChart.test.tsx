import React from 'react';
import { render } from '@testing-library/react';
import { TimelineChart } from '../TimelineChart';

describe('TimelineChart', () => {
  const mockData = [
    { date: '2023-01-01', value: 100 },
    { date: '2023-01-02', value: 200 },
  ];

  it('renders without crashing', () => {
    const { container } = render(
      <TimelineChart data={mockData} title="Test Chart" />
    );
    expect(container).toBeInTheDocument();
  });

  it('displays the correct title', () => {
    const { getByText } = render(
      <TimelineChart data={mockData} title="Test Chart" />
    );
    expect(getByText('Test Chart')).toBeInTheDocument();
  });
});
