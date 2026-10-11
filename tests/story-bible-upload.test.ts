import './editor-dom';
// Toast expiry timers are unrelated to persistence and otherwise outlive these tests.
jest.mock('../client/src/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
import React, { act, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { FileUpload } from '../client/src/components/ui/file-upload';
let root: Root, container: HTMLDivElement;
const onChange = jest.fn();
function Harness() {
  const [image, setImage] = useState({ imageUrl: '', imageDescription: '' });
  return React.createElement(FileUpload, { ...image, onImageChange: (imageUrl, imageDescription = '') => { onChange(imageUrl, imageDescription); setImage({ imageUrl, imageDescription }); }, onRemoveImage: () => setImage({ imageUrl: '', imageDescription: '' }) });
}
async function upload(file: File) {
  await act(async () => { const input = container.querySelector('input[type="file"]')!; Object.defineProperty(input, 'files', { configurable: true, value: [file] }); Simulate.change(input); });
}
beforeEach(async () => { onChange.mockClear(); container = document.createElement('div'); document.body.append(container); root = createRoot(container); await act(async () => root.render(React.createElement(Harness))); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); jest.restoreAllMocks(); });
it('completed image uploads deliver the result immediately and reset the file picker', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ success: true, url: '/uploads/synthetic.png' }), { status: 200 }));
  await upload(new File(['synthetic'], 'synthetic.png', { type: 'image/png' }));
  expect(onChange).toHaveBeenCalledWith('/uploads/synthetic.png', ''); expect(container.querySelector('img')?.getAttribute('src')).toBe('/uploads/synthetic.png');
});
it('leaving an editor cancels its upload and ignores a late response', async () => {
  let finish!: (response: Response) => void;
  const fetch = jest.spyOn(global, 'fetch').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await upload(new File(['synthetic'], 'synthetic.png', { type: 'image/png' }));
  const signal = fetch.mock.calls[0][1]!.signal!;
  await act(async () => root.render(React.createElement('div'))); expect(signal.aborted).toBe(true);
  await act(async () => finish(new Response(JSON.stringify({ success: true, url: '/uploads/late.png' }), { status: 200 })));
  expect(onChange).not.toHaveBeenCalled();
});
it('invalid files and upload failures never report an image saved', async () => {
  const fetch = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'Synthetic failure' }), { status: 500 }));
  await upload(new File(['text'], 'file.txt', { type: 'text/plain' })); expect(fetch).not.toHaveBeenCalled();
  await upload(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })); expect(fetch).not.toHaveBeenCalled();
  await upload(new File(['image'], 'file.png', { type: 'image/png' })); expect(fetch).toHaveBeenCalledTimes(1); expect(onChange).not.toHaveBeenCalled();
});
