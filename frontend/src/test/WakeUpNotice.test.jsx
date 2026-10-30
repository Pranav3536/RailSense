import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { WakeUpNotice } from '../components/ui/WakeUpNotice';
import { WAKE_UP_NOTICE_MESSAGE } from '../config/constants';

describe('WakeUpNotice Component', () => {
  it('renders nothing by default when requests complete quickly', () => {
    render(<WakeUpNotice />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders wake-up status message when request has been pending for over 4 seconds', () => {
    render(<WakeUpNotice />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent('railsense:wakeup', { detail: { isWakingUp: true } })
      );
    });

    const statusEl = screen.getByRole('status');
    expect(statusEl).toBeInTheDocument();
    expect(statusEl).toHaveTextContent(WAKE_UP_NOTICE_MESSAGE);
  });

  it('clears the wake-up notice when pending requests finish', () => {
    render(<WakeUpNotice />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent('railsense:wakeup', { detail: { isWakingUp: true } })
      );
    });
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(
        new CustomEvent('railsense:wakeup', { detail: { isWakingUp: false } })
      );
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
