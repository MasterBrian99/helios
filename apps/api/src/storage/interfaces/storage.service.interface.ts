export interface StorageService {
  /**
   * Upload a file buffer to the storage backend.
   * @param buffer The file content as Buffer.
   * @param key The destination key/path (e.g., filename or path).
   * @returns The URL or identifier of the stored file.
   */
  upload(buffer: Buffer, key: string): Promise<string>;

  /**
   * Get a signed URL for accessing a stored file.
   * @param key The key/path of the stored file.
   * @returns A signed URL that can be used to download the file.
   */
  getSignedUrl(key: string): Promise<string>;
}
