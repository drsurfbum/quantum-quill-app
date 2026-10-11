import './editor-dom';
import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { ProtectedRoute } from '../client/src/lib/protected-route';
let mockUser: any = { id: 1 }, mockLoading = false;
jest.mock('../client/src/hooks/use-auth', () => ({ useAuth: () => ({ user: mockUser, isLoading: mockLoading }) }));
// Wouter renders its component prop as a React component. This isolates that identity contract;
// the production browser check verifies the actual router and toast integration.
jest.mock('wouter', () => ({ Route: ({ component, children }: any) => component ? React.createElement(component) : children, Redirect: ({ to }: any) => React.createElement('span', null, `Redirect ${to}`) }));
it('preserves the mounted page and typing when auth context rerenders (such as a toast)', async () => {
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
  function Page() { const [value, setValue] = useState(''); return React.createElement('input', { value, onChange: (event: React.ChangeEvent<HTMLInputElement>) => setValue(event.target.value) }); }
  try {
    await act(async () => root.render(React.createElement(ProtectedRoute, { path: '/', component: Page })));
    const input = host.querySelector('input')!;
    await act(async () => { input.value = 'Unfinished writing'; Simulate.change(input); });
    mockUser = { id: 1 };
    await act(async () => root.render(React.createElement(ProtectedRoute, { path: '/', component: Page })));
    expect(host.querySelector('input')).toBe(input); expect(input.value).toBe('Unfinished writing');
    mockUser = null;
    await act(async () => root.render(React.createElement(ProtectedRoute, { path: '/', component: Page })));
    expect(host.textContent).toBe('Redirect /auth');
  } finally { await act(async () => root.unmount()); host.remove(); }
});
