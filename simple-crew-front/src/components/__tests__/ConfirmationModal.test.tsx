import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmationModal } from '../ConfirmationModal';

describe('ConfirmationModal', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        onConfirm: vi.fn(),
        title: 'Confirm Delete',
        message: 'Are you sure?',
    };

    it('renders correctly when open', () => {
        render(<ConfirmationModal {...defaultProps} />);
        expect(screen.getByText('Confirm Delete')).toBeDefined();
        expect(screen.getByText('Are you sure?')).toBeDefined();
    });

    it('does not render when closed', () => {
        const { container } = render(<ConfirmationModal {...defaultProps} isOpen={false} />);
        expect(container.firstChild).toBeNull();
    });

    it('calls onConfirm when confirm button is clicked', () => {
        render(<ConfirmationModal {...defaultProps} />);
        const confirmBtn = screen.getByText('Confirm') || screen.getAllByRole('button')[1];
        fireEvent.click(confirmBtn);
        expect(defaultProps.onConfirm).toHaveBeenCalled();
    });

    it('calls onClose when cancel or backdrop is clicked', () => {
        render(<ConfirmationModal {...defaultProps} />);
        const cancelBtn = screen.getByText('Cancel') || screen.getAllByRole('button')[0];
        fireEvent.click(cancelBtn);
        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('renders with danger variant', () => {
        render(<ConfirmationModal {...defaultProps} variant="danger" />);
        const confirmBtn = screen.getByText('Confirm') || screen.getAllByRole('button')[1];
        expect(confirmBtn.className).toContain('bg-red-600');
    });
});
