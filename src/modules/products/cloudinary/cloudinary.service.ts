import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  /**
   * Envia o buffer da imagem para o Cloudinary e devolve a URL segura (https).
   * Usa upload_stream porque o arquivo chega em memória (memoryStorage), não em disco.
   */
  uploadImage(file: Express.Multer.File): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { folder: 'casa_do_bolo/produtos' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result as UploadApiResponse);
        },
      );
      Readable.from(file.buffer).pipe(upload);
    });
  }
}