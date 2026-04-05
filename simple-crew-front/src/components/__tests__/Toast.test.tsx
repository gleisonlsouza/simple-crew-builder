import { render, screen, fireEvent } from '@testing-library/react';
import { Toast } from '../Toast';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store/index';
import type { Mock } from 'vitest';

// Mock the store
vi.mock('../../store/index', () => ({
  useStore: vi.fn(),
}));

describe('Toast Component', () => {
  const mockClearNotification = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when there is no notification', () => {
    (useStore as unknown as Mock).mockImplementation((selector: any) => selector({
      notification: null,
    }));

    const { container } = render(<Toast />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when notification is not visible', () => {
    (useStore as unknown as Mock).mockImplementation((selector: any) => selector({
      notification: { message: 'Test', type: 'success', visible: false },
    }));

    const { container } = render(<Toast />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the correct message and type', () => {
    (useStore as unknown as Mock).mockImplementation((selector: any) => selector({
      notification: { message: 'Success Message', type: 'success', visible: true },
      clearNotification: mockClearNotification,
    }));

    render(<Toast />);
    expect(screen.getByText('Success Message')).toBeInTheDocument();
    
    // Check for success background color classes
    const textElement = screen.getByText('Success Message');
    const toastContainer = textElement.closest('div');
    // The bg class is on the inner div
    expect(toastContainer).toHaveClass('bg-green-50');
  });

  it('renders different colors for error type', () => {
    (useStore as unknown as Mock).mockImplementation((selector: any) => selector({
      notification: { message: 'Error Message', type: 'error', visible: true },
      clearNotification: mockClearNotification,
    }));

    render(<Toast />);
    expect(screen.getByText('Error Message')).toBeInTheDocument();
    
    const textElement = screen.getByText('Error Message');
    const toastContainer = textElement.closest('div');
    expect(toastContainer).toHaveClass('bg-red-50');
  });

  it('calls clearNotification when close button is clicked', () => {
    (useStore as unknown as Mock).mockImplementation((selector: any) => selector({
      notification: { message: 'Test Message', type: 'info', visible: true },
      clearNotification: mockClearNotification,
    }));

    render(<Toast />);
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);

    expect(mockClearNotification).toHaveBeenCalledTimes(1);
  });
});
