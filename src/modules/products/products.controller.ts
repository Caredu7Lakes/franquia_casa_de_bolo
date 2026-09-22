import {
  Controller,
  Post,
  Get,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ProductsService } from './products.service';
import { ProductCategory } from './entities/product.entity';
import { CloudinaryService } from './cloudinary/cloudinary.service';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      // memoryStorage: o arquivo fica em RAM e vai direto para o Cloudinary.
      // Não gravamos em disco (efêmero em Render/Fly/Railway).
      storage: memoryStorage(),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return callback(new BadRequestException('Apenas arquivos de imagem são permitidos!'), false);
        }
        callback(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async createProduct(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { name: string; description: string; price: string; category: ProductCategory },
  ) {
    if (!file) {
      throw new BadRequestException('A foto do produto é obrigatória.');
    }
    if (!body.category || !Object.values(ProductCategory).includes(body.category)) {
      throw new BadRequestException('Categoria inválida ou ausente (BREADS_SAVORIES ou CAKES_SWEETS).');
    }

    const upload = await this.cloudinaryService.uploadImage(file);

    return this.productsService.create({
      name: body.name,
      description: body.description,
      // multipart/form-data envia tudo como string; convertemos o preço.
      price: parseFloat(body.price),
      category: body.category,
      imageUrl: upload.secure_url,
    });
  }

  @Get()
  async listProducts() {
    return this.productsService.findAll();
  }
}