import { useSyncExternalStore } from 'react';
import { AttachmentService, PickedFile, UploadedAttachment } from '../services/attachment.service';
import type { PendingAttachment } from '../components/InputBar';

// A picked file uploads in the background and waits for Send, so a caption can
// go with it. One staging area is shared by ChatScreen's composer and the
// search-bar launcher (module-level on purpose): a file picked in the bar is
// still there, already uploaded, when the chat opens.

interface State {
  pending: PendingAttachment | null;
  isUploading: boolean;
  error: string | null;
  staged: { file: PickedFile; uploaded: UploadedAttachment } | null;
}

let state: State = { pending: null, isUploading: false, error: null, staged: null };
let errorTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function showError(message: string) {
  set({ error: message });
  if (errorTimer) clearTimeout(errorTimer);
  errorTimer = setTimeout(() => set({ error: null }), 5000);
}

function dismissError() {
  if (errorTimer) clearTimeout(errorTimer);
  set({ error: null });
}

async function stage(file: PickedFile | null) {
  if (!file) return;
  set({ staged: null, pending: { uri: file.uri, name: file.name, isImage: file.mimeType.startsWith('image/') }, isUploading: true });
  try {
    const uploaded = await AttachmentService.uploadAndPoll(file);
    // The visitor may have removed it (or picked another) while it uploaded.
    if (state.pending?.uri === file.uri) set({ staged: { file, uploaded } });
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Could not upload attachment');
    if (state.pending?.uri === file.uri) set({ pending: null });
  } finally {
    if (state.pending?.uri === file.uri || !state.pending) set({ isUploading: false });
  }
}

function remove() {
  set({ staged: null, pending: null, isUploading: false });
}

/** Clears the staging area once its attachment has been handed to sendMessage. */
function consume() {
  set({ staged: null, pending: null, isUploading: false });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};

export function useAttachmentStaging() {
  const s = useSyncExternalStore(subscribe, () => state, () => state);
  return {
    pendingAttachment: s.pending,
    isUploading: s.isUploading,
    attachmentError: s.error,
    staged: s.staged,
    stageAttachment: stage,
    removeAttachment: remove,
    consumeAttachment: consume,
    showAttachmentError: showError,
    dismissAttachmentError: dismissError,
  };
}
