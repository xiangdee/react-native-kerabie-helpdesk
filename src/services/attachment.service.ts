import { ApiService } from './api.service';

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

export interface UploadedAttachment {
  /** S3 object key — the attachment is private (see chat-attachment.queue.ts),
   *  so there's no plain fetchable URL at this point. The server resolves a
   *  signed URL on every read once the message has been sent. */
  key: string;
  fileName: string;
  mimeType: string;
}

// Mirrors attachment-validation.util.ts on the backend — kept in sync
// manually since this SDK can't import server code.
const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'text/plain', 'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
]);
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MB — matches MAX_ATTACHMENT_BYTES server-side

export const AttachmentService = {
  /**
   * Opens the native image library. Returns null if the user cancels or
   * denies permission. Throws if expo-image-picker isn't installed — it's
   * an optional peer dep (see package.json), only needed by apps that use
   * attachments.
   */
  async pickImage(): Promise<PickedFile | null> {
    const ImagePicker = await import('expo-image-picker').catch(() => null);
    if (!ImagePicker) {
      throw new Error('expo-image-picker is not installed — add it to your app to enable image attachments');
    }

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return null;

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      name: asset.fileName ?? `photo_${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
      size: asset.fileSize,
    };
  },

  /**
   * Opens the native document picker (any file type). Returns null if the
   * user cancels. Throws if expo-document-picker isn't installed.
   */
  async pickDocument(): Promise<PickedFile | null> {
    const DocumentPicker = await import('expo-document-picker').catch(() => null);
    if (!DocumentPicker) {
      throw new Error('expo-document-picker is not installed — add it to your app to enable document attachments');
    }

    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return null;

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? 'application/octet-stream',
      size: asset.size,
    };
  },

  /**
   * Validates, uploads (enqueues on the backend's chat-attachment queue —
   * see chat-attachment.queue.ts), and polls until the S3 write finishes.
   * Sends multipart/form-data with {uri, name, type} as the file part — RN's
   * fetch streams this straight from disk, so the file is never loaded into
   * JS memory as a base64 string (unlike a JSON body, which would need
   * that, plus ~33% extra bytes on the wire for the base64 encoding).
   */
  async uploadAndPoll(file: PickedFile): Promise<UploadedAttachment> {
    if (file.size && file.size > MAX_ATTACHMENT_BYTES) {
      throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 25 MB.`);
    }
    if (!ALLOWED_MIME.has(file.mimeType)) {
      throw new Error(`File type "${file.mimeType}" is not allowed`);
    }

    const form = new FormData();
    // React Native's FormData accepts this {uri, name, type} shape as a
    // file part — it is not a real Blob/File, so it's typed as `any` here.
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as any);

    const { jobId } = await ApiService.postForm<{ jobId: string }>('/public/widget/attachment', form);

    return pollJob(jobId);
  },
};

async function pollJob(jobId: string): Promise<UploadedAttachment> {
  const POLL_INTERVAL_MS = 700;
  const POLL_TIMEOUT_MS = 30_000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    const job = await ApiService.get<{ status: string; result?: UploadedAttachment; error?: string }>(
      `/public/widget/attachment/${jobId}`,
    );

    if (job.status === 'succeeded' && job.result) return job.result;
    if (job.status === 'failed') throw new Error(job.error || 'Upload processing failed');

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error('Upload timed out');
}
