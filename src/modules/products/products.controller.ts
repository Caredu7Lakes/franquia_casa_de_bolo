import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ProductsService } from './products.service';
import { ProductCategory } from './entities/product.entity';
import { CloudinaryService } from './cloudinary/cloudinary.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // GET aberto: o cardápio é consumido pelo bot e não expõe dado sensível.
  @Get()
  async listProducts() {
    return this.productsService.findAll();
  }

  // Criar produto com foto — protegido (só o dono, pelo dashboard).
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return callback(new BadRequestException('Apenas arquivos de imagem são permitidos!'), false);
        }
        callback(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
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
      throw new BadRequestException('Categoria inválida ou ausente.');
    }

    const upload = await this.cloudinaryService.uploadImage(file);

    return this.productsService.create({
      name: body.name,
      description: body.description,
      price: body.price != null && body.price !== '' ? parseFloat(body.price) : undefined,
      category: body.category,
      imageUrl: upload.secure_url,
    });
  }

  // Editar produto existente (preço, foto, disponibilidade) — protegido.
  // Aceita foto opcional: se vier arquivo, sobe pro Cloudinary e atualiza a URL.
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  async updateProduct(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { price?: string; description?: string; available?: string; category?: ProductCategory },
  ) {
    const data: any = {};
    if (body.price != null && body.price !== '') data.price = parseFloat(body.price);
    if (body.description != null) data.description = body.description;
    if (body.available != null) data.available = body.available === 'true';
    if (body.category) data.category = body.category;
    if (file) {
      const upload = await this.cloudinaryService.uploadImage(file);
      data.imageUrl = upload.secure_url;
    }
    return this.productsService.update(id, data);
  }
}