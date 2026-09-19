export class GeneratePresignedUrlResult {
  constructor(
    public readonly presignedUrl: string,
    public readonly fileUrl: string,
    public readonly key: string,
  ) {}
}
